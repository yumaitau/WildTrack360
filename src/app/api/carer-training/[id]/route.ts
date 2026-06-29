import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { route } from '@/lib/openapi/route';
import { getCarerTrainingContract, updateCarerTrainingContract, deleteCarerTrainingContract } from '../openapi';

export const GET = route(getCarerTrainingContract, async ({ params }) => {
  const { id } = params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const training = await prisma.carerTraining.findFirst({
      where: { id, clerkOrganizationId: orgId },
      include: { carer: { select: { id: true } } },
    });
    if (!training) return NextResponse.json({ error: 'Training not found or access denied' }, { status: 404 });
    return { data: training };
  } catch {
    return NextResponse.json({ error: 'Failed to fetch training' }, { status: 500 });
  }
});

export const PATCH = route(updateCarerTrainingContract, async ({ params, body }) => {
  const { id } = params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const existing = await prisma.carerTraining.findFirst({ where: { id, clerkOrganizationId: orgId } });
    if (!existing) return NextResponse.json({ error: 'Training not found or access denied' }, { status: 404 });
    const data: Record<string, unknown> = {};
    if ('courseName' in body) data.courseName = body.courseName;
    if ('provider' in body) data.provider = body.provider ?? null;
    if ('date' in body) data.date = body.date ? new Date(body.date as string) : undefined;
    if ('expiryDate' in body) data.expiryDate = body.expiryDate ? new Date(body.expiryDate as string) : null;
    if ('certificateUrl' in body) data.certificateUrl = body.certificateUrl ?? null;
    if ('certificateNumber' in body) data.certificateNumber = body.certificateNumber ?? null;
    if ('trainingType' in body) data.trainingType = body.trainingType ?? null;
    if ('trainingHours' in body) data.trainingHours = body.trainingHours ?? null;
    if ('notes' in body) data.notes = body.notes ?? null;
    const training = await prisma.carerTraining.update({
      where: { id, clerkOrganizationId: orgId },
      data,
      include: { carer: { select: { id: true } } },
    });
    logAudit({ userId, orgId, action: 'UPDATE', entity: 'CarerTraining', entityId: id, metadata: { fields: Object.keys(body) } });
    return { data: training };
  } catch {
    return NextResponse.json({ error: 'Failed to update training' }, { status: 500 });
  }
});

export const DELETE = route(deleteCarerTrainingContract, async ({ params }) => {
  const { id } = params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const existing = await prisma.carerTraining.findFirst({ where: { id, clerkOrganizationId: orgId } });
    if (!existing) return NextResponse.json({ error: 'Training not found or access denied' }, { status: 404 });
    await prisma.carerTraining.delete({ where: { id, clerkOrganizationId: orgId } });
    logAudit({ userId, orgId, action: 'DELETE', entity: 'CarerTraining', entityId: id });
    return { data: { success: true } };
  } catch {
    return NextResponse.json({ error: 'Failed to delete training' }, { status: 500 });
  }
});
