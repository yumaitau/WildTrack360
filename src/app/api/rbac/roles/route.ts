import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { listOrgMembers, setUserRole, requirePermission } from '@/lib/rbac';
import type { OrgRole } from '@prisma/client';
import { logAudit } from '@/lib/audit';

// GET /api/rbac/roles — list all role assignments for the org
export async function GET() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await requirePermission(userId, orgId, 'user:manage');
    const members = await listOrgMembers(orgId);
    return NextResponse.json(members);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error listing org members:', error);
    return NextResponse.json({ error: 'Failed to list members' }, { status: 500 });
  }
}

// POST /api/rbac/roles — assign a role to a user
export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await requirePermission(userId, orgId, 'user:manage');

    const body = await request.json();
    const { targetUserId, role } = body as { targetUserId: string; role: OrgRole };

    if (!targetUserId || !role) {
      return NextResponse.json(
        { error: 'targetUserId and role are required' },
        { status: 400 }
      );
    }

    if (!['ADMIN', 'COORDINATOR_ALL', 'COORDINATOR', 'CARER_ALL', 'CARER'].includes(role)) {
      return NextResponse.json(
        { error: 'role must be ADMIN, COORDINATOR_ALL, COORDINATOR, CARER_ALL, or CARER' },
        { status: 400 }
      );
    }

    // Prevent admins from changing their own role
    if (targetUserId === userId) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    // Verify the target user is actually a member of this Clerk organisation
    const client = await clerkClient();
    const memberships = await client.users.getOrganizationMembershipList({
      userId: targetUserId,
    });
    const isMember = memberships.data.some(
      (m: any) => m.organization.id === orgId
    );
    if (!isMember) {
      return NextResponse.json(
        { error: 'Target user is not a member of this organisation' },
        { status: 400 }
      );
    }

    const member = await setUserRole(targetUserId, orgId, role);
    logAudit({ userId, orgId, action: 'ROLE_CHANGE', entity: 'OrgMember', entityId: member.id, metadata: { targetUserId, role } });
    return NextResponse.json(member);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (message === 'Cannot demote the last admin in the organisation') {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error('Error setting role:', error);
    return NextResponse.json({ error: 'Failed to set role' }, { status: 500 });
  }
}
