import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getUserRole, hasPermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { validateApplicationSubmission } from '@/lib/compliance-guardrails'

export async function GET(request: Request) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const animalId = searchParams.get('animalId')

  try {
    const where: Record<string, unknown> = { clerkOrganizationId: orgId }
    if (animalId) where.animalId = animalId

    const applications = await prisma.permanentCareApplication.findMany({
      where,
      include: { animal: { select: { id: true, name: true, species: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(applications)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = await getUserRole(userId, orgId)
  if (!hasPermission(role, 'compliance:draft_permanent_care')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()

  // Validate required fields
  if (!body.animalId || !body.nonReleasableReasons || !body.euthanasiaJustification) {
    return NextResponse.json({ error: 'animalId, nonReleasableReasons, and euthanasiaJustification are required' }, { status: 400 })
  }

  // Verify animal belongs to this org
  const animal = await prisma.animal.findFirst({
    where: { id: body.animalId, clerkOrganizationId: orgId },
  })
  if (!animal) return NextResponse.json({ error: 'Animal not found' }, { status: 404 })

  try {
    // Determine initial status
    let status: 'DRAFT' | 'SUBMITTED' = 'DRAFT'
    if (body.submitNow && hasPermission(role, 'compliance:submit_permanent_care')) {
      const validation = validateApplicationSubmission({
        vetReportUrl: body.vetReportUrl || null,
        nonReleasableReasons: body.nonReleasableReasons,
        euthanasiaJustification: body.euthanasiaJustification,
      })
      if (!validation.allowed) {
        return NextResponse.json({ error: validation.reason }, { status: 422 })
      }
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
        vetReportUrl: body.vetReportUrl || null,
        vetName: body.vetName || null,
        vetClinic: body.vetClinic || null,
        vetContact: body.vetContact || null,
        keeperName: body.keeperName || null,
        facilityName: body.facilityName || null,
        facilityAddress: body.facilityAddress || null,
        facilitySuburb: body.facilitySuburb || null,
        facilityState: body.facilityState || 'NSW',
        facilityPostcode: body.facilityPostcode || null,
        category: body.category || null,
        notes: body.notes || null,
        clerkOrganizationId: orgId,
      },
    })

    const action = status === 'SUBMITTED' ? 'SUBMIT' as const : 'CREATE' as const
    logAudit({ userId, orgId, action, entity: 'PermanentCareApplication', entityId: application.id, metadata: { animalId: body.animalId, status } })

    return NextResponse.json(application, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
  }
}
