import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { deleteObjectFromS3 } from '@/lib/s3';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const session = await prisma.pindropSession.findFirst({
    where: { id, clerkOrganizationId: orgId },
  });

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const { accessToken: _, ...safeSession } = session;
  return NextResponse.json(safeSession);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const session = await prisma.pindropSession.findFirst({
    where: { id, clerkOrganizationId: orgId },
  });

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Delete uploaded photos from S3
  if (session.photoUrls.length > 0) {
    const results = await Promise.allSettled(
      session.photoUrls.map((key) => deleteObjectFromS3(key))
    );
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`[PindropCleanup] Failed to delete S3 object ${session.photoUrls[i]}:`, result.reason);
      }
    });
  }

  // Delete the session from the database
  await prisma.pindropSession.delete({ where: { id: session.id } });

  return NextResponse.json({ deleted: true });
}
