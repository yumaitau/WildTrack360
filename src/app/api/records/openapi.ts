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
