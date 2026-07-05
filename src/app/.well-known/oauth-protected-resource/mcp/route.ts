import { generateClerkProtectedResourceMetadata, corsHeaders } from '@clerk/mcp-tools/server';
import { metadataCorsOptionsRequestHandler } from '@clerk/mcp-tools/next';

// RFC 9728 OAuth protected resource metadata for the /mcp endpoint. MCP
// clients hit this to discover Clerk as the authorization server. Must stay
// publicly accessible (see isPublicRoute in src/middleware.ts).
//
// Hand-rolled instead of Clerk's protectedResourceHandlerClerk because that
// helper derives the resource origin from req.url, which Next can normalise
// to the server's internal origin. The app serves each tenant on its own
// subdomain ({org}.wildtrack360.com.au), and clients validate that `resource`
// matches the host they connected to — so derive the public origin from the
// forwarded/host headers instead.
function publicOrigin(req: Request): string {
  const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const host = forwardedHost || req.headers.get('host');
  if (!host) return new URL(req.url).origin;
  const proto =
    forwardedProto ||
    (host.startsWith('localhost') || host.includes('.localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

function handler(req: Request): Response {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error('Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY environment variable');
  }
  const metadata = generateClerkProtectedResourceMetadata({
    publishableKey,
    resourceUrl: publicOrigin(req),
    properties: { scopes_supported: ['profile', 'email'] },
  });
  return Response.json(metadata, {
    headers: {
      'Cache-Control': 'max-age=3600',
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
