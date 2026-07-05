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
 * - if the tool call passes `orgId`, verify the user is a member of it
 *   via Clerk (same gate as ensureUserInOrg used by the REST API)
 * - otherwise fall back to the user's first Clerk organisation
 *
 * The role always comes from WildTrack360's own OrgMember RBAC record.
 */
export async function resolveMcpContext(
  authInfo: AuthInfo | undefined,
  requestedOrgId?: string
): Promise<McpContext> {
  const userId = authInfo?.extra?.userId;
  if (typeof userId !== 'string' || !userId) {
    throw new McpToolError('Unauthorized: no user on OAuth token');
  }

  let orgId: string;
  if (requestedOrgId) {
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
