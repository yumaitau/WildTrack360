'server-only';

import type { Square } from 'square';
import { WebhooksHelper } from 'square';
import { prisma } from '../prisma';
import { logAudit } from '../audit';
import { getWebhookSignatureKey } from './client';
import { processingFeeCents } from './money';
import { computeMembershipEnd } from './periods';
import { markRevokedByMerchant } from './oauth';
import { sendPaymentReceiptEmail } from '../email/payment-receipt';
import type { PaymentStatus } from '@prisma/client';

export interface DispatchResult {
  alreadyProcessed: boolean;
  type: string;
}

// Verify a Square webhook signature (HMAC-SHA256 over notificationUrl + body)
// and return the parsed event. Throws on an invalid signature.
export async function verifyAndConstruct(
  rawBody: string,
  signature: string,
  notificationUrl: string
): Promise<SquareWebhookEvent> {
  const ok = await WebhooksHelper.verifySignature({
    requestBody: rawBody,
    signatureHeader: signature,
    signatureKey: getWebhookSignatureKey(),
    notificationUrl,
  });
  if (!ok) throw new Error('Invalid Square webhook signature');
  return JSON.parse(rawBody) as SquareWebhookEvent;
}

interface SquareWebhookEvent {
  event_id?: string;
  type?: string;
  merchant_id?: string;
  data?: { object?: Record<string, unknown> };
}

function mapStatus(squareStatus: string | undefined): PaymentStatus {
  switch (squareStatus) {
    case 'COMPLETED':
    case 'APPROVED':
      return 'SUCCEEDED';
    case 'FAILED':
    case 'CANCELED':
      return 'FAILED';
    default:
      return 'REQUIRES_ACTION';
  }
}

// Apply a Square payment result to the local Payment row. Idempotent: mints the
// receipt number and creates the Donation/Membership row only on the first
// transition to SUCCEEDED. Shared by inline checkout, the billing worker, and
// the payment webhook so the side effects live in exactly one place.
export async function recordSuccessfulPayment(args: {
  localPaymentId?: string;
  squarePayment: Square.Payment;
}): Promise<{ receiptNumber: string | null; status: PaymentStatus }> {
  const sq = args.squarePayment;
  const payment = await findLocalPayment(args.localPaymentId, sq);
  if (!payment) return { receiptNumber: null, status: 'REQUIRES_ACTION' };

  const status = mapStatus(sq.status);
  const isFirstSuccess = payment.status !== 'SUCCEEDED' && status === 'SUCCEEDED';
  const receiptNumber =
    payment.receiptNumber ??
    (isFirstSuccess ? await nextReceiptNumber(payment.clerkOrganizationId) : null);

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status,
      squarePaymentId: sq.id ?? payment.squarePaymentId,
      squareOrderId: sq.orderId ?? payment.squareOrderId,
      processingFeeCents: processingFeeCents(sq) ?? payment.processingFeeCents,
      receiptUrl: sq.receiptUrl ?? payment.receiptUrl,
      receiptNumber,
    },
  });

  if (!isFirstSuccess) return { receiptNumber: updated.receiptNumber, status };

  const meta = (payment.metadata ?? {}) as Record<string, unknown>;
  const recurringSubscriptionId = (meta.recurringSubscriptionId as string) ?? null;

  if (payment.kind === 'DONATION_ONE_OFF' || payment.kind === 'DONATION_RECURRING') {
    await prisma.donation.create({
      data: {
        clerkOrganizationId: payment.clerkOrganizationId,
        memberId: payment.memberId,
        donorEmail: (meta.donorEmail as string) ?? sq.buyerEmailAddress ?? 'unknown@example.com',
        donorName: (meta.donorName as string) ?? null,
        amountCents: payment.amountCents,
        feeCents: payment.applicationFeeCents,
        currency: payment.currency,
        isAnonymous: Boolean(meta.isAnonymous),
        message: (meta.message as string) ?? null,
        paymentId: payment.id,
        recurringSubscriptionId,
      },
    });
  } else if (payment.kind === 'MEMBERSHIP_ONE_OFF' || payment.kind === 'MEMBERSHIP_RECURRING') {
    const tierId = meta.tierId as string | undefined;
    if (tierId && payment.memberId) {
      const tier = await prisma.membershipTier.findUnique({ where: { id: tierId } });
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
            recurringSubscriptionId,
          },
        });
      }
    }
  }

  logAudit({
    userId: 'square-webhook',
    orgId: payment.clerkOrganizationId,
    action: 'CREATE',
    entity: 'Payment',
    entityId: updated.id,
    metadata: { kind: payment.kind, amountCents: payment.amountCents },
  });

  // Email the branded receipt to the payer. Best-effort: a mail failure must
  // not roll back the payment side effects or fail the webhook.
  try {
    await sendPaymentReceiptEmail(payment.id, payment.clerkOrganizationId);
  } catch (error) {
    console.error('Failed to send payment receipt email:', error);
  }

  return { receiptNumber: updated.receiptNumber, status };
}

async function findLocalPayment(localPaymentId: string | undefined, sq: Square.Payment) {
  if (localPaymentId) return prisma.payment.findUnique({ where: { id: localPaymentId } });
  // Webhook path: our Payment.id is echoed back as the Square referenceId.
  if (sq.referenceId) {
    const byRef = await prisma.payment.findUnique({ where: { id: sq.referenceId } });
    if (byRef) return byRef;
  }
  if (sq.id) return prisma.payment.findUnique({ where: { squarePaymentId: sq.id } });
  return null;
}

export async function dispatchEvent(event: SquareWebhookEvent): Promise<DispatchResult> {
  const id = event.event_id;
  const type = event.type ?? 'unknown';
  if (!id) return { alreadyProcessed: false, type };

  const existing = await prisma.squareEvent.findUnique({ where: { id } });
  if (existing) return { alreadyProcessed: true, type };

  // Write the idempotency marker first so a concurrent re-delivery loses the
  // race on the PK; roll it back on handler failure so Square can retry.
  await prisma.squareEvent.create({
    data: { id, type, payload: event as unknown as object },
  });

  try {
    switch (type) {
      case 'payment.created':
      case 'payment.updated': {
        const raw = event.data?.object?.payment as Record<string, unknown> | undefined;
        if (raw) await recordSuccessfulPayment({ squarePayment: normalizeWebhookPayment(raw) });
        break;
      }
      case 'refund.created':
      case 'refund.updated': {
        const refund = event.data?.object?.refund as Record<string, unknown> | undefined;
        if (refund) await handleRefund(refund);
        break;
      }
      case 'oauth.authorization.revoked': {
        const merchantId =
          event.merchant_id ??
          ((event.data?.object?.revocation as Record<string, unknown>)?.merchant_id as string);
        if (merchantId) await markRevokedByMerchant(merchantId);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    await prisma.squareEvent.delete({ where: { id } }).catch(() => {});
    throw error;
  }

  return { alreadyProcessed: false, type };
}

// Webhook payloads are snake_case JSON; map the fields recordSuccessfulPayment
// reads into the SDK's camelCase Payment shape.
function normalizeWebhookPayment(o: Record<string, unknown>): Square.Payment {
  const fees = Array.isArray(o.processing_fee)
    ? (o.processing_fee as Record<string, unknown>[]).map((f) => {
        const m = f.amount_money as { amount?: number | string; currency?: string } | undefined;
        return {
          ...f,
          amountMoney: m
            ? { amount: BigInt(m.amount ?? 0), currency: m.currency as Square.Currency }
            : undefined,
        };
      })
    : undefined;
  return {
    id: o.id as string,
    status: o.status as string,
    orderId: o.order_id as string | undefined,
    referenceId: o.reference_id as string | undefined,
    receiptUrl: o.receipt_url as string | undefined,
    buyerEmailAddress: o.buyer_email_address as string | undefined,
    processingFee: fees,
  } as Square.Payment;
}

async function handleRefund(refund: Record<string, unknown>): Promise<void> {
  const squarePaymentId = refund.payment_id as string | undefined;
  if (!squarePaymentId) return;
  const payment = await prisma.payment.findUnique({ where: { squarePaymentId } });
  if (!payment) return;
  // Only flag a FULL refund as REFUNDED; partial refunds keep the payment
  // SUCCEEDED so accounting still treats it as a real transaction.
  const money = refund.amount_money as { amount?: number | string } | undefined;
  const refundedCents = money?.amount != null ? Number(money.amount) : 0;
  if (refund.status === 'COMPLETED' && refundedCents >= payment.amountCents) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
  }
}

// Atomic per-org per-year receipt sequence. Final string is
// "{prefix}-{YYYY}-{seq:5}" composed here so the prefix can change without
// backfill. Mirrors the prior Stripe implementation.
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
