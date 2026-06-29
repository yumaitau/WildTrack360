import { NextResponse } from 'next/server'
import { auth } from '@/lib/clerk-server'
import { prisma } from '@/lib/prisma'
import { getUserRole, hasPermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { route } from '@/lib/openapi/route'
import { getTransferContract, updateTransferContract, deleteTransferContract } from '../openapi'

export const GET = route(getTransferContract, async ({ params }) => {
  const { id } = params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const transfer = await prisma.animalTransfer.findFirst({
      where: { id, clerkOrganizationId: orgId },
      include: { animal: { select: { id: true, name: true, species: true } } },
    })
    if (!transfer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return { data: transfer }
  } catch {
    return NextResponse.json({ error: 'Failed to fetch transfer' }, { status: 500 })
  }
})

export const PATCH = route(updateTransferContract, async ({ params, body }) => {
  const { id } = params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = await getUserRole(userId, orgId)
  if (!hasPermission(role, 'compliance:manage_transfers'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const existing = await prisma.animalTransfer.findFirst({ where: { id, clerkOrganizationId: orgId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const b = body as Record<string, unknown>
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
      if (field in b) {
        safeFields[field] = (field === 'transferDate' || field === 'verifiedAt')
          ? (b[field] ? new Date(b[field] as string) : null)
          : b[field]
      }
    }
    const updated = await prisma.animalTransfer.update({ where: { id }, data: safeFields })
    logAudit({ userId, orgId, action: 'UPDATE', entity: 'AnimalTransfer', entityId: id, metadata: { fields: Object.keys(safeFields) } })
    return { data: updated }
  } catch {
    return NextResponse.json({ error: 'Failed to update transfer' }, { status: 500 })
  }
})

export const DELETE = route(deleteTransferContract, async ({ params }) => {
  const { id } = params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = await getUserRole(userId, orgId)
  if (!hasPermission(role, 'compliance:manage_transfers'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const existing = await prisma.animalTransfer.findFirst({ where: { id, clerkOrganizationId: orgId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await prisma.animalTransfer.delete({ where: { id } })
    logAudit({ userId, orgId, action: 'DELETE', entity: 'AnimalTransfer', entityId: id, metadata: { animalId: existing.animalId } })
    return { data: { ok: true } }
  } catch {
    return NextResponse.json({ error: 'Failed to delete transfer' }, { status: 500 })
  }
})
