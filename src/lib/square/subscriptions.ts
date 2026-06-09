'server-only';

import { prisma } from '../prisma';
import { getValidAccessToken } from './oauth';
import { ensureSquareCustomer, saveCardOnFile } from './cards';
import { chargeSubscriptionNow } from './billing';
import { MAX_DONATION_CENTS, MIN_DONATION_CENTS, DEFAULT_CURRENCY } from './config';
import type { SubscriptionKind } from '@prisma/client';

export { computeMembershipEnd, computeNextCharge } from './periods';

export interface SubscriptionResult {
  subscriptionId: string;
  status: string;
  firstPaymentId: string | null;
  receiptNumber: string | null;
}

export interface CreateRecurringArgs {
  orgId: string;
  memberId: string;
  kind: SubscriptionKind;
  tierId?: string | null;
  donorEmail: string;
  donorName?: string | null;
  amountCents: number;
  currency?: string;
  interval: 'MONTHLY' | 'ANNUAL';
  isAnonymous?: boolean;
  sourceId: string;
  verificationToken?: string | null;
}

// Self-billed recurring subscription. Vaults a card-on-file on the org's Square
// account, persists a RecurringSubscription the worker will scan, then charges
// cycle 1 immediately. There is no Square Subscriptions object — our worker
// drives every renewal via CreatePayment + app_fee_money.
export async function createRecurringSubscription(
  args: CreateRecurringArgs
): Promise<SubscriptionResult> {
  if (!Number.isInteger(args.amountCents)) throw new Error('amountCents must be an integer');
  if (args.amountCents < MIN_DONATION_CENTS) throw new Error(`Minimum is $${MIN_DONATION_CENTS / 100}`);
  if (args.amountCents > MAX_DONATION_CENTS) throw new Error(`Maximum is $${MAX_DONATION_CENTS / 100}`);

  const { accessToken } = await getValidAccessToken(args.orgId);
  const customerId = await ensureSquareCustomer(accessToken, args.memberId, args.donorEmail);
  const cardId = await saveCardOnFile({
    accessToken,
    customerId,
    sourceId: args.sourceId,
    verificationToken: args.verificationToken,
    cardholderName: args.donorName,
  });
  await prisma.member.update({ where: { id: args.memberId }, data: { squareCardId: cardId } });

  const now = new Date();
  const sub = await prisma.recurringSubscription.create({
    data: {
      clerkOrganizationId: args.orgId,
      memberId: args.memberId,
      kind: args.kind,
      tierId: args.tierId ?? null,
      donorEmail: args.donorEmail,
      donorName: args.donorName ?? null,
      amountCents: args.amountCents,
      currency: args.currency ?? DEFAULT_CURRENCY,
      interval: args.interval,
      status: 'PENDING',
      isAnonymous: Boolean(args.isAnonymous),
      squareCustomerId: customerId,
      squareCardId: cardId,
      nextChargeAt: now,
      startedAt: now,
    },
  });

  const charge = await chargeSubscriptionNow(sub.id);
  return {
    subscriptionId: sub.id,
    status: charge.status,
    firstPaymentId: charge.paymentId,
    receiptNumber: charge.receiptNumber,
  };
}

export async function cancelSubscription(orgId: string, subscriptionId: string): Promise<void> {
  await prisma.recurringSubscription.updateMany({
    where: {
      id: subscriptionId,
      clerkOrganizationId: orgId,
      status: { in: ['ACTIVE', 'PAST_DUE', 'PENDING'] },
    },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });
  await prisma.membership.updateMany({
    where: { recurringSubscriptionId: subscriptionId, status: { in: ['ACTIVE', 'PENDING'] } },
    data: { status: 'CANCELLED' },
  });
}
