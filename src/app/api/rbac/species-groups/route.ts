import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  listSpeciesGroups,
  createSpeciesGroup,
  requirePermission,
} from '@/lib/rbac';

// GET /api/rbac/species-groups — list all species groups for the org
export async function GET() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Any authenticated org member can view species groups
    const groups = await listSpeciesGroups(orgId);
    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error listing species groups:', error);
    return NextResponse.json({ error: 'Failed to list species groups' }, { status: 500 });
  }
}

// POST /api/rbac/species-groups — create a new species group (admin only)
export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await requirePermission(userId, orgId, 'species_group:manage');

    const body = await request.json();
    const { slug, name, description, speciesNames } = body as {
      slug: string;
      name: string;
      description?: string;
      speciesNames: string[];
    };

    if (!slug || !name || !speciesNames?.length) {
      return NextResponse.json(
        { error: 'slug, name, and speciesNames are required' },
        { status: 400 }
      );
    }

    const group = await createSpeciesGroup({
      slug,
      name,
      description,
      speciesNames,
      orgId,
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error creating species group:', error);
    return NextResponse.json({ error: 'Failed to create species group' }, { status: 500 });
  }
}
