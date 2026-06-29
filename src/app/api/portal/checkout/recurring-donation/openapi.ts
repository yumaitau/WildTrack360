import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';
import { SubscriptionResultSchema } from '../../openapi';

const RecurringDonationCheckoutSchema = z
  .object({
    amountCents: z.number(),
    interval: z.enum(['MONTHLY', 'ANNUAL']),
    isAnonymous: z.boolean().optional(),
    sourceId: z.string().min(1),
    verificationToken: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi('RecurringDonationCheckout');

export const recurringDonationCheckoutContract = defineContract({
  method: 'post',
  path: '/api/portal/checkout/recurring-donation',
  summary: 'Start a recurring donation subscription',
  tags: ['Portal'],
  security: 'clerkSession',
  request: { body: RecurringDonationCheckoutSchema },
  responses: {
    200: { description: 'Subscription result', schema: SubscriptionResultSchema },
    400: { description: 'Validation error or payment failure' },
    401: { description: 'Unauthorized' },
    404: { description: 'No membership or feature not enabled' },
  },
  successStatus: 200,
});
