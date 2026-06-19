import { NextResponse } from 'next/server'
import { auth } from '@/lib/clerk-server'
import { prisma } from '@/lib/prisma'
import { getUserRole, hasPermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { validateApplicationSubmission, validateApprovalDetails } from '@/lib/compliance-guardrails'
import { route } from '@/lib/openapi/route'
import { getPCAContract, updatePCAContract } from '../openapi'

export const GET = route(getPCAContract, async ({ params }) => {
  const { id } = params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const application = await prisma.permanentCareApplication.findFirst({
      where: { id, clerkOrganizationId: orgId },
      include: { animal: { select: { id: true, name: true, species: true, status: true } } },
    })
    if (!application) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return { data: application }
  } catch {
    return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 })
  }
})

export const PATCH = route(updatePCAContract, async ({ params, body }) => {
  const { id } = params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = await getUserRole(userId, orgId)
  const b = body as Record<string, unknown>

  try {
    const application = await prisma.permanentCareApplication.findFirst({ where: { id, clerkOrganizationId: orgId } })
    if (!application) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (b.action === 'submit') {
      if (!hasPermission(role, 'compliance:submit_permanent_care'))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      if (application.status !== 'DRAFT')
        return NextResponse.json({ error: 'Can only submit draft applications' }, { status: 422 })
      const validation = validateApplicationSubmission({
        vetReportUrl: (b.vetReportUrl ?? application.vetReportUrl) as string | null,
        nonReleasableReasons: (b.nonReleasableReasons ?? application.nonReleasableReasons) as string,
        euthanasiaJustification: (b.euthanasiaJustification ?? application.euthanasiaJustification) as string,
      })
      if (!validation.allowed) return NextResponse.json({ error: validation.reason }, { status: 422 })
      const updated = await prisma.permanentCareApplication.update({
        where: { id },
        data: {
          status: 'SUBMITTED', submittedByUserId: userId, submittedAt: new Date(),
          ...(b.vetReportUrl && { vetReportUrl: b.vetReportUrl as string }),
          ...(b.vetName && { vetName: b.vetName as string }),
          ...(b.vetClinic && { vetClinic: b.vetClinic as string }),
          ...(b.vetContact && { vetContact: b.vetContact as string }),
          ...(b.nonReleasableReasons && { nonReleasableReasons: b.nonReleasableReasons as string }),
          ...(b.euthanasiaJustification && { euthanasiaJustification: b.euthanasiaJustification as string }),
          ...(b.notes !== undefined && { notes: b.notes as string | null }),
        },
      })
      logAudit({ userId, orgId, action: 'SUBMIT', entity: 'PermanentCareApplication', entityId: id, metadata: { animalId: application.animalId } })
      return { data: updated }
    }

    if (b.action === 'approve') {
      if (!hasPermission(role, 'compliance:approve_permanent_care'))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      if (application.status !== 'SUBMITTED')
        return NextResponse.json({ error: 'Can only approve submitted applications' }, { status: 422 })
      const approvalValidation = validateApprovalDetails({ npwsApprovalNumber: b.npwsApprovalNumber as string, npwsApprovalDate: b.npwsApprovalDate as string })
      if (!approvalValidation.allowed) return NextResponse.json({ error: approvalValidation.reason }, { status: 422 })
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.permanentCareApplication.update({
          where: { id },
          data: {
            status: 'APPROVED',
            npwsApprovalNumber: b.npwsApprovalNumber as string,
            npwsApprovalDate: new Date(b.npwsApprovalDate as string),
            reviewedByUserId: userId, reviewedAt: new Date(),
            keeperName: (b.keeperName ?? application.keeperName) as string | null,
            facilityName: (b.facilityName ?? application.facilityName) as string | null,
            facilityAddress: (b.facilityAddress ?? application.facilityAddress) as string | null,
            facilitySuburb: (b.facilitySuburb ?? application.facilitySuburb) as string | null,
            facilityPostcode: (b.facilityPostcode ?? application.facilityPostcode) as string | null,
            category: (b.category ?? application.category) as string | null,
          },
        })
        const approvalData = {
          npwsApprovalDate: new Date(b.npwsApprovalDate as string),
          npwsApprovalNumber: b.npwsApprovalNumber as string,
          approvalCategory: (b.category ?? application.category ?? 'COMPANION') as string,
          facilityName: ((b.facilityName ?? application.facilityName) ?? '') as string,
          licenseNumber: (b.receivingLicense ?? '') as string,
          keeperName: (b.keeperName ?? application.keeperName) as string | null,
          address: ((b.facilityAddress ?? application.facilityAddress) ?? '') as string,
          suburb: ((b.facilitySuburb ?? application.facilitySuburb) ?? '') as string,
          state: ((b.facilityState ?? application.facilityState) ?? 'NSW') as string,
          postcode: ((b.facilityPostcode ?? application.facilityPostcode) ?? '') as string,
          approvalDocumentUrl: (b.approvalDocumentUrl ?? null) as string | null,
          notes: (b.approvalNotes ?? null) as string | null,
          clerkUserId: userId, clerkOrganizationId: orgId,
        }
        await tx.permanentCareApproval.upsert({
          where: { animalId: application.animalId },
          create: { animalId: application.animalId, ...approvalData },
          update: approvalData,
        })
        const updatedAnimal = await tx.animal.update({
          where: { id: application.animalId },
          data: { status: 'PERMANENT_CARE' as Parameters<typeof tx.animal.update>[0]['data']['status'], outcomeDate: new Date(b.npwsApprovalDate as string), outcomeReason: 'Permanent care approved - NPWS #' + (b.npwsApprovalNumber as string) },
        })
        return { updated, updatedAnimal }
      })
      logAudit({ userId, orgId, action: 'APPROVE', entity: 'PermanentCareApplication', entityId: id, metadata: { animalId: application.animalId, npwsApprovalNumber: b.npwsApprovalNumber, newAnimalStatus: 'PERMANENT_CARE' } })
      return { data: { application: result.updated, updatedAnimal: result.updatedAnimal } }
    }

    if (b.action === 'reject') {
      if (!hasPermission(role, 'compliance:approve_permanent_care'))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      if (application.status !== 'SUBMITTED')
        return NextResponse.json({ error: 'Can only reject submitted applications' }, { status: 422 })
      if (!(b.rejectionReason as string | undefined)?.trim())
        return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
      const updated = await prisma.permanentCareApplication.update({
        where: { id },
        data: { status: 'REJECTED', rejectionReason: b.rejectionReason as string, reviewedByUserId: userId, reviewedAt: new Date() },
      })
      logAudit({ userId, orgId, action: 'REJECT', entity: 'PermanentCareApplication', entityId: id, metadata: { animalId: application.animalId, rejectionReason: b.rejectionReason } })
      return { data: updated }
    }

    // Regular draft edit
    if (!hasPermission(role, 'compliance:draft_permanent_care'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (application.status !== 'DRAFT')
      return NextResponse.json({ error: 'Can only edit draft applications' }, { status: 422 })
    const safeFields: Record<string, unknown> = {}
    for (const field of ['nonReleasableReasons', 'euthanasiaJustification', 'vetReportUrl', 'vetName', 'vetClinic', 'vetContact', 'keeperName', 'facilityName', 'facilityAddress', 'facilitySuburb', 'facilityState', 'facilityPostcode', 'category', 'notes']) {
      if (field in b) safeFields[field] = b[field]
    }
    const result = await prisma.permanentCareApplication.updateMany({ where: { id, clerkOrganizationId: orgId, status: 'DRAFT' }, data: safeFields })
    if (result.count === 0) return NextResponse.json({ error: 'Application is no longer in draft status' }, { status: 409 })
    const updated = await prisma.permanentCareApplication.findUnique({ where: { id } })
    logAudit({ userId, orgId, action: 'UPDATE', entity: 'PermanentCareApplication', entityId: id, metadata: { fields: Object.keys(safeFields) } })
    return { data: updated }
  } catch (e) {
    console.error('Failed to update application:', e)
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
  }
})
