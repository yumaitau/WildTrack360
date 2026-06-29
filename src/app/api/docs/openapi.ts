import { z } from 'zod';
import { defineContract } from '@/lib/openapi/contract';

export const apiDocsContract = defineContract({
  method: 'get',
  path: '/api/docs',
  summary: 'Scalar API reference UI (open in dev, authenticated in production)',
  tags: ['Documentation'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Scalar HTML page', schema: z.unknown(), content: 'text/html' },
  },
  successStatus: 200,
});
