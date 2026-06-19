import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { logAudit } from '@/lib/audit';
import { listSpeciesGroups, createSpeciesGroup, requirePermission } from '@/lib/rbac';
import { route } from '@/lib/openapi/route';
import { listSpeciesGroupsContract, createSpeciesGroupContract } from '../openapi';

export const GET = route(listSpeciesGroupsContract, async () => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const groups = await listSpeciesGroups(orgId);
    return { data: groups };
  } catch (error) {
    console.error('Error listing species groups:', error);
    return NextResponse.json({ error: 'Failed to list species groups' }, { status: 500 });
  }
});

export const POST = route(createSpeciesGroupContract, async ({ body }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await requirePermission(userId, orgId, 'species_group:manage');

    const { slug, name, description, speciesNames } = body;
    if (!slug || !name || !speciesNames?.length) {
      return NextResponse.json({ error: 'slug, name, and speciesNames are required' }, { status: 400 });
    }

    const group = await createSpeciesGroup({ slug, name, description, speciesNames, orgId });
    logAudit({ userId, orgId, action: 'CREATE', entity: 'SpeciesGroup', entityId: group.id, metadata: { name, slug } });
    return { data: group, status: 201 as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Error creating species group:', error);
    return NextResponse.json({ error: 'Failed to create species group' }, { status: 500 });
  }
});
