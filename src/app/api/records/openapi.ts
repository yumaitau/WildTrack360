import { z } from 'zod';
import { defineContract } from '@/lib/openapi/contract';

export const createRecordContract = defineContract({
  method: 'post',
  path: '/api/records',
  summary: 'Create a care record for an animal',
  tags: ['Records'],
  security: 'clerkSession',
  request: {
    body: z.object({}).passthrough(),
  },
  responses: {
    201: { description: 'Created record', schema: z.object({}).passthrough() },
  },
  successStatus: 201,
});

export const deleteRecordContract = defineContract({
  method: 'delete',
  path: '/api/records/{id}',
  summary: 'Delete a care record',
  tags: ['Records'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Deleted', schema: z.object({ success: z.boolean() }).openapi('RecordDeleted') },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});
