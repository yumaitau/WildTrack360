import { z } from 'zod';
import { defineContract } from '@/lib/openapi/contract';

// All internal routes keep their own authorised()/bearer-check in the handler.
// The internalSecret declaration here is for OpenAPI documentation only.

export const internalHealthContract = defineContract({
  method: 'get',
  path: '/api/internal/health',
  summary: 'Database health check',
  tags: ['Internal'],
  security: 'internalSecret',
  responses: {
    200: { description: 'Healthy', schema: z.object({ status: z.string() }) },
    503: { description: 'Unhealthy', schema: z.object({ status: z.string(), message: z.string() }) },
  },
  successStatus: 200,
});

const membershipLifecycleResponseSchema = z.object({}).passthrough().openapi('MembershipLifecycleResult');

export const membershipLifecycleGetContract = defineContract({
  method: 'get',
  path: '/api/internal/membership-lifecycle',
  summary: 'Run membership lifecycle job (GET trigger, bearer auth)',
  tags: ['Internal'],
  security: 'internalSecret',
  responses: {
    200: { description: 'Job result', schema: membershipLifecycleResponseSchema },
  },
  successStatus: 200,
});

export const membershipLifecyclePostContract = defineContract({
  method: 'post',
  path: '/api/internal/membership-lifecycle',
  summary: 'Run membership lifecycle job (POST trigger, bearer auth)',
  tags: ['Internal'],
  security: 'internalSecret',
  responses: {
    200: { description: 'Job result', schema: membershipLifecycleResponseSchema },
  },
  successStatus: 200,
});

const nswRemindersResponseSchema = z.object({}).passthrough().openapi('NswRemindersResult');

export const nswRemindersGetContract = defineContract({
  method: 'get',
  path: '/api/internal/nsw-reminders',
  summary: 'Send due NSW reminder notifications (GET trigger, bearer auth)',
  tags: ['Internal'],
  security: 'internalSecret',
  responses: {
    200: { description: 'Job result', schema: nswRemindersResponseSchema },
  },
  successStatus: 200,
});

export const nswRemindersPostContract = defineContract({
  method: 'post',
  path: '/api/internal/nsw-reminders',
  summary: 'Send due NSW reminder notifications (POST trigger, bearer auth)',
  tags: ['Internal'],
  security: 'internalSecret',
  responses: {
    200: { description: 'Job result', schema: nswRemindersResponseSchema },
  },
  successStatus: 200,
});

export const internalPingContract = defineContract({
  method: 'get',
  path: '/api/internal/ping',
  summary: 'Simple ping - always returns ok',
  tags: ['Internal'],
  security: 'internalSecret',
  responses: {
    200: { description: 'Pong', schema: z.object({ status: z.string() }) },
  },
  successStatus: 200,
});
