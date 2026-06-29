import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { logAudit } from '@/lib/audit';
import { assignCoordinatorToSpeciesGroup, removeCoordinatorFromSpeciesGroup, requirePermission } from '@/lib/rbac';
import { route } from '@/lib/openapi/route';
import { assignCoordinatorContract, removeCoordinatorContract } from '../openapi';

export const POST = route(assignCoordinatorContract, async ({ body }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await requirePermission(userId, orgId, 'coordinator:assign');

    const { orgMemberId, speciesGroupId } = body;
    if (!orgMemberId || !speciesGroupId) {
      return NextResponse.json({ error: 'orgMemberId and speciesGroupId are required' }, { status: 400 });
    }

    const assignment = await assignCoordinatorToSpeciesGroup(orgMemberId, speciesGroupId, orgId);
    logAudit({ userId, orgId, action: 'ASSIGN', entity: 'CoordinatorSpeciesAssignment', entityId: assignment.id, metadata: { orgMemberId, speciesGroupId } });
    return { data: assignment, status: 201 as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Error assigning coordinator:', error);
    return NextResponse.json({ error: 'Failed to assign coordinator' }, { status: 500 });
  }
});

export const DELETE = route(removeCoordinatorContract, async ({ body }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await requirePermission(userId, orgId, 'coordinator:assign');

    const { orgMemberId, speciesGroupId } = body;
    if (!orgMemberId || !speciesGroupId) {
      return NextResponse.json({ error: 'orgMemberId and speciesGroupId are required' }, { status: 400 });
    }

    await removeCoordinatorFromSpeciesGroup(orgMemberId, speciesGroupId, orgId);
    logAudit({ userId, orgId, action: 'UNASSIGN', entity: 'CoordinatorSpeciesAssignment', metadata: { orgMemberId, speciesGroupId } });
    return { data: { ok: true } };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Error removing coordinator assignment:', error);
    return NextResponse.json({ error: 'Failed to remove coordinator assignment' }, { status: 500 });
  }
});
