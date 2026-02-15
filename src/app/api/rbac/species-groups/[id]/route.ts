import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  updateSpeciesGroup,
  deleteSpeciesGroup,
  requirePermission,
} from '@/lib/rbac';

// PATCH /api/rbac/species-groups/[id] — update a species group
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await requirePermission(userId, orgId, 'species_group:manage');
    const { id } = await params;
    const body = await request.json();

    const { name, slug, description, speciesNames } = body;
    const updated = await updateSpeciesGroup(id, orgId, { name, slug, description, speciesNames });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error updating species group:', error);
    return NextResponse.json({ error: 'Failed to update species group' }, { status: 500 });
  }
}

// DELETE /api/rbac/species-groups/[id] — delete a species group
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await requirePermission(userId, orgId, 'species_group:manage');
    const { id } = await params;
    await deleteSpeciesGroup(id, orgId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error deleting species group:', error);
    return NextResponse.json({ error: 'Failed to delete species group' }, { status: 500 });
  }
}
