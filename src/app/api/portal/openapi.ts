import { z } from '@/lib/openapi/registry';

// Prisma serialises Date -> ISO string on the wire; validate leniently as string.
export const isoDate = () => z.string().openapi({ format: 'date-time' });

export const PortalOkSchema = z.object({ ok: z.boolean() }).openapi('PortalOk');

export const CheckoutResultSchema = z
  .object({
    paymentId: z.string(),
    squarePaymentId: z.string(),
    status: z.string(),
    receiptNumber: z.string().nullable(),
  })
  .openapi('CheckoutResult');

export const SubscriptionResultSchema = z
  .object({
    subscriptionId: z.string(),
    status: z.string(),
    firstPaymentId: z.string().nullable(),
    receiptNumber: z.string().nullable(),
  })
  .openapi('SubscriptionResult');

export const CreatedIdSchema = z.object({ id: z.string() }).openapi('CreatedId');
