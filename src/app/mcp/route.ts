import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { verifyClerkToken } from '@clerk/mcp-tools/next';
import { auth } from '@clerk/nextjs/server';
import { registerWildTrackTools } from '@/lib/mcp/tools';

// MCP server over the Streamable HTTP transport at POST /mcp.
//
// Auth is Clerk OAuth (RFC 9728 discovery via /.well-known/*), NOT the Clerk
// session cookie — MCP clients (Claude, ChatGPT, Cursor, ...) register via
// dynamic client registration and send a Bearer access token. That is why
// this route imports `auth` from @clerk/nextjs/server directly instead of
// the @/lib/clerk-server shim: it must run with acceptsToken: 'oauth_token',
// and the route is never exercised in screenshot/demo mode.
const handler = createMcpHandler(
  (server) => {
    registerWildTrackTools(server);
  },
  {
    serverInfo: { name: 'wildtrack360', version: '1.0.0' },
  },
  {
    basePath: '',
    maxDuration: 60,
    disableSse: true,
  }
);

const authHandler = withMcpAuth(
  handler,
  async (_req, token) => {
    const clerkAuth = await auth({ acceptsToken: 'oauth_token' });
    return verifyClerkToken(clerkAuth, token);
  },
  {
    required: true,
    resourceMetadataPath: '/.well-known/oauth-protected-resource/mcp',
  }
);

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
