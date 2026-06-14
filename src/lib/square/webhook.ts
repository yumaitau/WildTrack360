'server-only';

import type { Square } from 'square';
import { WebhooksHelper } from 'square';
import { prisma } from '../prisma';
import { getWebhookSignatureKey } from './client';
import { markRevokedByMerchant } from './oauth';
import { recordSuccessfulPayment } from './payment-recording';

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
