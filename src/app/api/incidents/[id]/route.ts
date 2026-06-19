import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/clerk-server';
import { logAudit } from '@/lib/audit';
import { route } from '@/lib/openapi/route';
import { getIncidentContract, updateIncidentContract, deleteIncidentContract } from '../openapi';

export const GET = route(getIncidentContract, async ({ params }) => {
  const { id } = params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const incident = await prisma.incidentReport.findFirst({
      where: { id, clerkUserId: userId, clerkOrganizationId: orgId },
    });
    if (!incident) return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    return { data: incident };
  } catch {
    return NextResponse.json({ error: 'Failed to fetch incident' }, { status: 500 });
  }
});

const INCIDENT_SAFE_FIELDS = [
  'date', 'type', 'description', 'severity', 'resolved', 'resolution',
  'personInvolved', 'reportedTo', 'actionTaken', 'location', 'animalId', 'notes',
] as const;

function pickIncidentFields(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of INCIDENT_SAFE_FIELDS) {
    if (key in data) result[key] = data[key];
  }
  return result;
}

export const PATCH = route(updateIncidentContract, async ({ params, body }) => {
  const { id } = params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const safeData = pickIncidentFields(body as Record<string, unknown>);
    const result = await prisma.incidentReport.updateMany({
      where: { id, clerkOrganizationId: orgId, clerkUserId: userId },
      data: safeData as Parameters<typeof prisma.incidentReport.updateMany>[0]['data'],
    });
    if (result.count === 0) return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    const incident = await prisma.incidentReport.findUnique({ where: { id } });
    logAudit({ userId, orgId, action: 'UPDATE', entity: 'IncidentReport', entityId: id, metadata: { fields: Object.keys(safeData) } });
    return { data: incident! };
  } catch {
    return NextResponse.json({ error: 'Failed to update incident' }, { status: 500 });
  }
});

export const DELETE = route(deleteIncidentContract, async ({ params }) => {
  const { id } = params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await prisma.incidentReport.deleteMany({
      where: { id, clerkOrganizationId: orgId, clerkUserId: userId },
    });
    if (result.count === 0) return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    logAudit({ userId, orgId, action: 'DELETE', entity: 'IncidentReport', entityId: id });
    return { data: { success: true } };
  } catch {
    return NextResponse.json({ error: 'Failed to delete incident' }, { status: 500 });
  }
});
