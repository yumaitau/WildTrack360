import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { buildAuthorizeUrl, createOAuthState } from '@/lib/square/oauth';
import { route } from '@/lib/openapi/route';
import { squareOAuthAuthorizeContract } from '../../openapi';

export const GET = route(squareOAuthAuthorizeContract, async () => {
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
});
