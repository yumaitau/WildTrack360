import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

export const exportMembersContract = defineContract({
  method: 'get',
  path: '/api/members/export',
  summary: 'Export members as a CSV file',
  tags: ['Members'],
  security: 'clerkSession',
  request: {
    query: z.object({ includeArchived: z.string().optional() }),
  },
  responses: {
    200: { description: 'Members CSV export', content: 'text/csv' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Feature not enabled' },
  },
  successStatus: 200,
});
