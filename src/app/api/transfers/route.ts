import { NextResponse } from 'next/server'
import { auth } from '@/lib/clerk-server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getUserRole, hasPermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { validateTransferRecord } from '@/lib/compliance-guardrails'
import { animalUpdateForTransfer, newAnimalStatusForTransfer, type TransferType } from '@/lib/transfer-effects'
import { route } from '@/lib/openapi/route'
import { listTransfersContract, createTransferContract } from './openapi'

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

export const GET = route(listTransfersContract, async ({ query }) => {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const where: Record<string, unknown> = { clerkOrganizationId: orgId }
    if (query.animalId) where.animalId = query.animalId
    const transfers = await prisma.animalTransfer.findMany({
      where,
      include: { animal: { select: { id: true, name: true, species: true } } },
      orderBy: { transferDate: 'desc' },
    })
    return { data: transfers }
  } catch {
    return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 })
  }
})

export const POST = route(createTransferContract, async ({ body }) => {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = await getUserRole(userId, orgId)
  if (!hasPermission(role, 'compliance:manage_transfers'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsedTransferDate = new Date(body.transferDate)
  if (isNaN(parsedTransferDate.getTime()))
    return NextResponse.json({ error: 'transferDate is not a valid date' }, { status: 400 })

  const animal = await prisma.animal.findFirst({ where: { id: body.animalId, clerkOrganizationId: orgId } })
  if (!animal) return NextResponse.json({ error: 'Animal not found' }, { status: 404 })

  if (animal.status === 'PERMANENT_CARE')
    return NextResponse.json({ error: 'This animal is in NPWS-approved permanent care and cannot be transferred. Any change to placement must go through a new NPWS approval process.' }, { status: 422 })

  const transferType = parseTransferType(body.transferType)
  if (!transferType)
    return NextResponse.json({ error: `transferType must be one of: ${VALID_TRANSFER_TYPES.join(', ')}` }, { status: 400 })

  const validation = validateTransferRecord({
    transferType,
    transferAuthorizedBy: body.transferAuthorizedBy ?? undefined,
    reasonForTransfer: body.reasonForTransfer,
    receivingEntity: body.receivingEntity,
    receivingLicense: body.receivingLicense ?? undefined,
  })
  if (!validation.allowed) return NextResponse.json({ error: validation.reason }, { status: 422 })

  const toCarerIdTrimmed =
    typeof body.toCarerId === 'string' && body.toCarerId.trim().length > 0
      ? body.toCarerId.trim()
      : null

  if (transferType === 'INTERNAL_CARER') {
    if (!toCarerIdTrimmed)
      return NextResponse.json({ error: 'toCarerId is required for INTERNAL_CARER transfers.' }, { status: 422 })
    const toCarer = await prisma.carerProfile.findFirst({ where: { id: toCarerIdTrimmed, clerkOrganizationId: orgId }, select: { id: true } })
    if (!toCarer)
      return NextResponse.json({ error: 'toCarerId must reference a carer in this organisation.' }, { status: 422 })
  }

  if (transferType === 'PERMANENT_CARE_PLACEMENT') {
    const approvedApp = await prisma.permanentCareApplication.findFirst({ where: { animalId: body.animalId, clerkOrganizationId: orgId, status: 'APPROVED' } })
    if (!approvedApp)
      return NextResponse.json({ error: 'Permanent care placement requires an approved permanent care application' }, { status: 422 })
  }

  const newStatus = newAnimalStatusForTransfer(transferType, animal.status)
  const animalPatch: Prisma.AnimalUpdateInput = animalUpdateForTransfer({
    transferType,
    newStatus,
    toCarerId: toCarerIdTrimmed,
    transferDate: parsedTransferDate,
    reasonForTransfer: body.reasonForTransfer,
  })

  try {
    const [transfer, updatedAnimal] = await prisma.$transaction([
      prisma.animalTransfer.create({
        data: {
          animalId: body.animalId,
          transferDate: parsedTransferDate,
          transferType,
          reasonForTransfer: body.reasonForTransfer,
          fromCarerId: body.fromCarerId ?? null,
          toCarerId: toCarerIdTrimmed,
          receivingEntity: body.receivingEntity,
          receivingEntityType: body.receivingEntityType ?? null,
          receivingLicense: body.receivingLicense ?? null,
          receivingContactName: body.receivingContactName ?? null,
          receivingContactPhone: body.receivingContactPhone ?? null,
          receivingContactEmail: body.receivingContactEmail ?? null,
          receivingOrgAnimalId: body.receivingOrgAnimalId ?? null,
          receivingAuthorityType: body.receivingAuthorityType ?? null,
          authorityEvidenceUrl: body.authorityEvidenceUrl ?? null,
          receivingAddress: body.receivingAddress ?? null,
          receivingSuburb: body.receivingSuburb ?? null,
          receivingState: body.receivingState ?? null,
          receivingPostcode: body.receivingPostcode ?? null,
          transferAuthorizedBy: body.transferAuthorizedBy ?? null,
          transferNotes: body.transferNotes ?? null,
          documents: body.documents ?? null,
          clerkUserId: userId,
          clerkOrganizationId: orgId,
        },
      }),
      prisma.animal.update({ where: { id: body.animalId }, data: animalPatch }),
    ])
    logAudit({ userId, orgId, action: 'CREATE', entity: 'AnimalTransfer', entityId: transfer.id, metadata: { animalId: body.animalId, transferType, newAnimalStatus: newStatus } })
    return { data: { transfer, updatedAnimal }, status: 201 as const }
  } catch {
    return NextResponse.json({ error: 'Failed to create transfer' }, { status: 500 })
  }
})
