import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { createMember, listMembers } from '@/lib/members';
import type { MemberStatus } from '@prisma/client';

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

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') ?? undefined;
  const status = (searchParams.get('status') ?? undefined) as MemberStatus | undefined;
  const includeArchived = searchParams.get('includeArchived') === 'true';
  const limitParam = Number(searchParams.get('limit'));
  const limit = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(limitParam, 5000)
    : 5000;

  try {
    const members = await listMembers(orgId, { search, status, includeArchived, limit });
    return NextResponse.json(members);
  } catch (error) {
    console.error('Error listing members:', error);
    return NextResponse.json({ error: 'Failed to list members' }, { status: 500 });
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
    await requirePermission(userId, orgId, 'member:manage');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const member = await createMember(orgId, body);
    logAudit({
      userId,
      orgId,
      action: 'CREATE',
      entity: 'Member',
      entityId: member.id,
      metadata: { email: member.email },
    });
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create member';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
