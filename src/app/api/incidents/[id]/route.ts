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
    const incident = await prisma.incidentReport.findFirst({
      where: {
        id,
        clerkUserId: userId,
        clerkOrganizationId: orgId,
      },
    });

    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    return NextResponse.json(incident);
  } catch (error) {
    console.error('Error fetching incident:', error);
    return NextResponse.json({ error: 'Failed to fetch incident' }, { status: 500 });
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
    
    const existing = await prisma.incidentReport.findFirst({
      where: { id, clerkOrganizationId: orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    const INCIDENT_SAFE_FIELDS = [
      'date', 'type', 'description', 'severity', 'resolved', 'resolution',
      'personInvolved', 'reportedTo', 'actionTaken', 'location', 'animalId', 'notes',
    ] as const;
    const safeData: Record<string, unknown> = {};
    for (const key of INCIDENT_SAFE_FIELDS) {
      if (key in body) {
        safeData[key] = body[key];
      }
    }

    const incident = await prisma.incidentReport.update({
      where: { id },
      data: safeData,
    });

    logAudit({ userId, orgId, action: 'UPDATE', entity: 'IncidentReport', entityId: id, metadata: { fields: Object.keys(body) } });
    return NextResponse.json(incident);
  } catch (error) {
    console.error('Error updating incident:', error);
    return NextResponse.json({ error: 'Failed to update incident' }, { status: 500 });
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
    const existing = await prisma.incidentReport.findFirst({
      where: { id, clerkOrganizationId: orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    await prisma.incidentReport.delete({
      where: { id },
    });

    logAudit({ userId, orgId, action: 'DELETE', entity: 'IncidentReport', entityId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting incident:', error);
    return NextResponse.json({ error: 'Failed to delete incident' }, { status: 500 });
  }
}