import { z } from 'zod';
import type { ZodOpenApiPathsObject } from 'zod-openapi';

import { security } from '../security';
import { errorResponses, ok200, mergeResponses, redirect307 } from '../responses';

const SquareConnectionStatus = z
  .object({
    connected: z.boolean(),
    merchantId: z.string().nullable(),
    locationId: z.string().nullable(),
    tokenExpiresAt: z.string().datetime().nullable(),
    revokedAt: z.string().datetime().nullable(),
  })
  .openapi({ ref: 'SquareConnectionStatus' });

const SquareEmbedCredentials = z
  .object({
    applicationId: z.string(),
    locationId: z.string(),
    currency: z.string(),
  })
  .openapi({ ref: 'SquareEmbedCredentials' });

const PaymentEntry = z
  .object({
    id: z.string(),
    memberId: z.string().nullable(),
    kind: z.string(),
    status: z.string(),
    amountCents: z.number().int(),
    currency: z.string(),
    squarePaymentId: z.string().nullable(),
    createdAt: z.string().datetime(),
  })
  .openapi({ ref: 'PaymentEntry' });

const WebhookResult = z
  .object({
    received: z.boolean().optional(),
    processed: z.boolean().optional(),
  })
  .openapi({ ref: 'WebhookResult', description: 'Square webhook dispatch result' });

export const squarePaths: ZodOpenApiPathsObject = {
  '/api/square/oauth/authorize': {
    get: {
      operationId: 'squareOAuthAuthorize',
      tags: ['Payments & Square'],
      summary: 'Redirect the admin to the Square OAuth authorisation page',
      responses: mergeResponses(redirect307('Redirect to Square authorize URL'), errorResponses(401, 403, 404)),
    },
  },

  '/api/square/oauth/callback': {
    get: {
      operationId: 'squareOAuthCallback',
      tags: ['Payments & Square'],
      summary: 'Square OAuth callback - exchanges the authorisation code for tokens',
      security: security.squareOAuthState as unknown as Record<string, string[]>[],
      requestParams: {
        query: z.object({
          code: z.string().optional().openapi({ description: 'Square authorisation code.' }),
          error: z.string().optional().openapi({ description: 'Error from Square if the user denied access.' }),
          state: z.string().optional().openapi({ description: 'Signed state parameter (squareOAuthState).' }),
        }),
      },
      responses: redirect307('Redirect to org settings on success or failure'),
    },
  },

  '/api/square/connection/status': {
    get: {
      operationId: 'getSquareConnectionStatus',
      tags: ['Payments & Square'],
      summary: 'Get the Square OAuth connection status for the organisation',
      responses: mergeResponses(ok200(SquareConnectionStatus), errorResponses(401, 403, 404)),
    },
  },

  '/api/square/connection/disconnect': {
    post: {
      operationId: 'disconnectSquare',
      tags: ['Payments & Square'],
      summary: 'Revoke the Square OAuth connection for the organisation',
      responses: mergeResponses(
        ok200(z.object({ ok: z.boolean() })),
        errorResponses(401, 403, 404, 500),
      ),
    },
  },

  '/api/square/embed': {
    get: {
      operationId: 'getSquareEmbed',
      tags: ['Payments & Square'],
      summary: 'Get Square Web Payments SDK embed credentials for the org checkout',
      responses: mergeResponses(ok200(SquareEmbedCredentials), errorResponses(400, 401, 403, 404, 409)),
    },
  },

  '/api/payments': {
    get: {
      operationId: 'listPayments',
      tags: ['Payments & Square'],
      summary: 'List payments for the organisation',
      requestParams: {
        query: z.object({
          status: z.string().optional().openapi({ description: 'Filter by PaymentStatus.' }),
        }),
      },
      responses: mergeResponses(ok200(z.array(PaymentEntry)), errorResponses(401, 403, 404)),
    },
  },

  '/api/square/webhook': {
    post: {
      operationId: 'squareWebhook',
      tags: ['Payments & Square'],
      summary: 'Square webhook receiver',
      description:
        'Receives Square event notifications. The HMAC-SHA256 signature in ' +
        'x-square-hmacsha256-signature is verified against the raw request body before dispatch. ' +
        'Configure SQUARE_WEBHOOK_NOTIFICATION_URL to the exact URL registered in the Square dashboard.',
      security: security.squareWebhookSignature as unknown as Record<string, string[]>[],
      requestBody: {
        description: 'Square event payload (raw body used for HMAC verification)',
        content: { 'application/json': { schema: z.record(z.unknown()).openapi({ description: 'Square event object' }) } },
        required: true,
      },
      responses: mergeResponses(
        ok200(WebhookResult, 'Event received and dispatched'),
        errorResponses(400, 500),
      ),
    },
  },
};
