import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { archiveMember, getMember, updateMember } from '@/lib/members';
import { route } from '@/lib/openapi/route';
import { getMemberContract, updateMemberContract, deleteMemberContract } from './openapi';

export const GET = route(getMemberContract, async ({ params }) => {
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

  const member = await getMember(params.id, orgId);
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  return { data: member };
});

export const PATCH = route(updateMemberContract, async ({ params, body }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try {
    await requirePermission(userId, orgId, 'member:manage');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const member = await updateMember(params.id, orgId, body);
    logAudit({
      userId,
      orgId,
      action: 'UPDATE',
      entity: 'Member',
      entityId: params.id,
      metadata: { fields: Object.keys(body) },
    });
    return { data: member };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update member';
    const status = message === 'Member not found' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
});

export const DELETE = route(deleteMemberContract, async ({ params }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try {
    await requirePermission(userId, orgId, 'member:manage');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await archiveMember(params.id, orgId);
    logAudit({ userId, orgId, action: 'DELETE', entity: 'Member', entityId: params.id });
    return { data: { ok: true } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to archive member';
    return NextResponse.json({ error: message }, { status: 404 });
  }
});
