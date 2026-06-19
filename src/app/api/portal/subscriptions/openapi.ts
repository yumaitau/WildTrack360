import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';
import { isoDate } from '../openapi';

const PortalSubscriptionSchema = z
  .object({
    id: z.string(),
    kind: z.enum(['DONATION', 'MEMBERSHIP']),
    label: z.string(),
    amountCents: z.number().int(),
    currency: z.string(),
    interval: z.enum(['ONE_OFF', 'MONTHLY', 'ANNUAL', 'LIFETIME']),
    status: z.enum(['PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELLED']),
    nextChargeAt: isoDate(),
    startedAt: isoDate(),
  })
  .openapi('PortalSubscription');

export const listPortalSubscriptionsContract = defineContract({
  method: 'get',
  path: '/api/portal/subscriptions',
  summary: 'List active recurring subscriptions for the member',
  tags: ['Portal'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Subscription list', schema: z.array(PortalSubscriptionSchema) },
    401: { description: 'Unauthorized' },
    404: { description: 'No membership or feature not enabled' },
  },
  successStatus: 200,
});
