import { z } from 'zod';
import { defineContract } from '@/lib/openapi/contract';

export const feedRosterContract = defineContract({
  method: 'get',
  path: '/api/feed-roster',
  summary: 'Get the feed roster items for the org (animals needing feeding today)',
  tags: ['Feed Roster'],
  security: 'clerkSession',
  request: {
    query: z.object({ orgId: z.string().optional() }),
  },
  responses: {
    200: { description: 'Feed roster items', schema: z.array(z.object({}).passthrough()) },
  },
  successStatus: 200,
});
