import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { getConnection } from '@/lib/square/oauth';

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

  const conn = await getConnection(orgId);
  return NextResponse.json({
    connected: Boolean(conn && !conn.revokedAt),
    revoked: Boolean(conn?.revokedAt),
    merchantId: conn?.merchantId ?? null,
    locationId: conn?.locationId ?? null,
    connectedAt: conn?.connectedAt ?? null,
  });
}
