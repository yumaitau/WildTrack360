import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { buildAuthorizeUrl, createOAuthState } from '@/lib/square/oauth';

// Kick off Square OAuth: redirect the admin to Square's authorize page. The org
// id is carried as a SIGNED `state` so the callback (on a single canonical host)
// can recover it without a session. This route is auth-gated, so only an
// authorised admin can mint a valid state. The admin settings page links here.
export async function GET() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try {
    await requirePermission(userId, orgId, 'settings:manage');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.redirect(buildAuthorizeUrl(await createOAuthState(orgId)));
}
