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
    const hygieneLog = await prisma.hygieneLog.findFirst({
      where: {
        id,
        clerkUserId: userId,
        clerkOrganizationId: orgId,
      },
      include: {
        carer: true,
      },
    });

    if (!hygieneLog) {
      return NextResponse.json({ error: 'Hygiene log not found' }, { status: 404 });
    }

    return NextResponse.json(hygieneLog);
  } catch (error) {
    console.error('Error fetching hygiene log:', error);
    return NextResponse.json({ error: 'Failed to fetch hygiene log' }, { status: 500 });
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
    
    const hygieneLog = await prisma.hygieneLog.update({
      where: {
        id,
      },
      data: {
        ...body,
        clerkUserId: userId,
        clerkOrganizationId: orgId,
      },
    });

    return NextResponse.json(hygieneLog);
  } catch (error) {
    console.error('Error updating hygiene log:', error);
    return NextResponse.json({ error: 'Failed to update hygiene log' }, { status: 500 });
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
    await prisma.hygieneLog.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting hygiene log:', error);
    return NextResponse.json({ error: 'Failed to delete hygiene log' }, { status: 500 });
  }
}