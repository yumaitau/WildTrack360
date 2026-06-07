'server-only';

import type Stripe from 'stripe';
import { prisma } from '../prisma';
import { getStripe } from './client';
import {
  DEFAULT_CURRENCY,
  MAX_DONATION_CENTS,
  MIN_DONATION_CENTS,
  PLATFORM_FEE_PERCENT,
} from './config';
import type { BillingInterval } from '@prisma/client';

export interface SubscriptionResult {
  clientSecret: string;
  subscriptionId: string;
  recurringDonationId?: string;
}

function intervalToStripe(interval: BillingInterval): { interval: 'month' | 'year' } {
  switch (interval) {
    case 'MONTHLY':
      return { interval: 'month' };
    case 'ANNUAL':
      return { interval: 'year' };
    default:
      throw new Error(`Unsupported recurring interval: ${interval}`);
  }
}

async function requireActiveConnectAccount(orgId: string) {
  const account = await prisma.stripeAccount.findUnique({
    where: { clerkOrganizationId: orgId },
  });
  if (!account) throw new Error('Stripe Connect not set up for this organisation');
  if (!account.chargesEnabled) throw new Error('Stripe onboarding incomplete — payments disabled');
  return account;
}

// Look up or create a platform-side Stripe Customer for this member. Customer
// lives on the platform (not the connected account) because destination
// charges route funds via transfer_data; the platform owns the Customer +
// PaymentMethod records.
//
// Concurrency: two parallel donate/membership submits for the same member
// could both observe null stripeCustomerId, both create a Customer, then
// race on the update. We pass an idempotency key derived from the member id
// so Stripe coalesces duplicate creates server-side, and we use a
// conditional updateMany so only one writer claims the column.
export async function ensureStripeCustomer(args: {
  memberId: string;
  email: string;
  name?: string | null;
}): Promise<string> {
  const member = await prisma.member.findUnique({ where: { id: args.memberId } });
  if (!member) throw new Error('Member not found');
  if (member.stripeCustomerId) return member.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create(
    {
      email: args.email,
      name: args.name ?? undefined,
      metadata: { memberId: member.id, clerkOrganizationId: member.clerkOrganizationId },
    },
    { idempotencyKey: `member-customer:${member.id}` }
  );

  const claim = await prisma.member.updateMany({
    where: { id: member.id, stripeCustomerId: null },
    data: { stripeCustomerId: customer.id },
  });
  if (claim.count === 0) {
    // Another writer beat us. Re-read and prefer the winner's customer id;
    // ours is orphaned but harmless (Stripe customers carry no balance).
    const winner = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    return winner.stripeCustomerId ?? customer.id;
  }
  return customer.id;
}

// Lazily create a Stripe Product+Price for a recurring MembershipTier. Stored
// on tier.stripeProductId / tier.stripePriceId so the subscription endpoint
// only does this once per tier.
export async function ensureTierPrice(tierId: string): Promise<{ priceId: string }> {
  const tier = await prisma.membershipTier.findUnique({ where: { id: tierId } });
  if (!tier) throw new Error('Tier not found');
  if (tier.stripePriceId) return { priceId: tier.stripePriceId };
  if (tier.billingInterval !== 'MONTHLY' && tier.billingInterval !== 'ANNUAL') {
    throw new Error('ensureTierPrice only supports MONTHLY or ANNUAL tiers');
  }

  const stripe = getStripe();
  const product = tier.stripeProductId
    ? await stripe.products.retrieve(tier.stripeProductId)
    : await stripe.products.create({
        name: `${tier.name} (membership)`,
        metadata: { tierId: tier.id, clerkOrganizationId: tier.clerkOrganizationId },
      });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: tier.amountCents,
    currency: tier.currency.toLowerCase(),
    recurring: intervalToStripe(tier.billingInterval),
    metadata: { tierId: tier.id, clerkOrganizationId: tier.clerkOrganizationId },
  });

  await prisma.membershipTier.update({
    where: { id: tier.id },
    data: { stripeProductId: product.id, stripePriceId: price.id },
  });
  return { priceId: price.id };
}

// Look up or create the generic "Recurring donation" Stripe Product for an
// org. Cached on StripeAccount.donationProductId so it survives across many
// donor amounts; each subscription gets its own Price referencing this
// product.
async function ensureDonationProductId(orgId: string): Promise<string> {
  const account = await prisma.stripeAccount.findUnique({
    where: { clerkOrganizationId: orgId },
  });
  if (!account) throw new Error('Stripe Connect not set up for this organisation');
  if (account.donationProductId) return account.donationProductId;
  const stripe = getStripe();
  const product = await stripe.products.create({
    name: 'Recurring donation',
    metadata: { clerkOrganizationId: orgId },
  });
  await prisma.stripeAccount.update({
    where: { clerkOrganizationId: orgId },
    data: { donationProductId: product.id },
  });
  return product.id;
}

interface CreateRecurringDonationArgs {
  orgId: string;
  memberId: string;
  donorEmail: string;
  donorName?: string | null;
  amountCents: number;
  interval: 'MONTHLY' | 'ANNUAL';
  isAnonymous?: boolean;
}

// Recurring donation as a Stripe Subscription. Arbitrary amount → fresh Price
// per subscription (no Product reuse since each donor amount is unique). The
// 5% fee is taken via application_fee_percent on the subscription. Returns
// the PaymentIntent client_secret so the client confirms with Elements.
//
// Idempotency model: the local RecurringDonation row is created BEFORE the
// Stripe calls; its cuid then serves as Stripe's idempotency key for both
// Price.create and Subscription.create. If the Stripe call partially fails
// (network blip after Stripe accepted but before we wrote stripeSubscriptionId)
// a retry with the same RecurringDonation.id will hit Stripe's idempotency
// cache and return the same Subscription rather than minting a duplicate
// chargeable object. The webhook handler tolerates a NULL stripeSubscriptionId
// (orphan pending rows) until they're either patched or pruned.
export async function createRecurringDonationSubscription(
  args: CreateRecurringDonationArgs
): Promise<SubscriptionResult> {
  if (!Number.isInteger(args.amountCents)) throw new Error('amountCents must be an integer');
  if (args.amountCents < MIN_DONATION_CENTS) throw new Error(`Minimum is $${MIN_DONATION_CENTS / 100}`);
  if (args.amountCents > MAX_DONATION_CENTS) throw new Error(`Maximum is $${MAX_DONATION_CENTS / 100}`);

  const account = await requireActiveConnectAccount(args.orgId);
  const stripe = getStripe();
  const customerId = await ensureStripeCustomer({
    memberId: args.memberId,
    email: args.donorEmail,
    name: args.donorName,
  });

  // Created as PENDING because the row exists before Stripe confirms anything
  // (the cuid is needed up-front as Stripe's idempotency key). The webhook
  // flips it to ACTIVE on the first invoice.payment_succeeded, and
  // customer.subscription.updated keeps it in sync after that.
  const recurring = await prisma.recurringDonation.create({
    data: {
      clerkOrganizationId: args.orgId,
      memberId: args.memberId,
      donorEmail: args.donorEmail,
      donorName: args.donorName ?? null,
      amountCents: args.amountCents,
      currency: DEFAULT_CURRENCY,
      interval: args.interval,
      status: 'PENDING',
      stripeSubscriptionId: null,
      stripeCustomerId: customerId,
      startedAt: new Date(),
    },
  });

  const productId = await ensureDonationProductId(args.orgId);
  const price = await stripe.prices.create(
    {
      product: productId,
      unit_amount: args.amountCents,
      currency: DEFAULT_CURRENCY.toLowerCase(),
      recurring: intervalToStripe(args.interval),
      metadata: {
        clerkOrganizationId: args.orgId,
        memberId: args.memberId,
        kind: 'DONATION_RECURRING',
        recurringDonationId: recurring.id,
      },
    },
    { idempotencyKey: `${recurring.id}:price` }
  );

  const subscription = await stripe.subscriptions.create(
    {
      customer: customerId,
      items: [{ price: price.id }],
      application_fee_percent: PLATFORM_FEE_PERCENT,
      transfer_data: { destination: account.stripeAccountId },
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.confirmation_secret', 'latest_invoice.payments'],
      metadata: {
        kind: 'DONATION_RECURRING',
        clerkOrganizationId: args.orgId,
        memberId: args.memberId,
        recurringDonationId: recurring.id,
        // Propagated to every instalment Donation row in the webhook handler
        // so anonymous selections persist across the full subscription life.
        isAnonymous: String(Boolean(args.isAnonymous)),
      },
    },
    { idempotencyKey: `${recurring.id}:sub` }
  );

  await prisma.recurringDonation.update({
    where: { id: recurring.id },
    data: { stripeSubscriptionId: subscription.id },
  });

  const clientSecret = extractClientSecret(subscription);
  return { clientSecret, subscriptionId: subscription.id, recurringDonationId: recurring.id };
}

interface CreateMembershipSubscriptionArgs {
  orgId: string;
  tierId: string;
  memberId: string;
  donorEmail: string;
  donorName?: string | null;
}

export async function createMembershipSubscription(
  args: CreateMembershipSubscriptionArgs
): Promise<SubscriptionResult> {
  const tier = await prisma.membershipTier.findFirst({
    where: {
      id: args.tierId,
      clerkOrganizationId: args.orgId,
      active: true,
      archivedAt: null,
    },
  });
  if (!tier) throw new Error('Membership tier not found');
  if (tier.billingInterval !== 'MONTHLY' && tier.billingInterval !== 'ANNUAL') {
    throw new Error('createMembershipSubscription only supports MONTHLY or ANNUAL tiers');
  }

  const account = await requireActiveConnectAccount(args.orgId);
  const stripe = getStripe();
  const { priceId } = await ensureTierPrice(tier.id);
  const customerId = await ensureStripeCustomer({
    memberId: args.memberId,
    email: args.donorEmail,
    name: args.donorName,
  });

  // A local Payment row with status REQUIRES_ACTION serves as the
  // idempotency anchor for the recurring-membership Subscription.create call.
  // The cuid is used as Stripe's idempotency key; the webhook handler for
  // invoice.payment_succeeded later upserts further Payment rows keyed on
  // stripe_invoice_id, so this anchor row stays as the "checkout intent" and
  // is harmless if Stripe never returns.
  const pending = await prisma.payment.create({
    data: {
      clerkOrganizationId: args.orgId,
      memberId: args.memberId,
      kind: 'MEMBERSHIP_RECURRING',
      amountCents: tier.amountCents,
      applicationFeeCents: 0,
      currency: tier.currency,
      status: 'REQUIRES_ACTION',
      metadata: { tierId: tier.id, tierName: tier.name, role: 'subscription-anchor' },
    },
  });

  const subscription = await stripe.subscriptions.create(
    {
      customer: customerId,
      items: [{ price: priceId }],
      application_fee_percent: PLATFORM_FEE_PERCENT,
      transfer_data: { destination: account.stripeAccountId },
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.confirmation_secret', 'latest_invoice.payments'],
      metadata: {
        kind: 'MEMBERSHIP_RECURRING',
        clerkOrganizationId: args.orgId,
        memberId: args.memberId,
        tierId: tier.id,
        pendingPaymentId: pending.id,
      },
    },
    { idempotencyKey: pending.id }
  );

  const clientSecret = extractClientSecret(subscription);
  return { clientSecret, subscriptionId: subscription.id };
}

// Stripe v22 stopped exposing `latest_invoice.payment_intent` directly. The
// client secret now lives on `latest_invoice.confirmation_secret.client_secret`
// (for subscription-confirm flows) when the invoice is expanded.
function extractClientSecret(subscription: Stripe.Subscription): string {
  const invoice = subscription.latest_invoice;
  if (!invoice || typeof invoice === 'string') {
    throw new Error('Stripe did not return an expanded latest_invoice');
  }
  const secret = invoice.confirmation_secret?.client_secret;
  if (!secret) {
    throw new Error('Stripe did not return a confirmation_secret.client_secret');
  }
  return secret;
}

// Compute the cycle-end timestamp for a Membership row given a start + interval.
export function computeMembershipEnd(start: Date, interval: BillingInterval): Date {
  const d = new Date(start);
  switch (interval) {
    case 'MONTHLY':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'ANNUAL':
    case 'ONE_OFF':
      d.setFullYear(d.getFullYear() + 1);
      break;
    case 'LIFETIME':
      d.setFullYear(d.getFullYear() + 100);
      break;
  }
  return d;
}
