import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET(request: Request) {
  const { userId, orgId: activeOrgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('orgId') || activeOrgId || undefined
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  try {
    const incidents = await prisma.incidentReport.findMany({
      where: { clerkOrganizationId: orgId },
      orderBy: { date: 'desc' },
    })
    return NextResponse.json(incidents)
  } catch (error) {
    console.error('Error fetching incident reports:', error);
    return NextResponse.json({ error: 'Failed to fetch incident reports' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { userId, orgId: activeOrgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const orgId = body.clerkOrganizationId || activeOrgId || undefined
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  try {
    const created = await prisma.incidentReport.create({
      data: {
        date: body.date ? new Date(body.date) : new Date(),
        type: body.type,
        description: body.description,
        severity: body.severity,
        resolved: Boolean(body.resolved ?? false),
        resolution: body.resolution ?? null,
        personInvolved: body.personInvolved ?? null,
        reportedTo: body.reportedTo ?? null,
        actionTaken: body.actionTaken ?? null,
        location: body.location ?? null,
        animalId: body.animalId ?? null,
        notes: body.notes ?? null,
        clerkUserId: userId,
        clerkOrganizationId: orgId,
      }
    })
    logAudit({ userId, orgId, action: 'CREATE', entity: 'IncidentReport', entityId: created.id, metadata: { type: body.type, severity: body.severity } })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Error creating incident report:', error);
    return NextResponse.json({ error: 'Failed to create incident report' }, { status: 500 })
  }
}


