import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';
import { PortalOkSchema } from '../../../openapi';

const UpdateCardSchema = z
  .object({
    sourceId: z.string().min(1),
    verificationToken: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi('UpdateSubscriptionCard');

export const updateSubscriptionCardContract = defineContract({
  method: 'post',
  path: '/api/portal/subscriptions/{id}/card',
  summary: 'Update the card on file for a recurring subscription',
  tags: ['Portal'],
  security: 'clerkSession',
  request: {
    params: z.object({ id: z.string() }),
    body: UpdateCardSchema,
  },
  responses: {
    200: { description: 'Card updated', schema: PortalOkSchema },
    400: { description: 'Validation error or Square failure' },
    401: { description: 'Unauthorized' },
    404: { description: 'No membership, feature not enabled, or subscription not found' },
  },
  successStatus: 200,
});
