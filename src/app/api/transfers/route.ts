import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getUserRole, hasPermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { validateTransferRecord } from '@/lib/compliance-guardrails'

export async function GET(request: Request) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const animalId = searchParams.get('animalId')

  try {
    const where: Record<string, unknown> = { clerkOrganizationId: orgId }
    if (animalId) where.animalId = animalId

    const transfers = await prisma.animalTransfer.findMany({
      where,
      include: { animal: { select: { id: true, name: true, species: true } } },
      orderBy: { transferDate: 'desc' },
    })
    return NextResponse.json(transfers)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = await getUserRole(userId, orgId)
  if (!hasPermission(role, 'compliance:manage_transfers')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()

  // Validate required fields
  if (!body.animalId || !body.transferDate || !body.reasonForTransfer || !body.receivingEntity) {
    return NextResponse.json({ error: 'animalId, transferDate, reasonForTransfer, and receivingEntity are required' }, { status: 400 })
  }

  // Validate transferDate is a valid date
  const parsedTransferDate = new Date(body.transferDate)
  if (isNaN(parsedTransferDate.getTime())) {
    return NextResponse.json({ error: 'transferDate is not a valid date' }, { status: 400 })
  }

  // Verify animal belongs to this org
  const animal = await prisma.animal.findFirst({
    where: { id: body.animalId, clerkOrganizationId: orgId },
  })
  if (!animal) return NextResponse.json({ error: 'Animal not found' }, { status: 404 })

  // Block transfers for animals in NPWS-approved permanent care
  if (animal.status === 'PERMANENT_CARE') {
    return NextResponse.json({ error: 'This animal is in NPWS-approved permanent care and cannot be transferred. Any change to placement must go through a new NPWS approval process.' }, { status: 422 })
  }

  // Validate transfer compliance
  const validation = validateTransferRecord({
    transferType: body.transferType || 'INTERNAL_CARER',
    transferAuthorizedBy: body.transferAuthorizedBy,
    reasonForTransfer: body.reasonForTransfer,
    receivingEntity: body.receivingEntity,
    receivingLicense: body.receivingLicense,
  })
  if (!validation.allowed) {
    return NextResponse.json({ error: validation.reason }, { status: 422 })
  }

  // If permanent care placement, verify there's an approved application
  if (body.transferType === 'PERMANENT_CARE_PLACEMENT') {
    const approvedApp = await prisma.permanentCareApplication.findFirst({
      where: { animalId: body.animalId, clerkOrganizationId: orgId, status: 'APPROVED' },
    })
    if (!approvedApp) {
      return NextResponse.json({ error: 'Permanent care placement requires an approved permanent care application' }, { status: 422 })
    }
  }

  const transferType = body.transferType || 'INTERNAL_CARER'

  // Determine the new animal status based on transfer type
  // Internal carer transfers preserve the animal's current status (just changing carer, not disposition)
  const statusForType: Record<string, string> = {
    INTER_ORGANISATION: 'TRANSFERRED',
    VET_TRANSFER: 'TRANSFERRED',
    PERMANENT_CARE_PLACEMENT: 'PERMANENT_CARE',
    RELEASE_TRANSFER: 'TRANSFERRED',
  }
  const newStatus = transferType === 'INTERNAL_CARER' ? animal.status : (statusForType[transferType] || 'TRANSFERRED')

  try {
    // Create transfer and update animal status in a single transaction
    const [transfer, updatedAnimal] = await prisma.$transaction([
      prisma.animalTransfer.create({
        data: {
          animalId: body.animalId,
          transferDate: parsedTransferDate,
          transferType,
          reasonForTransfer: body.reasonForTransfer,
          fromCarerId: body.fromCarerId || null,
          toCarerId: body.toCarerId || null,
          receivingEntity: body.receivingEntity,
          receivingEntityType: body.receivingEntityType || null,
          receivingLicense: body.receivingLicense || null,
          receivingContactName: body.receivingContactName || null,
          receivingContactPhone: body.receivingContactPhone || null,
          receivingContactEmail: body.receivingContactEmail || null,
          receivingOrgAnimalId: body.receivingOrgAnimalId || null,
          receivingAuthorityType: body.receivingAuthorityType || null,
          authorityEvidenceUrl: body.authorityEvidenceUrl || null,
          receivingAddress: body.receivingAddress || null,
          receivingSuburb: body.receivingSuburb || null,
          receivingState: body.receivingState || null,
          receivingPostcode: body.receivingPostcode || null,
          transferAuthorizedBy: body.transferAuthorizedBy,
          transferNotes: body.transferNotes || null,
          documents: body.documents || null,
          clerkUserId: userId,
          clerkOrganizationId: orgId,
        },
      }),
      prisma.animal.update({
        where: { id: body.animalId },
        data: {
          status: newStatus as any,
          ...(transferType !== 'INTERNAL_CARER' ? { outcomeDate: parsedTransferDate, outcomeReason: body.reasonForTransfer } : {}),
        },
      }),
    ])

    logAudit({
      userId, orgId, action: 'CREATE', entity: 'AnimalTransfer', entityId: transfer.id,
      metadata: { animalId: body.animalId, transferType, newAnimalStatus: newStatus },
    })

    return NextResponse.json({ transfer, updatedAnimal }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create transfer' }, { status: 500 })
  }
}
