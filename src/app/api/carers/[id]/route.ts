import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

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
    const carer = await prisma.carer.findFirst({
      where: {
        id,
        clerkOrganizationId: orgId,
      },
      include: {
        trainings: true,
      },
    });

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
    
    // First, verify the carer belongs to the user's organization
    const existingCarer = await prisma.carer.findFirst({
      where: {
        id,
        clerkOrganizationId: orgId,
      },
    });

    if (!existingCarer) {
      return NextResponse.json({ error: 'Carer not found or access denied' }, { status: 404 });
    }
    
    // Remove fields that shouldn't be updated
    const { id: bodyId, createdAt, updatedAt, clerkUserId, clerkOrganizationId, ...updateData } = body;
    
    const carer = await prisma.carer.update({
      where: {
        id,
        clerkOrganizationId: orgId, // Double-check in update
      },
      data: updateData,
    });

    return NextResponse.json(carer);
  } catch (error) {
    console.error('Error updating carer:', error);
    return NextResponse.json({ error: 'Failed to update carer' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // First, verify the carer belongs to the user's organization
    const existingCarer = await prisma.carer.findFirst({
      where: {
        id,
        clerkOrganizationId: orgId,
      },
    });

    if (!existingCarer) {
      return NextResponse.json({ error: 'Carer not found or access denied' }, { status: 404 });
    }

    await prisma.carer.delete({
      where: {
        id,
        clerkOrganizationId: orgId, // Double-check in delete
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting carer:', error);
    return NextResponse.json({ error: 'Failed to delete carer' }, { status: 500 });
  }
}