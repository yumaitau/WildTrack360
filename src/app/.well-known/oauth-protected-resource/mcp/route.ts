import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandlerClerk,
} from '@clerk/mcp-tools/next';

// RFC 9728 OAuth protected resource metadata for the /mcp endpoint. MCP
// clients hit this to discover Clerk as the authorization server. Must stay
// publicly accessible (see isPublicRoute in src/middleware.ts).
const handler = protectedResourceHandlerClerk({
  scopes_supported: ['profile', 'email'],
});
const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
