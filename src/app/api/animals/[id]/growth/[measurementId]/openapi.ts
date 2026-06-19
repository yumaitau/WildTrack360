import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

export const deleteGrowthContract = defineContract({
  method: 'delete',
  path: '/api/animals/{id}/growth/{measurementId}',
  summary: 'Delete a growth measurement',
  tags: ['Animals'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string(), measurementId: z.string() }) },
  responses: {
    200: { description: 'Deleted', schema: z.object({ success: z.boolean() }) },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Animal or measurement not found' },
  },
  successStatus: 200,
});
