import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

export const deleteReminderContract = defineContract({
  method: 'delete',
  path: '/api/animals/{id}/reminders/{reminderId}',
  summary: 'Delete a reminder',
  tags: ['Animals'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string(), reminderId: z.string() }) },
  responses: {
    200: { description: 'Deleted', schema: z.object({ ok: z.boolean() }) },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Animal or reminder not found' },
  },
  successStatus: 200,
});
