import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

const NewsPostSchema = z.object({}).passthrough().openapi('NewsPost');
const NewsPostBodySchema = z.object({}).passthrough().openapi('NewsPostBody');

const PublishBodySchema = z
  .object({ sendEmail: z.boolean().optional(), unpublish: z.boolean().optional() })
  .openapi('NewsPublishBody');

const PublishResponseSchema = z
  .object({ post: NewsPostSchema, emailed: z.number() })
  .openapi('NewsPublishResponse');

export const listNewsContract = defineContract({
  method: 'get',
  path: '/api/news',
  summary: 'List news posts',
  tags: ['News'],
  security: 'clerkSession',
  responses: {
    200: { description: 'News post list', schema: z.array(NewsPostSchema) },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
  successStatus: 200,
});

export const createNewsContract = defineContract({
  method: 'post',
  path: '/api/news',
  summary: 'Create a news post',
  tags: ['News'],
  security: 'clerkSession',
  request: { body: NewsPostBodySchema },
  responses: {
    201: { description: 'Created post', schema: NewsPostSchema },
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
  successStatus: 201,
});

export const getNewsPostContract = defineContract({
  method: 'get',
  path: '/api/news/{id}',
  summary: 'Get a news post',
  tags: ['News'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'The news post', schema: NewsPostSchema },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const updateNewsPostContract = defineContract({
  method: 'patch',
  path: '/api/news/{id}',
  summary: 'Update a news post',
  tags: ['News'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }), body: NewsPostBodySchema },
  responses: {
    200: { description: 'Updated post', schema: NewsPostSchema },
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const deleteNewsPostContract = defineContract({
  method: 'delete',
  path: '/api/news/{id}',
  summary: 'Delete a news post',
  tags: ['News'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Deleted', schema: z.object({ ok: z.boolean() }).openapi('NewsPostDeleted') },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const publishNewsPostContract = defineContract({
  method: 'post',
  path: '/api/news/{id}/publish',
  summary: 'Publish or unpublish a news post',
  tags: ['News'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }), body: PublishBodySchema },
  responses: {
    200: { description: 'Publish result', schema: PublishResponseSchema },
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});
