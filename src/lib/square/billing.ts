'server-only';

import { prisma } from '../prisma';
import { getSquareClient } from './client';
import { getValidAccessToken } from './oauth';
import { centsToMoney } from './money';
import { platformFeeCents } from './config';
import { computeNextCharge } from './periods';
import { recordSuccessfulPayment } from './webhook';
import type { PaymentKind, RecurringSubscription } from '@prisma/client';

// After this many consecutive failed charges, give up and cancel.
export const MAX_FAILED_ATTEMPTS = 4;
const RETRY_BACKOFF_MS = 24 * 60 * 60 * 1000;

export interface ChargeResult {
  status: string;
  paymentId: string | null;
  receiptNumber: string | null;
}

// Subscriptions whose next charge is due. Scanned by the worker each run.
export function findDueSubscriptions(now: Date, limit = 200): Promise<RecurringSubscription[]> {
  return prisma.recurringSubscription.findMany({
    where: {
      status: { in: ['ACTIVE', 'PENDING', 'PAST_DUE'] },
      nextChargeAt: { lte: now },
    },
    orderBy: { nextChargeAt: 'asc' },
    take: limit,
  });
}

// Charge one subscription's current cycle via CreatePayment + app_fee_money on
// the org's vaulted card-on-file. Used both for the immediate first charge
// (createRecurringSubscription) and by the worker for renewals. On success it
// advances nextChargeAt and resets dunning; on failure it backs off and, after
// MAX_FAILED_ATTEMPTS, cancels the subscription + its memberships.
export async function chargeSubscriptionNow(subscriptionId: string): Promise<ChargeResult> {
  const sub = await prisma.recurringSubscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) throw new Error('Subscription not found');
  if (sub.status === 'CANCELLED') return { status: 'CANCELLED', paymentId: null, receiptNumber: null };

  let accessToken: string;
  let locationId: string;
  try {
    ({ accessToken, locationId } = await getValidAccessToken(sub.clerkOrganizationId));
  } catch (error) {
    // Org disconnected / token unrefreshable — park the sub, surface the error.
    await prisma.recurringSubscription.update({
      where: { id: sub.id },
      data: { status: 'PAST_DUE' },
    });
    throw error;
  }

  const fee = platformFeeCents(sub.amountCents);
  const kind: PaymentKind = sub.kind === 'DONATION' ? 'DONATION_RECURRING' : 'MEMBERSHIP_RECURRING';

  const payment = await prisma.payment.create({
    data: {
      clerkOrganizationId: sub.clerkOrganizationId,
      memberId: sub.memberId,
      kind,
      amountCents: sub.amountCents,
      applicationFeeCents: fee,
      currency: sub.currency,
      status: 'REQUIRES_ACTION',
      metadata: {
        recurringSubscriptionId: sub.id,
        tierId: sub.tierId,
        donorEmail: sub.donorEmail,
        donorName: sub.donorName,
        isAnonymous: sub.isAnonymous,
      },
    },
  });

  try {
    const client = getSquareClient(accessToken);
    const res = await client.payments.create({
      sourceId: sub.squareCardId,
      customerId: sub.squareCustomerId,
      idempotencyKey: payment.id,
      amountMoney: centsToMoney(sub.amountCents, sub.currency),
      appFeeMoney: centsToMoney(fee, sub.currency),
      locationId,
      referenceId: payment.id,
      buyerEmailAddress: sub.donorEmail,
    });
    const sqPayment = res.payment;
    if (!sqPayment?.id) throw new Error('Square did not return a payment');

    const applied = await recordSuccessfulPayment({
      localPaymentId: payment.id,
      squarePayment: sqPayment,
    });

    // Advance from the scheduled anchor (not wall-clock) to avoid drift, but
    // never schedule the next charge in the past if we're catching up late.
    const base = sub.nextChargeAt > new Date() ? sub.nextChargeAt : new Date();
    const next = computeNextCharge(base, sub.interval as 'MONTHLY' | 'ANNUAL');
    await prisma.recurringSubscription.update({
      where: { id: sub.id },
      data: {
        status: 'ACTIVE',
        lastChargedAt: new Date(),
        nextChargeAt: next,
        failedAttempts: 0,
      },
    });
    return {
      status: sqPayment.status ?? 'COMPLETED',
      paymentId: payment.id,
      receiptNumber: applied.receiptNumber,
    };
  } catch (error) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
    const attempts = sub.failedAttempts + 1;
    const giveUp = attempts >= MAX_FAILED_ATTEMPTS;
    await prisma.recurringSubscription.update({
      where: { id: sub.id },
      data: {
        failedAttempts: attempts,
        status: giveUp ? 'CANCELLED' : 'PAST_DUE',
        cancelledAt: giveUp ? new Date() : sub.cancelledAt,
        nextChargeAt: giveUp ? sub.nextChargeAt : new Date(Date.now() + RETRY_BACKOFF_MS),
      },
    });
    if (giveUp) {
      await prisma.membership.updateMany({
        where: { recurringSubscriptionId: sub.id, status: { in: ['ACTIVE', 'PENDING'] } },
        data: { status: 'CANCELLED' },
      });
    }
    throw error;
  }
}
