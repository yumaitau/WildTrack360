'server-only';

// Auth + RBAC helpers for the custom reporting endpoints.
//
// Mapping to WildTrack360 roles:
//   * Preview / list / save  → requires `report:view_species`
//     (COORDINATOR, COORDINATOR_ALL, ADMIN). Carers, who can only see their own
//     animals, are intentionally excluded from org-wide aggregate reporting.
//   * Edit / delete / dashboard toggle → the query's creator, or any
//     COORDINATOR-or-above (coordinator/admin equivalent).

import { auth } from '@/lib/clerk-server';
import { getUserRole, hasPermission, hasMinimumRole } from '@/lib/rbac';
import type { OrgRole } from '@prisma/client';

export interface ReportAuth {
  userId: string;
  orgId: string;
  role: OrgRole;
}

export class ReportAccessError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ReportAccessError';
  }
}

/** Resolve the authenticated user + their effective org + role, or throw. */
export async function authenticateReportUser(): Promise<ReportAuth> {
  const { userId, orgId } = await auth();
  if (!userId) throw new ReportAccessError(401, 'Unauthorized');
  if (!orgId) throw new ReportAccessError(400, 'Organization ID is required');
  const role = await getUserRole(userId, orgId);
  return { userId, orgId, role };
}

export function canPreviewReports(role: OrgRole): boolean {
  return hasPermission(role, 'report:view_species');
}

export function canSaveReports(role: OrgRole): boolean {
  return hasPermission(role, 'report:view_species');
}

/** True if the user may edit/delete/toggle a specific saved query. */
export function canManageReport(
  auth: Pick<ReportAuth, 'userId' | 'role'>,
  query: { createdByUserId: string }
): boolean {
  if (query.createdByUserId === auth.userId) return true;
  return hasMinimumRole(auth.role, 'COORDINATOR');
}
