import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

const SquareConfigSchema = z
  .object({ applicationId: z.string(), locationId: z.string() })
  .openapi('SquareConfig');

export const getSquareConfigContract = defineContract({
  method: 'get',
  path: '/api/portal/square-config',
  summary: 'Get Square SDK configuration for the member portal',
  tags: ['Portal'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Square application and location ids', schema: SquareConfigSchema },
    401: { description: 'Unauthorized' },
    404: { description: 'No membership found' },
    503: {
      description:
        'Payments not configured (Square not connected or revoked), or Square application id env var not set',
    },
  },
  successStatus: 200,
});
