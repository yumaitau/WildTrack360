import { z } from 'zod';
import { defineContract } from '@/lib/openapi/contract';

export const apiOpenApiContract = defineContract({
  method: 'get',
  path: '/api/openapi',
  summary: 'Live OpenAPI 3.1 specification document (open in dev, authenticated in production)',
  tags: ['Documentation'],
  security: 'clerkSession',
  responses: {
    200: { description: 'OpenAPI 3.1 document', schema: z.unknown() },
  },
  successStatus: 200,
});
