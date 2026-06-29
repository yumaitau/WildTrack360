import { z } from 'zod';
import { defineContract } from '@/lib/openapi/contract';

export const dismissNotificationContract = defineContract({
  method: 'post',
  path: '/api/admin-notification-dismissals',
  summary: 'Dismiss an admin notification (e.g. NSW reminder)',
  tags: ['Admin'],
  security: 'clerkSession',
  request: {
    body: z.object({}).passthrough(),
  },
  responses: {
    200: { description: 'Dismissed', schema: z.object({ ok: z.boolean() }) },
  },
  successStatus: 200,
});
