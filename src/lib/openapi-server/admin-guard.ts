import 'server-only';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getUserRole } from '@/lib/rbac';

/**
 * Gate a route to ADMIN org members. Returns a NextResponse to short-circuit
 * with (401 unauthenticated, 403 non-admin), or null when the caller is an admin.
 *
 * Lives under src/lib/openapi-server/ (NOT src/lib/openapi/) because it imports
 * 'server-only' via @/lib/rbac - keeping it out of the openapi/ tree ensures a
 * pure route contract can never accidentally import it and break the tsx CI script.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = await getUserRole(userId, orgId);
  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
