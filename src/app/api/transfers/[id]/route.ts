import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getUserRole, hasPermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    const transfer = await prisma.animalTransfer.findFirst({
      where: { id, clerkOrganizationId: orgId },
      include: { animal: { select: { id: true, name: true, species: true } } },
    })
    if (!transfer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(transfer)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch transfer' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json()

  const role = await getUserRole(userId, orgId)
  if (!hasPermission(role, 'compliance:manage_transfers')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const existing = await prisma.animalTransfer.findFirst({
      where: { id, clerkOrganizationId: orgId },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const safeFields: Record<string, unknown> = {}
    const allowedFields = [
      'transferDate', 'transferType', 'reasonForTransfer', 'fromCarerId', 'toCarerId',
      'receivingEntity', 'receivingEntityType', 'receivingLicense',
      'receivingContactName', 'receivingContactPhone', 'receivingContactEmail',
      'receivingOrgAnimalId', 'receivingAuthorityType', 'authorityEvidenceUrl',
      'receivingAddress', 'receivingSuburb', 'receivingState', 'receivingPostcode',
      'transferAuthorizedBy', 'verifiedByUserId', 'verifiedAt', 'transferNotes', 'documents',
    ]
    for (const field of allowedFields) {
      if (field in body) {
        if (field === 'transferDate' || field === 'verifiedAt') {
          safeFields[field] = body[field] ? new Date(body[field]) : null
        } else {
          safeFields[field] = body[field]
        }
      }
    }

    const updated = await prisma.animalTransfer.update({
      where: { id },
      data: safeFields,
    })
    logAudit({ userId, orgId, action: 'UPDATE', entity: 'AnimalTransfer', entityId: id, metadata: { fields: Object.keys(safeFields) } })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Failed to update transfer' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const role = await getUserRole(userId, orgId)
  if (!hasPermission(role, 'compliance:manage_transfers')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const existing = await prisma.animalTransfer.findFirst({
      where: { id, clerkOrganizationId: orgId },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.animalTransfer.delete({ where: { id } })
    logAudit({ userId, orgId, action: 'DELETE', entity: 'AnimalTransfer', entityId: id, metadata: { animalId: existing.animalId } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete transfer' }, { status: 500 })
  }
}
