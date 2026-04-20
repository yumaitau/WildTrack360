import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getUserRole, hasPermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { validateTransferRecord } from '@/lib/compliance-guardrails'
import { animalUpdateForTransfer, newAnimalStatusForTransfer, type TransferType } from '@/lib/transfer-effects'

const VALID_TRANSFER_TYPES: readonly TransferType[] = [
  'INTERNAL_CARER',
  'INTER_ORGANISATION',
  'VET_TRANSFER',
  'PERMANENT_CARE_PLACEMENT',
  'RELEASE_TRANSFER',
] as const

function parseTransferType(raw: unknown): TransferType | null {
  if (raw == null || raw === '') return 'INTERNAL_CARER'
  return VALID_TRANSFER_TYPES.includes(raw as TransferType) ? (raw as TransferType) : null
}

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

  // Narrow transferType to the Prisma enum; reject unknown values up front.
  const transferType = parseTransferType(body.transferType)
  if (!transferType) {
    return NextResponse.json(
      { error: `transferType must be one of: ${VALID_TRANSFER_TYPES.join(', ')}` },
      { status: 400 },
    )
  }

  // Validate transfer compliance
  const validation = validateTransferRecord({
    transferType,
    transferAuthorizedBy: body.transferAuthorizedBy,
    reasonForTransfer: body.reasonForTransfer,
    receivingEntity: body.receivingEntity,
    receivingLicense: body.receivingLicense,
  })
  if (!validation.allowed) {
    return NextResponse.json({ error: validation.reason }, { status: 422 })
  }

  // Internal carer transfers must name the new carer, and that carer must
  // belong to this org — otherwise Animal.carerId ends up pointing at a
  // stranger and the NSW "Rehabilitator name" column becomes nonsense.
  if (transferType === 'INTERNAL_CARER') {
    const toCarerId = typeof body.toCarerId === 'string' ? body.toCarerId.trim() : ''
    if (!toCarerId) {
      return NextResponse.json(
        { error: 'toCarerId is required for INTERNAL_CARER transfers.' },
        { status: 422 },
      )
    }
    const toCarer = await prisma.carerProfile.findFirst({
      where: { id: toCarerId, clerkOrganizationId: orgId },
      select: { id: true },
    })
    if (!toCarer) {
      return NextResponse.json(
        { error: 'toCarerId must reference a carer in this organisation.' },
        { status: 422 },
      )
    }
  }

  // If permanent care placement, verify there's an approved application
  if (transferType === 'PERMANENT_CARE_PLACEMENT') {
    const approvedApp = await prisma.permanentCareApplication.findFirst({
      where: { animalId: body.animalId, clerkOrganizationId: orgId, status: 'APPROVED' },
    })
    if (!approvedApp) {
      return NextResponse.json({ error: 'Permanent care placement requires an approved permanent care application' }, { status: 422 })
    }
  }

  const newStatus = newAnimalStatusForTransfer(transferType, animal.status)
  const animalPatch = animalUpdateForTransfer({
    transferType,
    newStatus,
    toCarerId: body.toCarerId,
    transferDate: parsedTransferDate,
    reasonForTransfer: body.reasonForTransfer,
  })

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
        data: animalPatch as any,
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
