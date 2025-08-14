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
        clerkUserId: userId,
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
    
    const carer = await prisma.carer.update({
      where: {
        id,
      },
      data: {
        ...body,
        clerkUserId: userId,
        clerkOrganizationId: orgId,
      },
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
    await prisma.carer.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting carer:', error);
    return NextResponse.json({ error: 'Failed to delete carer' }, { status: 500 });
  }
}