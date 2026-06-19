import { z } from 'zod';
import { defineContract } from '@/lib/openapi/contract';

export const getMyFeaturesContract = defineContract({
  method: 'get',
  path: '/api/features/me',
  summary: 'Get the feature flags enabled for the active org',
  tags: ['Features'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Feature flag map', schema: z.record(z.string(), z.boolean()) },
  },
  successStatus: 200,
});
