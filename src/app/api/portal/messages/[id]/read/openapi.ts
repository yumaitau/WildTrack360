import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

export const markMessageReadContract = defineContract({
  method: 'post',
  path: '/api/portal/messages/{id}/read',
  summary: 'Mark a portal message as read',
  tags: ['Portal'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: 'Marked as read',
      schema: z.object({ ok: z.boolean() }).openapi('PortalMessageReadResult'),
    },
    401: { description: 'Unauthorized' },
    404: { description: 'No membership or feature not enabled' },
  },
  successStatus: 200,
});
