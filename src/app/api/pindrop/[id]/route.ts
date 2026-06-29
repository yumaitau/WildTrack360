import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { prisma } from '@/lib/prisma';
import { deleteObjectFromS3 } from '@/lib/s3';
import { route } from '@/lib/openapi/route';
import { getPindropContract, deletePindropContract } from '../openapi';

export const GET = route(getPindropContract, async ({ params }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const session = await prisma.pindropSession.findFirst({ where: { id, clerkOrganizationId: orgId } });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const { accessToken: _, ...safeSession } = session;
  return { data: safeSession };
});

export const DELETE = route(deletePindropContract, async ({ params }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const session = await prisma.pindropSession.findFirst({ where: { id, clerkOrganizationId: orgId } });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  if (session.photoUrls.length > 0) {
    const results = await Promise.allSettled(session.photoUrls.map((key) => deleteObjectFromS3(key)));
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`[PindropCleanup] Failed to delete S3 object ${session.photoUrls[i]}:`, result.reason);
      }
    });
  }

  await prisma.pindropSession.delete({ where: { id: session.id } });
  return { data: { deleted: true } };
});
