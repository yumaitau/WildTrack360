import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { route } from '@/lib/openapi/route';
import { listCarerTrainingsContract, createCarerTrainingContract } from './openapi';

export const GET = route(listCarerTrainingsContract, async ({ query }) => {
  const { userId, orgId: activeOrgId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const orgId = activeOrgId;
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
  try {
    const whereClause: Record<string, unknown> = { clerkOrganizationId: orgId };
    if (query.carerId) whereClause.carerId = query.carerId;
    const trainings = await prisma.carerTraining.findMany({
      where: whereClause,
      include: { carer: { select: { id: true } } },
      orderBy: [{ expiryDate: 'asc' }, { date: 'desc' }],
    });
    return { data: trainings };
  } catch {
    return NextResponse.json({ error: 'Failed to fetch trainings' }, { status: 500 });
  }
});

export const POST = route(createCarerTrainingContract, async ({ body }) => {
  const { userId, orgId: activeOrgId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const orgId = activeOrgId;
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
  try {
    const carer = await prisma.carerProfile.findFirst({ where: { id: body.carerId, clerkOrganizationId: orgId } });
    if (!carer) return NextResponse.json({ error: 'Carer not found in this organization' }, { status: 404 });
    const training = await prisma.carerTraining.create({
      data: {
        carerId: body.carerId,
        courseName: body.courseName,
        provider: body.provider ?? null,
        date: new Date(body.date),
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        certificateUrl: body.certificateUrl ?? null,
        notes: body.notes ?? null,
        clerkUserId: userId,
        clerkOrganizationId: orgId,
      },
      include: { carer: { select: { id: true } } },
    });
    logAudit({ userId, orgId, action: 'CREATE', entity: 'CarerTraining', entityId: training.id, metadata: { courseName: body.courseName, carerId: body.carerId } });
    return { data: training, status: 201 as const };
  } catch {
    return NextResponse.json({ error: 'Failed to create training' }, { status: 500 });
  }
});
