import 'server-only';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';

/**
 * Access policy for the API docs routes (/api/docs, /api/openapi):
 *   - development / test: open to everyone (no auth) for local convenience.
 *   - production: any authenticated Clerk session (no role requirement).
 *
 * Returns a NextResponse to short-circuit with, or null to allow. Lives under
 * src/lib/openapi-server/ (not src/lib/openapi/) because it imports 'server-only'
 * via @/lib/clerk-server, keeping it off-limits to the pure route contracts.
 */
export async function requireDocsAccess(): Promise<NextResponse | null> {
  if (process.env.NODE_ENV !== 'production') return null;
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
