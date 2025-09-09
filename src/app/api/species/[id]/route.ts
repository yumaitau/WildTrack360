import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const species = await prisma.species.findFirst({
      where: {
        id,
        clerkOrganizationId: orgId || 'default-org',
      },
    });

    if (!species) {
      return NextResponse.json({ error: 'Species not found' }, { status: 404 });
    }

    return NextResponse.json(species);
  } catch (error) {
    console.error('Error fetching species:', error);
    return NextResponse.json({ error: 'Failed to fetch species' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    // First, verify the species belongs to the user's organization
    const existingSpecies = await prisma.species.findFirst({
      where: {
        id,
        clerkOrganizationId: orgId || 'default-org',
      },
    });

    if (!existingSpecies) {
      return NextResponse.json({ error: 'Species not found or access denied' }, { status: 404 });
    }
    
    // Remove fields that shouldn't be updated
    const { id: bodyId, createdAt, updatedAt, clerkUserId, clerkOrganizationId, ...updateData } = body;
    
    const species = await prisma.species.update({
      where: {
        id,
        clerkOrganizationId: orgId || 'default-org', // Double-check in update
      },
      data: updateData,
    });

    return NextResponse.json(species);
  } catch (error) {
    console.error('Error updating species:', error);
    return NextResponse.json({ error: 'Failed to update species' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // First, verify the species belongs to the user's organization
    const existingSpecies = await prisma.species.findFirst({
      where: {
        id,
        clerkOrganizationId: orgId || 'default-org',
      },
    });

    if (!existingSpecies) {
      return NextResponse.json({ error: 'Species not found or access denied' }, { status: 404 });
    }

    await prisma.species.delete({
      where: {
        id,
        clerkOrganizationId: orgId || 'default-org', // Double-check in delete
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting species:', error);
    return NextResponse.json({ error: 'Failed to delete species' }, { status: 500 });
  }
}