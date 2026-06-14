'server-only';

import { prisma } from '../prisma';
import { getSquareClient } from './client';
import { getValidAccessToken } from './oauth';
import { centsToMoney } from './money';
import { recordSuccessfulPayment } from './payment-recording';
import {
  DEFAULT_CURRENCY,
  MAX_DONATION_CENTS,
  MIN_DONATION_CENTS,
  platformFeeCents,
} from './config';
import type { PaymentKind } from '@prisma/client';

export interface CheckoutResult {
  paymentId: string;
  squarePaymentId: string;
  status: string;
  receiptNumber: string | null;
}

function validateAmount(amountCents: number) {
  if (!Number.isInteger(amountCents)) throw new Error('Amount must be an integer (cents)');
  if (amountCents < MIN_DONATION_CENTS) throw new Error(`Minimum is $${MIN_DONATION_CENTS / 100}`);
  if (amountCents > MAX_DONATION_CENTS) throw new Error(`Maximum is $${MAX_DONATION_CENTS / 100}`);
}

export interface CreateDonationArgs {
  orgId: string;
  amountCents: number;
  donorEmail: string;
  donorName?: string | null;
  message?: string | null;
  isAnonymous?: boolean;
  memberId?: string | null;
  sourceId: string;
  verificationToken?: string | null;
}

// One-off donation. Funds settle to the org's Square account; our 5%
// app_fee_money is auto-deposited to the platform account. The card token is
// charged synchronously, so side effects (receipt + Donation row) run inline
// via recordSuccessfulPayment. The Payment.id is the Square idempotency key.
export async function createDonationPayment(args: CreateDonationArgs): Promise<CheckoutResult> {
  validateAmount(args.amountCents);
  const { accessToken, locationId } = await getValidAccessToken(args.orgId);
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
        adminNotificationEvent: 'donation-received',
        donorEmail: args.donorEmail,
        donorName: args.donorName ?? null,
        isAnonymous: Boolean(args.isAnonymous),
        message: args.message ?? null,
      },
    },
  });

  const client = getSquareClient(accessToken);
  const res = await client.payments.create({
    sourceId: args.sourceId,
    idempotencyKey: payment.id,
    amountMoney: centsToMoney(args.amountCents),
    appFeeMoney: centsToMoney(fee),
    locationId,
    verificationToken: args.verificationToken ?? undefined,
    referenceId: payment.id,
    note: args.message ?? undefined,
    buyerEmailAddress: args.donorEmail,
  });
  const sqPayment = res.payment;
  if (!sqPayment?.id) throw new Error('Square did not return a payment');

  // The card HAS been charged. If inline bookkeeping fails, don't surface an
  // error to the caller — that would prompt a retry against an already-charged
  // donor. The payment.updated webhook reconciles the Payment + Donation by
  // referenceId. (The Square card nonce is single-use, so a retry can't reuse
  // this token anyway.)
  let receiptNumber: string | null = null;
  try {
    const applied = await recordSuccessfulPayment({
      localPaymentId: payment.id,
      squarePayment: sqPayment,
    });
    receiptNumber = applied.receiptNumber;
  } catch (bookkeepingError) {
    console.error('Donation charged but local bookkeeping failed; webhook will reconcile', {
      paymentId: payment.id,
      error:
        bookkeepingError instanceof Error ? bookkeepingError.message : String(bookkeepingError),
    });
  }
  return {
    paymentId: payment.id,
    squarePaymentId: sqPayment.id,
    status: sqPayment.status ?? 'UNKNOWN',
    receiptNumber,
  };
}

// NOTE: There is no one-off membership purchase. Memberships are always an
// annual auto-renewing commitment and go through createRecurringSubscription
// (src/lib/square/subscriptions.ts). Only donations use the one-off path above.
