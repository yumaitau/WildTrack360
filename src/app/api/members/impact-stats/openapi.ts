import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

export const ImpactStatsSchema = z
  .object({
    animalsHelped: z.number().int(),
    animalsReleased: z.number().int(),
  })
  .openapi('ImpactStats');

export const impactStatsContract = defineContract({
  method: 'get',
  path: '/api/members/impact-stats',
  summary: 'Get org-wide care impact stats (merge token preview)',
  tags: ['Members'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Impact stats', schema: ImpactStatsSchema },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Feature not enabled' },
  },
  successStatus: 200,
});
