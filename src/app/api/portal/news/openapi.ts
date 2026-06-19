import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';
import { isoDate } from '../openapi';

const PortalNewsPostSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    body: z.string(),
    authorName: z.string().nullable(),
    publishedAt: isoDate().nullable(),
  })
  .openapi('PortalNewsPost');

export const listPortalNewsContract = defineContract({
  method: 'get',
  path: '/api/portal/news',
  summary: 'List published news posts for the member',
  tags: ['Portal'],
  security: 'clerkSession',
  responses: {
    200: { description: 'News post list', schema: z.array(PortalNewsPostSchema) },
    401: { description: 'Unauthorized' },
    404: { description: 'No membership or feature not enabled' },
  },
  successStatus: 200,
});
