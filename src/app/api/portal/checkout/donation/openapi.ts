import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';
import { CheckoutResultSchema } from '../../openapi';

const DonationCheckoutSchema = z
  .object({
    amountCents: z.number(),
    message: z.string().nullable().optional(),
    isAnonymous: z.boolean().optional(),
    sourceId: z.string().min(1),
    verificationToken: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi('DonationCheckout');

export const donationCheckoutContract = defineContract({
  method: 'post',
  path: '/api/portal/checkout/donation',
  summary: 'Process a one-off donation payment',
  tags: ['Portal'],
  security: 'clerkSession',
  request: { body: DonationCheckoutSchema },
  responses: {
    200: { description: 'Donation payment result', schema: CheckoutResultSchema },
    400: { description: 'Validation error or payment failure' },
    401: { description: 'Unauthorized' },
    404: { description: 'No membership or feature not enabled' },
  },
  successStatus: 200,
});
