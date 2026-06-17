import { z } from 'zod';
import type { ZodOpenApiPathsObject } from 'zod-openapi';
import { errorResponses, ok200 } from '../responses';
import { security } from '../security';

const cronSecurity = security.cronSecret as unknown as Record<string, string[]>[];

export const internalPaths: ZodOpenApiPathsObject = {

  '/api/internal/health': {
    get: {
      tags: ['Internal & Cron'],
      summary: 'Health check - verifies database connectivity',
      operationId: 'internalHealth',
      security: [],
      responses: {
        ...ok200(z.object({ status: z.enum(['ok', 'error']), message: z.string().optional() })),
        '503': { description: 'Service unavailable - database connection failed' },
      },
    },
  },

  '/api/internal/ping': {
    get: {
      tags: ['Internal & Cron'],
      summary: 'Liveness probe - returns 200 immediately',
      operationId: 'internalPing',
      security: [],
      responses: {
        ...ok200(z.object({ status: z.literal('ok') })),
      },
    },
  },

  '/api/internal/membership-lifecycle': {
    get: {
      tags: ['Internal & Cron'],
      summary: 'Dry-run membership lifecycle sweep (preview expiring memberships)',
      operationId: 'membershipLifecycleDryRun',
      security: cronSecurity,
      responses: {
        ...ok200(z.unknown().openapi({ description: 'Preview of memberships that would be processed.' })),
        ...errorResponses(401),
      },
    },
    post: {
      tags: ['Internal & Cron'],
      summary: 'Run membership lifecycle sweep (expire and send renewal notifications)',
      operationId: 'membershipLifecycleRun',
      security: cronSecurity,
      responses: {
        ...ok200(z.unknown().openapi({ description: 'Summary of processed memberships and notifications sent.' })),
        ...errorResponses(401),
      },
    },
  },

  '/api/internal/nsw-reminders': {
    get: {
      tags: ['Internal & Cron'],
      summary: 'Dry-run NSW compliance reminder sweep',
      operationId: 'nswRemindersDryRun',
      security: cronSecurity,
      responses: {
        ...ok200(z.unknown().openapi({ description: 'Preview of reminders that would be sent.' })),
        ...errorResponses(401),
      },
    },
    post: {
      tags: ['Internal & Cron'],
      summary: 'Send NSW compliance reminders',
      operationId: 'nswRemindersRun',
      security: cronSecurity,
      responses: {
        ...ok200(z.unknown().openapi({ description: 'Summary of reminders sent.' })),
        ...errorResponses(401),
      },
    },
  },

  '/api/keepalive': {
    get: {
      tags: ['Internal & Cron'],
      summary: 'Keep the Vercel serverless instance warm',
      operationId: 'keepalive',
      security: security.keepaliveApiKey as unknown as Record<string, string[]>[],
      responses: {
        ...ok200(z.object({ status: z.literal('ok'), timestamp: z.string() })),
        ...errorResponses(401, 500),
      },
    },
  },

  '/api/sms-status': {
    get: {
      tags: ['Internal & Cron'],
      summary: 'Get SMS subscription status for the organisation',
      operationId: 'smsStatus',
      responses: {
        ...ok200(z.object({ enabled: z.boolean() })),
        ...errorResponses(401),
      },
    },
  },
};
