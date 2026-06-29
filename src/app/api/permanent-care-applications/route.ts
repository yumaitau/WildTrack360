import { NextResponse } from 'next/server'
import { auth } from '@/lib/clerk-server'
import { prisma } from '@/lib/prisma'
import { getUserRole, hasPermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { validateApplicationSubmission } from '@/lib/compliance-guardrails'
import { route } from '@/lib/openapi/route'
import { listPCAContract, createPCAContract } from './openapi'

export const GET = route(listPCAContract, async ({ query }) => {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const where: Record<string, unknown> = { clerkOrganizationId: orgId }
    if (query.animalId) where.animalId = query.animalId
    const applications = await prisma.permanentCareApplication.findMany({
      where,
      include: { animal: { select: { id: true, name: true, species: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { data: applications }
  } catch {
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
  }
})

export const POST = route(createPCAContract, async ({ body }) => {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = await getUserRole(userId, orgId)
  if (!hasPermission(role, 'compliance:draft_permanent_care'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const animal = await prisma.animal.findFirst({ where: { id: body.animalId, clerkOrganizationId: orgId } })
  if (!animal) return NextResponse.json({ error: 'Animal not found' }, { status: 404 })

  try {
    let status: 'DRAFT' | 'SUBMITTED' = 'DRAFT'
    if (body.submitNow && hasPermission(role, 'compliance:submit_permanent_care')) {
      const validation = validateApplicationSubmission({
        vetReportUrl: body.vetReportUrl ?? null,
        nonReleasableReasons: body.nonReleasableReasons,
        euthanasiaJustification: body.euthanasiaJustification,
      })
      if (!validation.allowed) return NextResponse.json({ error: validation.reason }, { status: 422 })
      status = 'SUBMITTED'
    }

    const application = await prisma.permanentCareApplication.create({
      data: {
        animalId: body.animalId,
        status,
        createdByUserId: userId,
        submittedByUserId: status === 'SUBMITTED' ? userId : null,
        submittedAt: status === 'SUBMITTED' ? new Date() : null,
        nonReleasableReasons: body.nonReleasableReasons,
        euthanasiaJustification: body.euthanasiaJustification,
        vetReportUrl: body.vetReportUrl ?? null,
        vetName: body.vetName ?? null,
        vetClinic: body.vetClinic ?? null,
        vetContact: body.vetContact ?? null,
        keeperName: body.keeperName ?? null,
        facilityName: body.facilityName ?? null,
        facilityAddress: body.facilityAddress ?? null,
        facilitySuburb: body.facilitySuburb ?? null,
        facilityState: body.facilityState ?? 'NSW',
        facilityPostcode: body.facilityPostcode ?? null,
        category: body.category ?? null,
        notes: body.notes ?? null,
        clerkOrganizationId: orgId,
      },
    })

    const action = status === 'SUBMITTED' ? 'SUBMIT' as const : 'CREATE' as const
    logAudit({ userId, orgId, action, entity: 'PermanentCareApplication', entityId: application.id, metadata: { animalId: body.animalId, status } })
    return { data: application, status: 201 as const }
  } catch {
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
  }
})
