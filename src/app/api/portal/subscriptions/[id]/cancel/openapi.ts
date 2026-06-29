import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';
import { PortalOkSchema } from '../../../openapi';

export const cancelSubscriptionContract = defineContract({
  method: 'post',
  path: '/api/portal/subscriptions/{id}/cancel',
  summary: 'Cancel a recurring subscription',
  tags: ['Portal'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Cancelled', schema: PortalOkSchema },
    401: { description: 'Unauthorized' },
    404: { description: 'No membership, feature not enabled, or subscription not found' },
  },
  successStatus: 200,
});
