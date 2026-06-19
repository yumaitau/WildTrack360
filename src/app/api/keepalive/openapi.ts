import { z } from 'zod';
import { defineContract } from '@/lib/openapi/contract';

export const keepaliveContract = defineContract({
  method: 'get',
  path: '/api/keepalive',
  summary: 'DB keepalive ping - x-api-key header required',
  tags: ['Internal'],
  security: 'internalSecret',
  responses: {
    200: { description: 'DB is alive', schema: z.object({ status: z.string(), timestamp: z.unknown() }) },
  },
  successStatus: 200,
});
