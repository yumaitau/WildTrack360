import { requireDocsAccess } from '@/lib/openapi-server/docs-access';
import { route } from '@/lib/openapi/route';
import { apiDocsContract } from './openapi';

// SHORTCUT: Scalar loaded from CDN; self-host the bundle if offline/CSP-restricted docs are needed.
const SCALAR_HTML = `<!doctype html>
<html>
  <head>
    <title>WildTrack360 API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="app"></div>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
    <script>
      Scalar.createApiReference('#app', { url: '/api/openapi' })
    </script>
  </body>
</html>`;

// Scalar API reference UI, rendering the spec served at /api/openapi.
// Open in dev; any authenticated user in production (see requireDocsAccess).
export const GET = route(apiDocsContract, async () => {
  const denied = await requireDocsAccess();
  if (denied) return denied;
  return new Response(SCALAR_HTML, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
});
