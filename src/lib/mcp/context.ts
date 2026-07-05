import 'server-only';

import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { OrgRole } from '@prisma/client';
import { getUserRole, hasPermission, type Permission } from '@/lib/rbac';
import { ensureUserInOrg, getFirstUserOrgId } from '@/lib/authz';

export interface McpContext {
  userId: string;
  orgId: string;
  role: OrgRole;
}

/**
 * Thrown by MCP tool implementations for expected, user-facing failures
 * (bad input, missing access). The message is safe to surface to the client.
 */
export class McpToolError extends Error {}

/**
 * Resolve the authenticated MCP caller into a WildTrack360 tenant context.
 *
 * The Clerk OAuth access token carries only the user identity (no active
 * organisation, unlike a session token), so the org is resolved here:
 *
 * - Connected via a tenant subdomain ({org}.wildtrack360.com.au/mcp): the
 *   route handler resolves the subdomain to an org (OrganisationSettings.orgUrl)
 *   and stashes it on authInfo.extra. The context is pinned to that org —
 *   mirroring the middleware's org_url enforcement for the web app — and a
 *   conflicting explicit orgId is rejected.
 * - Connected via the root domain: an explicit `orgId` tool argument is
 *   honoured, otherwise the user's first Clerk organisation is used.
 *
 * Membership is always verified via Clerk (ensureUserInOrg), and the role
 * always comes from WildTrack360's own OrgMember RBAC record.
 */
export async function resolveMcpContext(
  authInfo: AuthInfo | undefined,
  requestedOrgId?: string
): Promise<McpContext> {
  const userId = authInfo?.extra?.userId;
  if (typeof userId !== 'string' || !userId) {
    throw new McpToolError('Unauthorized: no user on OAuth token');
  }

  const subdomain =
    typeof authInfo?.extra?.subdomain === 'string' ? authInfo.extra.subdomain : null;
  const subdomainOrgId =
    typeof authInfo?.extra?.subdomainOrgId === 'string' ? authInfo.extra.subdomainOrgId : null;

  let orgId: string;
  if (subdomain) {
    if (!subdomainOrgId) {
      throw new McpToolError(`Unknown organisation subdomain "${subdomain}"`);
    }
    if (requestedOrgId && requestedOrgId !== subdomainOrgId) {
      throw new McpToolError(
        "Forbidden: this MCP endpoint is pinned to its subdomain's organisation; omit orgId or connect via the root domain"
      );
    }
    try {
      orgId = await ensureUserInOrg(userId, subdomainOrgId);
    } catch {
      throw new McpToolError(`Forbidden: you are not a member of the "${subdomain}" organisation`);
    }
  } else if (requestedOrgId) {
    try {
      orgId = await ensureUserInOrg(userId, requestedOrgId);
    } catch {
      throw new McpToolError('Forbidden: you are not a member of that organisation');
    }
  } else {
    const firstOrgId = await getFirstUserOrgId(userId);
    if (!firstOrgId) {
      throw new McpToolError('You are not a member of any organisation');
    }
    orgId = firstOrgId;
  }

  const role = await getUserRole(userId, orgId);
  return { userId, orgId, role };
}

/** Throw a safe McpToolError unless the caller's role grants the permission. */
export function requireMcpPermission(context: McpContext, permission: Permission): void {
  if (!hasPermission(context.role, permission)) {
    throw new McpToolError(
      `Forbidden: your role (${context.role}) lacks the ${permission} permission`
    );
  }
}
