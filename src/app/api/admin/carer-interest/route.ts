import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { isForbiddenError, requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { listCarerInterests, updateCarerInterestStatus } from '@/lib/carer-interest';
import type { CarerInterestStatus } from '@prisma/client';

const STATUSES: CarerInterestStatus[] = ['NEW', 'CONTACTED', 'APPROVED', 'DECLINED'];

export async function GET() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try {
    await requirePermission(userId, orgId, 'member:view_all');
  } catch (error) {
    if (isForbiddenError(error)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    throw error;
  }
  const interests = await listCarerInterests(orgId);
  return NextResponse.json({ interests });
}

export async function PATCH(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try {
    await requirePermission(userId, orgId, 'member:manage');
  } catch (error) {
    if (isForbiddenError(error)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    throw error;
  }

  try {
    const body = (await request.json()) as { id?: string; status?: string };
    if (!body.id || !body.status || !STATUSES.includes(body.status as CarerInterestStatus)) {
      return NextResponse.json({ error: 'id and a valid status are required' }, { status: 400 });
    }
    await updateCarerInterestStatus(orgId, body.id, body.status as CarerInterestStatus);
    logAudit({
      userId,
      orgId,
      action: 'UPDATE',
      entity: 'CarerInterest',
      entityId: body.id,
      metadata: { status: body.status },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
