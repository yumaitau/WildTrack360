import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { logAudit } from '@/lib/audit';

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
    const safeData = pickHygieneFields(body);

    const result = await prisma.hygieneLog.updateMany({
      where: { id, clerkOrganizationId: orgId, clerkUserId: userId },
      data: safeData,
    });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Hygiene log not found' }, { status: 404 });
    }

    const hygieneLog = await prisma.hygieneLog.findUnique({ where: { id } });
    logAudit({ userId, orgId, action: 'UPDATE', entity: 'HygieneLog', entityId: id, metadata: { fields: Object.keys(safeData) } });
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
    const result = await prisma.hygieneLog.deleteMany({
      where: { id, clerkOrganizationId: orgId, clerkUserId: userId },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Hygiene log not found' }, { status: 404 });
    }

    logAudit({ userId, orgId, action: 'DELETE', entity: 'HygieneLog', entityId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting hygiene log:', error);
    return NextResponse.json({ error: 'Failed to delete hygiene log' }, { status: 500 });
  }
}
