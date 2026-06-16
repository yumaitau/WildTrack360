import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { createTier, listTiers } from '@/lib/membership-tiers';

export async function GET(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try {
    await requirePermission(userId, orgId, 'member:view_all');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const includeArchived = new URL(request.url).searchParams.get('includeArchived') === 'true';
  try {
    const tiers = await listTiers(orgId, { includeArchived });
    return NextResponse.json(tiers);
  } catch (error) {
    console.error('Error listing tiers:', error);
    return NextResponse.json({ error: 'Failed to list tiers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try {
    await requirePermission(userId, orgId, 'membership:configure');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const tier = await createTier(orgId, body);
    logAudit({
      userId,
      orgId,
      action: 'CREATE',
      entity: 'MembershipTier',
      entityId: tier.id,
      metadata: { name: tier.name, amountCents: tier.amountCents },
    });
    return NextResponse.json(tier, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create tier';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
