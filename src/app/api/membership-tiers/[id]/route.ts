import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { archiveTier, updateTier } from '@/lib/membership-tiers';
import { route } from '@/lib/openapi/route';
import { updateTierContract, deleteTierContract } from '../openapi';

export const PATCH = route(updateTierContract, async ({ params, body }) => {
  const { id } = params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try { await requirePermission(userId, orgId, 'membership:configure'); }
  catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
  try {
    const tier = await updateTier(id, orgId, body);
    logAudit({ userId, orgId, action: 'UPDATE', entity: 'MembershipTier', entityId: id, metadata: { fields: Object.keys(body) } });
    return { data: tier };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update tier';
    const status = message === 'Tier not found' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
});

export const DELETE = route(deleteTierContract, async ({ params }) => {
  const { id } = params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try { await requirePermission(userId, orgId, 'membership:configure'); }
  catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
  try {
    await archiveTier(id, orgId);
    logAudit({ userId, orgId, action: 'DELETE', entity: 'MembershipTier', entityId: id });
    return { data: { ok: true } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to archive tier';
    return NextResponse.json({ error: message }, { status: 404 });
  }
});
