import { extendZodWithOpenApi, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Extend Zod with `.openapi()` exactly once, before any schema uses it. Modules
// that build contracts must import `z` from THIS module (not 'zod' directly) so
// the extension is guaranteed to have run.
extendZodWithOpenApi(z);

export { z };

/** The single registry every route contract registers its path + schemas into. */
export const registry = new OpenAPIRegistry();

/**
 * Security schemes referenced by route contracts. Animals (Phase 0) use
 * `clerkSession`; `internalSecret` and `squareSignature` are registered now so
 * later-phase domains (internal/cron, Square webhooks) reuse them.
 */
export const clerkSession = registry.registerComponent('securitySchemes', 'clerkSession', {
  type: 'http',
  scheme: 'bearer',
  description:
    'Clerk session auth. In the browser the `__session` cookie is sent automatically; for the try-it client paste a session JWT as a bearer token.',
});

export const internalSecret = registry.registerComponent('securitySchemes', 'internalSecret', {
  type: 'apiKey',
  in: 'header',
  name: 'x-internal-secret',
  description: 'Shared secret for internal / scheduled (cron) endpoints.',
});

export const squareSignature = registry.registerComponent('securitySchemes', 'squareSignature', {
  type: 'apiKey',
  in: 'header',
  name: 'x-square-hmacsha256-signature',
  description: 'Square webhook HMAC-SHA256 signature.',
});
