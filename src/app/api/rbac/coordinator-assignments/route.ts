import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { logAudit } from '@/lib/audit';
import {
  assignCoordinatorToSpeciesGroup,
  removeCoordinatorFromSpeciesGroup,
  requirePermission,
} from '@/lib/rbac';

// POST /api/rbac/coordinator-assignments — assign a coordinator to a species group
export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await requirePermission(userId, orgId, 'coordinator:assign');

    const body = await request.json();
    const { orgMemberId, speciesGroupId } = body as {
      orgMemberId: string;
      speciesGroupId: string;
    };

    if (!orgMemberId || !speciesGroupId) {
      return NextResponse.json(
        { error: 'orgMemberId and speciesGroupId are required' },
        { status: 400 }
      );
    }

    const assignment = await assignCoordinatorToSpeciesGroup(orgMemberId, speciesGroupId, orgId);
    logAudit({ userId, orgId, action: 'ASSIGN', entity: 'CoordinatorSpeciesAssignment', entityId: assignment.id, metadata: { orgMemberId, speciesGroupId } });
    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error assigning coordinator:', error);
    return NextResponse.json(
      { error: 'Failed to assign coordinator' },
      { status: 500 }
    );
  }
}

// DELETE /api/rbac/coordinator-assignments — remove a coordinator from a species group
export async function DELETE(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await requirePermission(userId, orgId, 'coordinator:assign');

    const body = await request.json();
    const { orgMemberId, speciesGroupId } = body as {
      orgMemberId: string;
      speciesGroupId: string;
    };

    if (!orgMemberId || !speciesGroupId) {
      return NextResponse.json(
        { error: 'orgMemberId and speciesGroupId are required' },
        { status: 400 }
      );
    }

    await removeCoordinatorFromSpeciesGroup(orgMemberId, speciesGroupId, orgId);
    logAudit({ userId, orgId, action: 'UNASSIGN', entity: 'CoordinatorSpeciesAssignment', metadata: { orgMemberId, speciesGroupId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error removing coordinator assignment:', error);
    return NextResponse.json(
      { error: 'Failed to remove coordinator assignment' },
      { status: 500 }
    );
  }
}
