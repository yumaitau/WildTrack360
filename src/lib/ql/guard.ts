'server-only';

// Shared authorisation guard for custom-QL API routes.
//
// Custom QL returns organisation-wide aggregates, so access is limited to roles
// with org-wide visibility (ADMIN and COORDINATOR_ALL). This deliberately keeps
// species-scoped coordinators and carers from reading aggregates across data
// they are not otherwise entitled to see.

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserRole } from '@/lib/rbac';
import { canUseCustomReports } from './access';

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
  if (!canUseCustomReports(role)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true, ctx: { userId, orgId } };
}
