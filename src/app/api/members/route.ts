import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { createMember, listMembers } from '@/lib/members';
import { route } from '@/lib/openapi/route';
import { listMembersContract, createMemberContract } from './openapi';

export const GET = route(listMembersContract, async ({ query }) => {
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

  const { search, status, includeArchived: includeArchivedStr, limit: limitStr } = query;
  const includeArchived = includeArchivedStr === 'true';
  const limitParam = Number(limitStr);
  const limit = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(limitParam, 5000)
    : 5000;

  try {
    const members = await listMembers(orgId, { search, status, includeArchived, limit });
    return { data: members };
  } catch (error) {
    console.error('Error listing members:', error);
    return NextResponse.json({ error: 'Failed to list members' }, { status: 500 });
  }
});

export const POST = route(createMemberContract, async ({ body }) => {
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
    const member = await createMember(orgId, body);
    logAudit({
      userId,
      orgId,
      action: 'CREATE',
      entity: 'Member',
      entityId: member.id,
      metadata: { email: member.email },
    });
    return { data: member, status: 201 };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create member';
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
