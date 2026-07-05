import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { verifyClerkToken } from '@clerk/mcp-tools/next';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { extractSubdomain } from '@/lib/subdomain';
import { registerWildTrackTools } from '@/lib/mcp/tools';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

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
  async (req, token) => {
    const clerkAuth = await auth({ acceptsToken: 'oauth_token' });
    const authInfo = verifyClerkToken(clerkAuth, token);
    if (!authInfo) return undefined;

    // Tenant subdomains ({org}.wildtrack360.com.au) pin the MCP session to
    // that org, mirroring the middleware's org_url enforcement for the web
    // app. The subdomain handle maps to an org via OrganisationSettings.orgUrl
    // (same source resolvePublicOrg uses). The mapping is only a *selector* —
    // resolveMcpContext still verifies the user's Clerk membership before any
    // data access, so a spoofed Host header cannot grant access to an org the
    // caller doesn't belong to.
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
    const subdomain = extractSubdomain(host, ROOT_DOMAIN);
    if (!subdomain) return authInfo;

    const settings = await prisma.organisationSettings.findFirst({
      where: { orgUrl: { equals: subdomain, mode: 'insensitive' } },
      select: { clerkOrganisationId: true },
    });
    return {
      ...authInfo,
      extra: {
        ...authInfo.extra,
        subdomain,
        subdomainOrgId: settings?.clerkOrganisationId ?? null,
      },
    };
  },
  {
    required: true,
    resourceMetadataPath: '/.well-known/oauth-protected-resource/mcp',
  }
);

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
