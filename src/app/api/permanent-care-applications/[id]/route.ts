import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getUserRole, hasPermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { validateApplicationSubmission, validateApprovalDetails } from '@/lib/compliance-guardrails'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    const application = await prisma.permanentCareApplication.findFirst({
      where: { id, clerkOrganizationId: orgId },
      include: { animal: { select: { id: true, name: true, species: true, status: true } } },
    })
    if (!application) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(application)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json()

  const role = await getUserRole(userId, orgId)

  try {
    const application = await prisma.permanentCareApplication.findFirst({
      where: { id, clerkOrganizationId: orgId },
    })
    if (!application) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Handle workflow actions
    if (body.action === 'submit') {
      if (!hasPermission(role, 'compliance:submit_permanent_care')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (application.status !== 'DRAFT') {
        return NextResponse.json({ error: 'Can only submit draft applications' }, { status: 422 })
      }


      // Use latest data (merge body updates with existing)
      const vetReportUrl = body.vetReportUrl ?? application.vetReportUrl
      const validation = validateApplicationSubmission({
        vetReportUrl,
        nonReleasableReasons: body.nonReleasableReasons ?? application.nonReleasableReasons,
        euthanasiaJustification: body.euthanasiaJustification ?? application.euthanasiaJustification,
      })
      if (!validation.allowed) {
        return NextResponse.json({ error: validation.reason }, { status: 422 })
      }

      const updated = await prisma.permanentCareApplication.update({
        where: { id },
        data: {
          status: 'SUBMITTED',
          submittedByUserId: userId,
          submittedAt: new Date(),
          ...(body.vetReportUrl && { vetReportUrl: body.vetReportUrl }),
          ...(body.vetName && { vetName: body.vetName }),
          ...(body.vetClinic && { vetClinic: body.vetClinic }),
          ...(body.vetContact && { vetContact: body.vetContact }),
          ...(body.nonReleasableReasons && { nonReleasableReasons: body.nonReleasableReasons }),
          ...(body.euthanasiaJustification && { euthanasiaJustification: body.euthanasiaJustification }),
          ...(body.notes !== undefined && { notes: body.notes }),
        },
      })
      logAudit({ userId, orgId, action: 'SUBMIT', entity: 'PermanentCareApplication', entityId: id, metadata: { animalId: application.animalId } })
      return NextResponse.json(updated)
    }

    if (body.action === 'approve') {
      if (!hasPermission(role, 'compliance:approve_permanent_care')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (application.status !== 'SUBMITTED') {
        return NextResponse.json({ error: 'Can only approve submitted applications' }, { status: 422 })
      }

      const approvalValidation = validateApprovalDetails({
        npwsApprovalNumber: body.npwsApprovalNumber,
        npwsApprovalDate: body.npwsApprovalDate,
      })
      if (!approvalValidation.allowed) {
        return NextResponse.json({ error: approvalValidation.reason }, { status: 422 })
      }

      // Use transaction: approve application + create PermanentCareApproval
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.permanentCareApplication.update({
          where: { id },
          data: {
            status: 'APPROVED',
            npwsApprovalNumber: body.npwsApprovalNumber,
            npwsApprovalDate: new Date(body.npwsApprovalDate),
            reviewedByUserId: userId,
            reviewedAt: new Date(),
            keeperName: body.keeperName ?? application.keeperName,
            facilityName: body.facilityName ?? application.facilityName,
            facilityAddress: body.facilityAddress ?? application.facilityAddress,
            facilitySuburb: body.facilitySuburb ?? application.facilitySuburb,
            facilityPostcode: body.facilityPostcode ?? application.facilityPostcode,
            category: body.category ?? application.category,
          },
        })

        // Auto-create or update PermanentCareApproval record
        const approvalData = {
          npwsApprovalDate: new Date(body.npwsApprovalDate),
          npwsApprovalNumber: body.npwsApprovalNumber,
          approvalCategory: body.category ?? application.category ?? 'COMPANION',
          facilityName: body.facilityName ?? application.facilityName ?? '',
          licenseNumber: body.receivingLicense ?? '',
          keeperName: body.keeperName ?? application.keeperName ?? null,
          address: body.facilityAddress ?? application.facilityAddress ?? '',
          suburb: body.facilitySuburb ?? application.facilitySuburb ?? '',
          state: body.facilityState ?? application.facilityState ?? 'NSW',
          postcode: body.facilityPostcode ?? application.facilityPostcode ?? '',
          approvalDocumentUrl: body.approvalDocumentUrl ?? null,
          notes: body.approvalNotes ?? null,
          clerkUserId: userId,
          clerkOrganizationId: orgId,
        }

        await tx.permanentCareApproval.upsert({
          where: { animalId: application.animalId },
          create: { animalId: application.animalId, ...approvalData },
          update: approvalData,
        })

        // Update animal status to PERMANENT_CARE
        const updatedAnimal = await tx.animal.update({
          where: { id: application.animalId },
          data: {
            status: 'PERMANENT_CARE' as any,
            outcomeDate: new Date(body.npwsApprovalDate),
            outcomeReason: 'Permanent care approved — NPWS #' + body.npwsApprovalNumber,
          },
        })

        return { updated, updatedAnimal }
      })

      logAudit({ userId, orgId, action: 'APPROVE', entity: 'PermanentCareApplication', entityId: id, metadata: { animalId: application.animalId, npwsApprovalNumber: body.npwsApprovalNumber, newAnimalStatus: 'PERMANENT_CARE' } })
      return NextResponse.json({ application: result.updated, updatedAnimal: result.updatedAnimal })
    }

    if (body.action === 'reject') {
      if (!hasPermission(role, 'compliance:approve_permanent_care')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (application.status !== 'SUBMITTED') {
        return NextResponse.json({ error: 'Can only reject submitted applications' }, { status: 422 })
      }
      if (!body.rejectionReason?.trim()) {
        return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
      }

      const updated = await prisma.permanentCareApplication.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: body.rejectionReason,
          reviewedByUserId: userId,
          reviewedAt: new Date(),
        },
      })
      logAudit({ userId, orgId, action: 'REJECT', entity: 'PermanentCareApplication', entityId: id, metadata: { animalId: application.animalId, rejectionReason: body.rejectionReason } })
      return NextResponse.json(updated)
    }

    // Regular field update (draft editing)
    if (!hasPermission(role, 'compliance:draft_permanent_care')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (application.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Can only edit draft applications' }, { status: 422 })
    }

    const safeFields: Record<string, unknown> = {}
    const allowedFields = [
      'nonReleasableReasons', 'euthanasiaJustification', 'vetReportUrl',
      'vetName', 'vetClinic', 'vetContact', 'keeperName', 'facilityName',
      'facilityAddress', 'facilitySuburb', 'facilityState', 'facilityPostcode',
      'category', 'notes',
    ]
    for (const field of allowedFields) {
      if (field in body) safeFields[field] = body[field]
    }

    // Atomic: only update if still DRAFT (prevents race conditions)
    const result = await prisma.permanentCareApplication.updateMany({
      where: { id, clerkOrganizationId: orgId, status: 'DRAFT' },
      data: safeFields,
    })
    if (result.count === 0) {
      return NextResponse.json({ error: 'Application is no longer in draft status' }, { status: 409 })
    }
    const updated = await prisma.permanentCareApplication.findUnique({ where: { id } })
    logAudit({ userId, orgId, action: 'UPDATE', entity: 'PermanentCareApplication', entityId: id, metadata: { fields: Object.keys(safeFields) } })
    return NextResponse.json(updated)
  } catch (e) {
    console.error('Failed to update application:', e)
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
  }
}
