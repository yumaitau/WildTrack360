'server-only';

// Shared authorisation guard for custom-QL API routes.
//
// Custom QL returns organisation-wide aggregates, so access is gated on the
// org-level reporting permission (report:view_org). This deliberately keeps
// species-scoped coordinators from reading aggregates across species they are
// not assigned to.

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { hasPermission, getUserRole } from '@/lib/rbac';

export interface QlContext {
  userId: string;
  orgId: string;
}

type GuardResult = { ok: true; ctx: QlContext } | { ok: false; response: NextResponse };

/** Authenticate and authorise the current request for custom-QL access. */
export async function guardQlRequest(): Promise<GuardResult> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const role = await getUserRole(userId, orgId);
  if (!hasPermission(role, 'report:view_org')) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true, ctx: { userId, orgId } };
}
