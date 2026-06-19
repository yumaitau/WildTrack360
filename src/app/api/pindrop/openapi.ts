import { z } from 'zod';
import { defineContract } from '@/lib/openapi/contract';

export const createPindropContract = defineContract({
  method: 'post',
  path: '/api/pindrop',
  summary: 'Create a pindrop session and send SMS link to caller',
  tags: ['Pindrop'],
  security: 'clerkSession',
  request: {
    body: z.object({
      callerPhone: z.string(),
      callerName: z.string().optional(),
      callLogId: z.string().optional(),
    }),
  },
  responses: {
    201: { description: 'Session created', schema: z.object({ id: z.string(), url: z.string() }) },
  },
  successStatus: 201,
});

export const getPindropContract = defineContract({
  method: 'get',
  path: '/api/pindrop/{id}',
  summary: 'Get a pindrop session (without access token)',
  tags: ['Pindrop'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Pindrop session', schema: z.object({}).passthrough() },
  },
  successStatus: 200,
});

export const deletePindropContract = defineContract({
  method: 'delete',
  path: '/api/pindrop/{id}',
  summary: 'Delete a pindrop session and its uploaded photos',
  tags: ['Pindrop'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Session deleted', schema: z.object({ deleted: z.boolean() }) },
  },
  successStatus: 200,
});
