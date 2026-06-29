import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/clerk-server';
import { logAudit } from '@/lib/audit';
import { route } from '@/lib/openapi/route';
import { getHygieneLogContract, updateHygieneLogContract, deleteHygieneLogContract } from '../openapi';

export const GET = route(getHygieneLogContract, async ({ params }) => {
  const { id } = params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const hygieneLog = await prisma.hygieneLog.findFirst({
      where: { id, clerkUserId: userId, clerkOrganizationId: orgId },
      include: { carer: true },
    });
    if (!hygieneLog) return NextResponse.json({ error: 'Hygiene log not found' }, { status: 404 });
    return { data: hygieneLog };
  } catch {
    return NextResponse.json({ error: 'Failed to fetch hygiene log' }, { status: 500 });
  }
});

const HYGIENE_SAFE_FIELDS = [
  'date', 'type', 'description', 'completed', 'enclosureCleaned', 'ppeUsed',
  'handwashAvailable', 'feedingBowlsDisinfected', 'quarantineSignsPresent',
  'photos', 'notes',
] as const;

function pickHygieneFields(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of HYGIENE_SAFE_FIELDS) {
    if (key in data) {
      result[key] = data[key];
    }
  }
  return result;
}

export const PATCH = route(updateHygieneLogContract, async ({ params, body }) => {
  const { id } = params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const safeData = pickHygieneFields(body as Record<string, unknown>);
    const result = await prisma.hygieneLog.updateMany({
      where: { id, clerkOrganizationId: orgId, clerkUserId: userId },
      data: safeData as Parameters<typeof prisma.hygieneLog.updateMany>[0]['data'],
    });
    if (result.count === 0) return NextResponse.json({ error: 'Hygiene log not found' }, { status: 404 });
    const hygieneLog = await prisma.hygieneLog.findUnique({ where: { id }, include: { carer: true } });
    logAudit({ userId, orgId, action: 'UPDATE', entity: 'HygieneLog', entityId: id, metadata: { fields: Object.keys(safeData) } });
    return { data: hygieneLog! };
  } catch {
    return NextResponse.json({ error: 'Failed to update hygiene log' }, { status: 500 });
  }
});

export const DELETE = route(deleteHygieneLogContract, async ({ params }) => {
  const { id } = params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await prisma.hygieneLog.deleteMany({
      where: { id, clerkOrganizationId: orgId, clerkUserId: userId },
    });
    if (result.count === 0) return NextResponse.json({ error: 'Hygiene log not found' }, { status: 404 });
    logAudit({ userId, orgId, action: 'DELETE', entity: 'HygieneLog', entityId: id });
    return { data: { success: true } };
  } catch {
    return NextResponse.json({ error: 'Failed to delete hygiene log' }, { status: 500 });
  }
});
