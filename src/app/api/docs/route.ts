import { requireAdmin } from '@/lib/openapi-server/admin-guard';

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

// Admin-only Scalar API reference UI, rendering the spec served at /api/openapi.
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return new Response(SCALAR_HTML, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
