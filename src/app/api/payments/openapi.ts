import { z } from 'zod';
import { defineContract } from '@/lib/openapi/contract';

export const listPaymentsContract = defineContract({
  method: 'get',
  path: '/api/payments',
  summary: 'List payments for the active org (optional ?status= and ?kind= filters)',
  tags: ['Payments'],
  security: 'clerkSession',
  request: {
    query: z.object({
      status: z.enum(['SUCCEEDED', 'REQUIRES_ACTION', 'FAILED', 'REFUNDED']).optional(),
      kind: z.enum(['DONATION_ONE_OFF', 'MEMBERSHIP_ONE_OFF', 'DONATION_RECURRING', 'MEMBERSHIP_RECURRING']).optional(),
    }),
  },
  responses: {
    200: { description: 'Payment list', schema: z.array(z.object({}).passthrough()) },
  },
  successStatus: 200,
});
