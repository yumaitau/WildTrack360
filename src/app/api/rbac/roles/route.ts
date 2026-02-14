import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listOrgMembers, setUserRole, requirePermission } from '@/lib/rbac';
import type { OrgRole } from '@prisma/client';

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

    if (!['ADMIN', 'COORDINATOR', 'CARER'].includes(role)) {
      return NextResponse.json(
        { error: 'role must be ADMIN, COORDINATOR, or CARER' },
        { status: 400 }
      );
    }

    const member = await setUserRole(targetUserId, orgId, role);
    return NextResponse.json(member);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error setting role:', error);
    return NextResponse.json({ error: 'Failed to set role' }, { status: 500 });
  }
}
