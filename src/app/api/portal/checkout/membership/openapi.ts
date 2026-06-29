import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';
import { SubscriptionResultSchema } from '../../openapi';

const MembershipCheckoutSchema = z
  .object({
    tierId: z.string().min(1),
    coverFees: z.boolean().optional(),
    sourceId: z.string().min(1),
    verificationToken: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi('MembershipCheckout');

export const membershipCheckoutContract = defineContract({
  method: 'post',
  path: '/api/portal/checkout/membership',
  summary: 'Purchase a membership tier (creates a recurring subscription)',
  tags: ['Portal'],
  security: 'clerkSession',
  request: { body: MembershipCheckoutSchema },
  responses: {
    200: { description: 'Subscription result', schema: SubscriptionResultSchema },
    400: { description: 'Validation error or payment failure' },
    401: { description: 'Unauthorized' },
    404: { description: 'No membership, feature not enabled, or tier not found' },
  },
  successStatus: 200,
});
