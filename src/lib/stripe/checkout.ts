'server-only';

import { prisma } from '../prisma';
import { getStripe } from './client';
import {
  DEFAULT_CURRENCY,
  MAX_DONATION_CENTS,
  MIN_DONATION_CENTS,
  platformFeeCents,
} from './config';
import type { PaymentKind } from '@prisma/client';

export interface CheckoutResult {
  clientSecret: string;
  paymentIntentId: string;
  paymentId: string;
}

export interface CreateDonationArgs {
  orgId: string;
  amountCents: number;
  donorEmail: string;
  donorName?: string | null;
  message?: string | null;
  isAnonymous?: boolean;
  memberId?: string | null;
}

export interface CreateMembershipArgs {
  orgId: string;
  tierId: string;
  memberId: string;
  donorEmail: string;
}

async function requireActiveConnectAccount(orgId: string) {
  const account = await prisma.stripeAccount.findUnique({
    where: { clerkOrganizationId: orgId },
  });
  if (!account) throw new Error('Stripe Connect not set up for this organisation');
  if (!account.chargesEnabled) throw new Error('Stripe onboarding incomplete — payments disabled');
  return account;
}

function validateAmount(amountCents: number) {
  if (!Number.isInteger(amountCents)) throw new Error('Amount must be an integer (cents)');
  if (amountCents < MIN_DONATION_CENTS) throw new Error(`Minimum is $${MIN_DONATION_CENTS / 100}`);
  if (amountCents > MAX_DONATION_CENTS) {
    throw new Error(`Maximum is $${MAX_DONATION_CENTS / 100}`);
  }
}

// Create a destination-charge PaymentIntent for a one-off donation. The 5%
// application_fee_amount is captured on the platform, the remainder transfers
// to the connected wildlife org. The client confirms with the returned secret
// via Stripe Elements. Persisted Payment row stays REQUIRES_ACTION until the
// payment_intent.succeeded webhook flips it.
//
// Idempotency model: the local `Payment` row is created BEFORE the Stripe
// call and its cuid is passed as Stripe's idempotency key. A retry — same
// browser submit, a job retry, anything that re-enters this function with
// the same arguments — would mint a fresh Payment row with a new cuid and
// therefore a new Stripe object, which is the right behaviour for a fresh
// user intent. What this protects against is the dangerous case: the Stripe
// call succeeds but our DB write fails (network blip mid-update), then we
// re-enter with the same Payment.id (e.g. a worker retry that reads the
// pending row). Stripe returns the existing PaymentIntent rather than
// minting a duplicate chargeable object.
export async function createDonationPayment(args: CreateDonationArgs): Promise<CheckoutResult> {
  validateAmount(args.amountCents);
  const account = await requireActiveConnectAccount(args.orgId);
  const stripe = getStripe();

  const fee = platformFeeCents(args.amountCents);
  const kind: PaymentKind = 'DONATION_ONE_OFF';

  const payment = await prisma.payment.create({
    data: {
      clerkOrganizationId: args.orgId,
      memberId: args.memberId ?? null,
      kind,
      amountCents: args.amountCents,
      applicationFeeCents: fee,
      currency: DEFAULT_CURRENCY,
      status: 'REQUIRES_ACTION',
      metadata: {
        donorEmail: args.donorEmail,
        donorName: args.donorName ?? null,
        isAnonymous: Boolean(args.isAnonymous),
        message: args.message ?? null,
      },
    },
  });

  const intent = await stripe.paymentIntents.create(
    {
      amount: args.amountCents,
      currency: DEFAULT_CURRENCY.toLowerCase(),
      application_fee_amount: fee,
      transfer_data: { destination: account.stripeAccountId },
      receipt_email: args.donorEmail,
      automatic_payment_methods: { enabled: true },
      metadata: {
        kind,
        clerkOrganizationId: args.orgId,
        memberId: args.memberId ?? '',
        isAnonymous: String(Boolean(args.isAnonymous)),
        paymentId: payment.id,
      },
    },
    { idempotencyKey: payment.id }
  );

  await prisma.payment.update({
    where: { id: payment.id },
    data: { stripePaymentIntentId: intent.id },
  });

  if (!intent.client_secret) throw new Error('Stripe did not return a client_secret');

  return {
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    paymentId: payment.id,
  };
}

// One-off membership purchase. Same create-local-row-first + idempotency-key
// pattern as createDonationPayment; the webhook handler fans out on
// payment_intent.succeeded by reading PaymentKind to decide whether to
// create a Donation or Membership row.
export async function createMembershipPayment(args: CreateMembershipArgs): Promise<CheckoutResult> {
  const tier = await prisma.membershipTier.findFirst({
    where: { id: args.tierId, clerkOrganizationId: args.orgId, active: true, archivedAt: null },
  });
  if (!tier) throw new Error('Membership tier not found');
  if (tier.billingInterval !== 'ONE_OFF' && tier.billingInterval !== 'LIFETIME') {
    throw new Error('Recurring tiers are not supported yet — pick a one-off tier');
  }

  validateAmount(tier.amountCents);
  const account = await requireActiveConnectAccount(args.orgId);
  const stripe = getStripe();
  const fee = platformFeeCents(tier.amountCents);
  const kind: PaymentKind = 'MEMBERSHIP_ONE_OFF';

  const payment = await prisma.payment.create({
    data: {
      clerkOrganizationId: args.orgId,
      memberId: args.memberId,
      kind,
      amountCents: tier.amountCents,
      applicationFeeCents: fee,
      currency: tier.currency,
      status: 'REQUIRES_ACTION',
      metadata: { tierId: tier.id, tierName: tier.name },
    },
  });

  const intent = await stripe.paymentIntents.create(
    {
      amount: tier.amountCents,
      currency: tier.currency.toLowerCase(),
      application_fee_amount: fee,
      transfer_data: { destination: account.stripeAccountId },
      receipt_email: args.donorEmail,
      automatic_payment_methods: { enabled: true },
      metadata: {
        kind,
        clerkOrganizationId: args.orgId,
        memberId: args.memberId,
        tierId: tier.id,
        paymentId: payment.id,
      },
    },
    { idempotencyKey: payment.id }
  );

  await prisma.payment.update({
    where: { id: payment.id },
    data: { stripePaymentIntentId: intent.id },
  });

  if (!intent.client_secret) throw new Error('Stripe did not return a client_secret');
  return {
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    paymentId: payment.id,
  };
}
