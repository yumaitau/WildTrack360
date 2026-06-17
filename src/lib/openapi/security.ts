/**
 * OpenAPI security scheme definitions and per-operation helpers.
 * All schemes are raw OpenAPI 3.1 objects - not zod types.
 */

export const securitySchemes = {
  /** Default: Clerk session cookie. Most /api/* routes use this. */
  clerkSession: {
    type: 'apiKey' as const,
    in: 'cookie' as const,
    name: '__session',
    description:
      'Clerk session cookie. Multi-tenant: subdomain -> org_url session claim. ' +
      'Absent or invalid -> 401. Org mismatch or missing permission -> 403.',
  },

  /** Clerk session token via Authorization: Bearer (native/mobile clients). */
  clerkBearer: {
    type: 'http' as const,
    scheme: 'bearer' as const,
    bearerFormat: 'JWT' as const,
    description:
      'Clerk session token sent as "Authorization: Bearer <token>". Equivalent to the __session cookie; ' +
      'used by native/mobile clients. Absent or invalid -> 401.',
  },

  /** internal/* cron routes: Authorization: Bearer ${CRON_SECRET} */
  cronSecret: {
    type: 'http' as const,
    scheme: 'bearer' as const,
    description: 'Bearer CRON_SECRET environment variable. Required on all /api/internal/* routes.',
  },

  /** Square webhook HMAC signature header */
  squareWebhookSignature: {
    type: 'apiKey' as const,
    in: 'header' as const,
    name: 'x-square-hmacsha256-signature',
    description: 'Square HMAC-SHA256 webhook signature verified in-handler against the raw body.',
  },

  /** Square OAuth callback signed-state parameter */
  squareOAuthState: {
    type: 'apiKey' as const,
    in: 'query' as const,
    name: 'state',
    description: 'Square OAuth signed state parameter; verified against a server-side nonce on callback.',
  },

  /** Keepalive endpoint: x-api-key header matching KEEPALIVE_API_KEY env var */
  keepaliveApiKey: {
    type: 'apiKey' as const,
    in: 'header' as const,
    name: 'x-api-key',
    description: 'API key for the keepalive endpoint. Matches KEEPALIVE_API_KEY env var (timing-safe compare).',
  },

  /**
   * PIN-access routes (/api/pin/*, /api/pindrop/*).
   * Public routes (Clerk-bypassed); a PIN token is embedded in the path or request.
   */
  pinAccess: {
    type: 'apiKey' as const,
    in: 'query' as const,
    name: 'pin',
    description: 'PIN-access token for public animal record lookup routes (no Clerk session required).',
  },
};

/** Per-operation security requirements */
export const security = {
  /** Default Clerk session (most /api/* routes): __session cookie OR Authorization: Bearer token */
  clerkSession: [{ clerkSession: [] }, { clerkBearer: [] }] as const,
  /** Internal cron routes */
  cronSecret: [{ cronSecret: [] }] as const,
  /** Square webhook */
  squareWebhookSignature: [{ squareWebhookSignature: [] }] as const,
  /** Square OAuth callback */
  squareOAuthState: [{ squareOAuthState: [] }] as const,
  /** Keepalive x-api-key header */
  keepaliveApiKey: [{ keepaliveApiKey: [] }] as const,
  /** PIN-access public routes */
  pinAccess: [{ pinAccess: [] }] as const,
  /** Unauthenticated public routes (security: []) */
  public: [] as const,
};
