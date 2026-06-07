'server-only';

import type Stripe from 'stripe';
import { prisma } from '../prisma';
import { logAudit } from '../audit';
import { getStripe, getWebhookSecret } from './client';
import { computeMembershipEnd } from './subscriptions';

export interface DispatchResult {
  alreadyProcessed: boolean;
  type: string;
}

export function verifyAndConstruct(
  rawBody: string,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(rawBody, signature, getWebhookSecret());
}

export async function dispatchEvent(event: Stripe.Event): Promise<DispatchResult> {
  // Idempotency: refuse to re-process the same Stripe event id even if Stripe
  // retries (their docs guarantee at-least-once delivery, never exactly-once).
  const existing = await prisma.stripeEvent.findUnique({ where: { id: event.id } });
  if (existing) return { alreadyProcessed: true, type: event.type };

  // Write the marker FIRST so any concurrent webhook delivery (Stripe will
  // fire duplicates if our 200 lands late) loses the race against the unique
  // PK. We then wrap the business handlers in try/catch and DELETE the marker
  // on failure so Stripe's retry policy can re-deliver the event and we
  // actually get another shot at it. Without this, an exception inside any
  // handler permanently buries the event because the marker already exists.
  await prisma.stripeEvent.create({
    data: {
      id: event.id,
      type: event.type,
      payload: event as unknown as object,
    },
  });

  try {
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChanged(event.data.object as Stripe.Subscription);
        break;
      default:
        // Unknown events are silently recorded in stripe_events for audit.
        break;
    }
  } catch (error) {
    // Roll back the idempotency marker so Stripe retries can re-enter this
    // function. We swallow the delete error to avoid masking the real cause.
    await prisma.stripeEvent.delete({ where: { id: event.id } }).catch(() => {});
    throw error;
  }

  return { alreadyProcessed: false, type: event.type };
}

async function handleAccountUpdated(account: Stripe.Account) {
  const row = await prisma.stripeAccount.findUnique({
    where: { stripeAccountId: account.id },
  });
  if (!row) return;
  await prisma.stripeAccount.update({
    where: { stripeAccountId: account.id },
    data: {
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      onboardingCompletedAt:
        account.details_submitted && !row.onboardingCompletedAt
          ? new Date()
          : row.onboardingCompletedAt,
    },
  });
}

async function handlePaymentIntentSucceeded(intent: Stripe.PaymentIntent) {
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: intent.id },
  });
  if (!payment) return; // PI we did not create — ignore.

  const chargeId =
    typeof intent.latest_charge === 'string'
      ? intent.latest_charge
      : intent.latest_charge?.id ?? null;
  const receiptUrl =
    typeof intent.latest_charge === 'object' ? intent.latest_charge?.receipt_url ?? null : null;

  // Only mint a new receipt number on the first SUCCEEDED transition. Stripe
  // can re-fire payment_intent.succeeded (e.g. after the dispatcher's roll-
  // back deletes the StripeEvent marker on an unrelated failure) and we
  // don't want each retry to burn a sequence slot.
  const isFirstSuccess = payment.status !== 'SUCCEEDED' && !payment.receiptNumber;
  const receiptNumber =
    payment.receiptNumber ??
    (isFirstSuccess ? await nextReceiptNumber(payment.clerkOrganizationId) : null);

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'SUCCEEDED',
      stripeChargeId: chargeId,
      receiptUrl,
      receiptNumber,
    },
  });

  if (payment.kind === 'DONATION_ONE_OFF') {
    const meta = (payment.metadata ?? {}) as {
      donorEmail?: string;
      donorName?: string | null;
      isAnonymous?: boolean;
      message?: string | null;
    };
    await prisma.donation.create({
      data: {
        clerkOrganizationId: payment.clerkOrganizationId,
        memberId: payment.memberId,
        donorEmail: meta.donorEmail ?? intent.receipt_email ?? 'unknown@example.com',
        donorName: meta.donorName ?? null,
        amountCents: payment.amountCents,
        feeCents: payment.applicationFeeCents,
        currency: payment.currency,
        isAnonymous: Boolean(meta.isAnonymous),
        message: meta.message ?? null,
        paymentId: payment.id,
      },
    });
  }

  if (payment.kind === 'MEMBERSHIP_ONE_OFF') {
    const meta = (payment.metadata ?? {}) as { tierId?: string };
    if (meta.tierId && payment.memberId) {
      const tier = await prisma.membershipTier.findUnique({ where: { id: meta.tierId } });
      if (tier) {
        const start = new Date();
        const end = computeMembershipEnd(start, tier.billingInterval);
        await prisma.membership.create({
          data: {
            clerkOrganizationId: payment.clerkOrganizationId,
            memberId: payment.memberId,
            tierId: tier.id,
            periodStart: start,
            periodEnd: end,
            status: 'ACTIVE',
            paymentId: payment.id,
          },
        });
      }
    }
  }

  logAudit({
    userId: 'stripe-webhook',
    orgId: payment.clerkOrganizationId,
    action: 'CREATE',
    entity: 'Payment',
    entityId: updated.id,
    metadata: { kind: payment.kind, amountCents: payment.amountCents },
  });
}

async function handlePaymentIntentFailed(intent: Stripe.PaymentIntent) {
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: intent.id },
  });
  if (!payment) return;
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'FAILED' },
  });
}

// Recurring instalment paid. Emits a Payment row (idempotent via the
// stripe_invoice_id unique index) and, depending on subscription metadata,
// either a Donation row (linked to RecurringDonation) or a Membership row.
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Stripe always populates invoice.id for invoice.payment_succeeded, but the
  // SDK types mark it optional — guard anyway so we never collapse multiple
  // invoices into a single Payment row keyed on the empty string.
  if (!invoice.id) return;

  const subscriptionId = invoice.parent?.subscription_details?.subscription;
  const subscriptionIdStr =
    typeof subscriptionId === 'string'
      ? subscriptionId
      : subscriptionId
        ? subscriptionId.id
        : null;
  if (!subscriptionIdStr) return; // non-subscription invoice — not ours.

  const sub = await getStripe().subscriptions.retrieve(subscriptionIdStr);
  const meta = sub.metadata ?? {};
  const orgId = meta.clerkOrganizationId;
  if (!orgId) return;

  const kind = meta.kind === 'MEMBERSHIP_RECURRING' ? 'MEMBERSHIP_RECURRING' : 'DONATION_RECURRING';
  const memberId = meta.memberId || null;

  const amountCents = invoice.amount_paid;
  // Stripe v22 no longer exposes application_fee_amount on the Invoice itself;
  // compute it from the subscription's percent. Donation/membership both use
  // the platform fee constant.
  const applicationFeeCents = Math.round(
    (amountCents * Number(sub.application_fee_percent ?? 0)) / 100
  );

  const existing = await prisma.payment.findUnique({
    where: { stripeInvoiceId: invoice.id },
  });
  // Only allocate a receipt number on the first successful transition. A
  // retry of the same invoice event should not burn another sequence slot.
  const receiptNumber =
    existing?.receiptNumber ??
    (existing?.status === 'SUCCEEDED' ? null : await nextReceiptNumber(orgId));

  const payment = await prisma.payment.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: {
      clerkOrganizationId: orgId,
      memberId,
      kind,
      stripeInvoiceId: invoice.id,
      amountCents,
      applicationFeeCents,
      currency: (invoice.currency ?? 'aud').toUpperCase(),
      status: 'SUCCEEDED',
      receiptUrl: invoice.hosted_invoice_url ?? null,
      receiptNumber,
      metadata: { subscriptionId: subscriptionIdStr, tierId: meta.tierId ?? null },
    },
    update: {
      status: 'SUCCEEDED',
      receiptUrl: invoice.hosted_invoice_url ?? null,
    },
  });

  if (kind === 'DONATION_RECURRING') {
    const recurring = await prisma.recurringDonation.findUnique({
      where: { stripeSubscriptionId: subscriptionIdStr },
    });
    if (recurring) {
      // isAnonymous is carried on the Subscription metadata (the canonical
      // copy lives there because RecurringDonation doesn't have a column for
      // it); read it back here so every instalment Donation row keeps the
      // donor's stated preference.
      const isAnonymous = (meta.isAnonymous ?? '').toLowerCase() === 'true';
      await prisma.donation.create({
        data: {
          clerkOrganizationId: orgId,
          memberId,
          donorEmail: recurring.donorEmail,
          donorName: recurring.donorName,
          amountCents,
          feeCents: applicationFeeCents,
          currency: payment.currency,
          isAnonymous,
          paymentId: payment.id,
          recurringDonationId: recurring.id,
        },
      });
    }
  } else if (kind === 'MEMBERSHIP_RECURRING' && memberId && meta.tierId) {
    const tier = await prisma.membershipTier.findUnique({ where: { id: meta.tierId } });
    if (tier) {
      // Prefer the invoice's actual billing period over a wall-clock guess.
      // Also dedupe by (stripeSubscriptionId, periodStart) so a re-delivery of
      // the same invoice doesn't pile up overlapping Membership rows for the
      // same cycle.
      const line = invoice.lines?.data?.[0];
      const periodStart = line?.period?.start
        ? new Date(line.period.start * 1000)
        : new Date();
      const periodEnd = line?.period?.end
        ? new Date(line.period.end * 1000)
        : computeMembershipEnd(periodStart, tier.billingInterval);

      const existingMembership = await prisma.membership.findFirst({
        where: { stripeSubscriptionId: subscriptionIdStr, periodStart },
      });
      if (existingMembership) {
        await prisma.membership.update({
          where: { id: existingMembership.id },
          data: { periodEnd, status: 'ACTIVE', paymentId: payment.id },
        });
      } else {
        await prisma.membership.create({
          data: {
            clerkOrganizationId: orgId,
            memberId,
            tierId: tier.id,
            periodStart,
            periodEnd,
            status: 'ACTIVE',
            stripeSubscriptionId: subscriptionIdStr,
            paymentId: payment.id,
          },
        });
      }
    }
  }

  logAudit({
    userId: 'stripe-webhook',
    orgId,
    action: 'CREATE',
    entity: 'Payment',
    entityId: payment.id,
    metadata: { kind, amountCents, recurring: true },
  });
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.parent?.subscription_details?.subscription;
  const subscriptionIdStr =
    typeof subscriptionId === 'string'
      ? subscriptionId
      : subscriptionId
        ? subscriptionId.id
        : null;
  if (!subscriptionIdStr) return;
  await prisma.recurringDonation
    .update({
      where: { stripeSubscriptionId: subscriptionIdStr },
      data: { status: 'PAST_DUE' },
    })
    .catch(() => {});
  if (!invoice.id) return;
  await prisma.payment
    .upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        clerkOrganizationId: invoice.metadata?.clerkOrganizationId ?? 'unknown',
        kind: 'DONATION_RECURRING',
        stripeInvoiceId: invoice.id,
        amountCents: invoice.amount_due,
        applicationFeeCents: 0,
        currency: (invoice.currency ?? 'aud').toUpperCase(),
        status: 'FAILED',
      },
      update: { status: 'FAILED' },
    })
    .catch(() => {});
}

async function handleSubscriptionChanged(sub: Stripe.Subscription) {
  const recurring = await prisma.recurringDonation.findUnique({
    where: { stripeSubscriptionId: sub.id },
  });
  if (!recurring) return;

  const status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' =
    sub.status === 'active' || sub.status === 'trialing'
      ? 'ACTIVE'
      : sub.status === 'past_due' || sub.status === 'unpaid'
        ? 'PAST_DUE'
        : 'CANCELLED';

  await prisma.recurringDonation.update({
    where: { stripeSubscriptionId: sub.id },
    data: {
      status,
      cancelledAt:
        status === 'CANCELLED' && !recurring.cancelledAt ? new Date() : recurring.cancelledAt,
    },
  });
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  if (!charge.payment_intent) return;
  const intentId =
    typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent.id;
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: intentId },
  });
  if (!payment) return;
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'REFUNDED' },
  });
}

// Atomic per-org per-year receipt sequence. Mirrors the AnimalIdSequence
// pattern. Final receipt string is "{prefix}-{YYYY}-{seq:5}" composed at
// display time so the prefix can change without backfill.
export async function nextReceiptNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await prisma.receiptSequence.upsert({
    where: { clerkOrganizationId_year: { clerkOrganizationId: orgId, year } },
    create: { clerkOrganizationId: orgId, year, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });
  const settings = await prisma.organisationSettings.findUnique({
    where: { clerkOrganisationId: orgId },
  });
  const prefix = settings?.receiptPrefix?.trim() || 'RCPT';
  return `${prefix}-${year}-${String(seq.lastNumber).padStart(5, '0')}`;
}

