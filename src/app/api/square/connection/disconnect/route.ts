import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { revokeConnection } from '@/lib/square/oauth';
import { route } from '@/lib/openapi/route';
import { squareDisconnectContract } from '../../openapi';

export const POST = route(squareDisconnectContract, async () => {
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

  try {
    await revokeConnection(orgId);
    logAudit({ userId, orgId, action: 'DELETE', entity: 'SquareConnection', entityId: orgId, metadata: { action: 'disconnect' } });
    return { data: { ok: true } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to disconnect';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
