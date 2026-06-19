import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { createTier, listTiers } from '@/lib/membership-tiers';
import { route } from '@/lib/openapi/route';
import { listTiersContract, createTierContract } from './openapi';

export const GET = route(listTiersContract, async ({ query }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try { await requirePermission(userId, orgId, 'member:view_all'); }
  catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
  try {
    const tiers = await listTiers(orgId, { includeArchived: query.includeArchived === 'true' });
    return { data: tiers };
  } catch (error) {
    console.error('Error listing tiers:', error);
    return NextResponse.json({ error: 'Failed to list tiers' }, { status: 500 });
  }
});

export const POST = route(createTierContract, async ({ body }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try { await requirePermission(userId, orgId, 'membership:configure'); }
  catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
  try {
    const tier = await createTier(orgId, body);
    logAudit({ userId, orgId, action: 'CREATE', entity: 'MembershipTier', entityId: tier.id, metadata: { name: tier.name, amountCents: tier.amountCents } });
    return { data: tier, status: 201 as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create tier';
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
