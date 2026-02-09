import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getEnrichedCarer, upsertCarerProfile } from '@/lib/carer-helpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const carer = await getEnrichedCarer(id, orgId);
    if (!carer) {
      return NextResponse.json({ error: 'Carer not found' }, { status: 404 });
    }
    return NextResponse.json(carer);
  } catch (error) {
    console.error('Error fetching carer:', error);
    return NextResponse.json({ error: 'Failed to fetch carer' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Strip fields that should not be updated via this endpoint
    const {
      id: _id,
      name: _name,
      email: _email,
      imageUrl: _imageUrl,
      hasProfile: _hasProfile,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      clerkOrganizationId: _orgId,
      trainings: _trainings,
      ...profileData
    } = body;

    const profile = await upsertCarerProfile(id, orgId, profileData);
    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error updating carer profile:', error);
    return NextResponse.json({ error: 'Failed to update carer profile' }, { status: 500 });
  }
}
