import { z } from 'zod';
import { defineContract } from '@/lib/openapi/contract';

export const squareConnectionStatusContract = defineContract({
  method: 'get',
  path: '/api/square/connection/status',
  summary: 'Get the Square OAuth connection status for this org',
  tags: ['Square'],
  security: 'clerkSession',
  responses: {
    200: {
      description: 'Connection status',
      schema: z.object({
        connected: z.boolean(),
        revoked: z.boolean(),
        merchantId: z.string().nullable(),
        locationId: z.string().nullable(),
        connectedAt: z.string().nullable(),
      }),
    },
  },
  successStatus: 200,
});

export const squareDisconnectContract = defineContract({
  method: 'post',
  path: '/api/square/connection/disconnect',
  summary: 'Revoke the Square OAuth connection for this org',
  tags: ['Square'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Connection revoked', schema: z.object({ ok: z.boolean() }) },
  },
  successStatus: 200,
});

export const squareEmbedContract = defineContract({
  method: 'get',
  path: '/api/square/embed',
  summary: 'Get public embed URLs for this org (donate/join buttons) and sync orgUrl',
  tags: ['Square'],
  security: 'clerkSession',
  responses: {
    200: {
      description: 'Embed URLs',
      schema: z.object({
        handle: z.string(),
        baseUrl: z.string(),
        donateUrl: z.string(),
        joinUrl: z.string(),
      }),
    },
  },
  successStatus: 200,
});

export const squareOAuthAuthorizeContract = defineContract({
  method: 'get',
  path: '/api/square/oauth/authorize',
  summary: 'Initiate Square OAuth - redirects admin to Square authorization page (302)',
  tags: ['Square'],
  security: 'clerkSession',
  responses: {
    302: {
      description: 'Redirect to Square authorization page',
      schema: z.unknown().openapi('SquareAuthorizeRedirect'),
      content: 'text/plain',
    },
  },
  successStatus: 200,
});

export const squareOAuthCallbackContract = defineContract({
  method: 'get',
  path: '/api/square/oauth/callback',
  summary: 'Square OAuth callback - exchanges code, stores connection, redirects to org settings (302)',
  tags: ['Square'],
  security: 'public',
  responses: {
    302: {
      description: 'Redirect to org settings (with ?ok=1 on success or ?error=... on failure)',
      schema: z.unknown().openapi('SquareCallbackRedirect'),
      content: 'text/plain',
    },
  },
  successStatus: 200,
});

export const squareWebhookContract = defineContract({
  method: 'post',
  path: '/api/square/webhook',
  summary: 'Square webhook receiver - HMAC-verified raw body, dispatches payment events',
  tags: ['Square'],
  security: 'squareSignature',
  responses: {
    200: { description: 'Event dispatched', schema: z.object({}).passthrough() },
  },
  successStatus: 200,
});
