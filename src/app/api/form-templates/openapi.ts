import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

export const getFormTemplateContract = defineContract({
  method: 'get',
  path: '/api/form-templates/{entityType}',
  summary: 'Get the active form template for an entity type',
  tags: ['Form Templates'],
  security: 'clerkSession',
  request: { params: z.object({ entityType: z.string() }) },
  responses: {
    200: { description: 'Form template (or empty default)', schema: z.object({}).passthrough() },
  },
  successStatus: 200,
});

export const upsertFormTemplateContract = defineContract({
  method: 'put',
  path: '/api/form-templates/{entityType}',
  summary: 'Create or update the form template for an entity type',
  tags: ['Form Templates'],
  security: 'clerkSession',
  request: {
    params: z.object({ entityType: z.string() }),
    body: z.object({}).passthrough(),
  },
  responses: {
    200: { description: 'Saved template', schema: z.object({}).passthrough() },
  },
  successStatus: 200,
});
