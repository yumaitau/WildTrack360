import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { logAudit } from '@/lib/audit';
import { updateSpeciesGroup, deleteSpeciesGroup, requirePermission } from '@/lib/rbac';
import { route } from '@/lib/openapi/route';
import { updateSpeciesGroupContract, deleteSpeciesGroupContract } from '../../openapi';

export const PATCH = route(updateSpeciesGroupContract, async ({ body, params }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await requirePermission(userId, orgId, 'species_group:manage');
    const { id } = params;
    const { name, slug, description, speciesNames } = body;
    const updated = await updateSpeciesGroup(id, orgId, { name, slug, description, speciesNames });
    logAudit({ userId, orgId, action: 'UPDATE', entity: 'SpeciesGroup', entityId: id, metadata: { fields: Object.keys(body) } });
    return { data: updated };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Error updating species group:', error);
    return NextResponse.json({ error: 'Failed to update species group' }, { status: 500 });
  }
});

export const DELETE = route(deleteSpeciesGroupContract, async ({ params }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await requirePermission(userId, orgId, 'species_group:manage');
    const { id } = params;
    await deleteSpeciesGroup(id, orgId);
    logAudit({ userId, orgId, action: 'DELETE', entity: 'SpeciesGroup', entityId: id });
    return { data: { ok: true } };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Error deleting species group:', error);
    return NextResponse.json({ error: 'Failed to delete species group' }, { status: 500 });
  }
});
