import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@/lib/clerk-server';
import { listOrgMembers, setUserRole, requirePermission } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';
import { route } from '@/lib/openapi/route';
import { listRolesContract, setRoleContract } from '../openapi';

export const GET = route(listRolesContract, async () => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await requirePermission(userId, orgId, 'user:manage');
    const members = await listOrgMembers(orgId);
    return { data: members };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Error listing org members:', error);
    return NextResponse.json({ error: 'Failed to list members' }, { status: 500 });
  }
});

export const POST = route(setRoleContract, async ({ body }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await requirePermission(userId, orgId, 'user:manage');

    const { targetUserId, role } = body;

    if (targetUserId === userId) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
    }

    const client = await clerkClient();
    const memberships = await client.users.getOrganizationMembershipList({ userId: targetUserId });
    const isMember = memberships.data.some((m: { organization: { id: string } }) => m.organization.id === orgId);
    if (!isMember) {
      return NextResponse.json({ error: 'Target user is not a member of this organisation' }, { status: 400 });
    }

    const member = await setUserRole(targetUserId, orgId, role);
    logAudit({ userId, orgId, action: 'ROLE_CHANGE', entity: 'OrgMember', entityId: member.id, metadata: { targetUserId, role } });
    return { data: member };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (message === 'Cannot demote the last admin in the organisation') {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error('Error setting role:', error);
    return NextResponse.json({ error: 'Failed to set role' }, { status: 500 });
  }
});
