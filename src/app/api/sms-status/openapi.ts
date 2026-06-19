import { z } from 'zod';
import { defineContract } from '@/lib/openapi/contract';

export const smsStatusContract = defineContract({
  method: 'get',
  path: '/api/sms-status',
  summary: 'Check whether SMS is enabled for the active org',
  tags: ['SMS'],
  security: 'clerkSession',
  responses: {
    200: { description: 'SMS status', schema: z.object({ enabled: z.boolean() }) },
  },
  successStatus: 200,
});
