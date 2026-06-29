import { NextResponse } from 'next/server'
import { auth } from '@/lib/clerk-server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { route } from '@/lib/openapi/route'
import { listIncidentsContract, createIncidentContract } from './openapi'

export const GET = route(listIncidentsContract, async () => {
  const { userId, orgId: activeOrgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = activeOrgId
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  try {
    const incidents = await prisma.incidentReport.findMany({
      where: { clerkOrganizationId: orgId },
      orderBy: { date: 'desc' },
    })
    return { data: incidents }
  } catch {
    return NextResponse.json({ error: 'Failed to fetch incident reports' }, { status: 500 })
  }
})

export const POST = route(createIncidentContract, async ({ body }) => {
  const { userId, orgId: activeOrgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = activeOrgId
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
      },
    })
    logAudit({ userId, orgId, action: 'CREATE', entity: 'IncidentReport', entityId: created.id, metadata: { type: body.type, severity: body.severity } })
    return { data: created, status: 201 as const }
  } catch {
    return NextResponse.json({ error: 'Failed to create incident report' }, { status: 500 })
  }
})
