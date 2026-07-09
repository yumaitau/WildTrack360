import { NextResponse } from 'next/server'
import { auth } from '@/lib/clerk-server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { canAccessAnimal } from '@/lib/rbac'
import { route } from '@/lib/openapi/route'
import { deleteRecordContract } from '../openapi'

export const DELETE = route(deleteRecordContract, async ({ params }) => {
  const { id } = params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const existing = await prisma.record.findFirst({
      where: { id, clerkOrganizationId: orgId, deletedAt: null },
      include: { animal: { select: { species: true, carerId: true } } },
    })
    if (!existing) return NextResponse.json({ error: 'Record not found' }, { status: 404 })

    const allowed = await canAccessAnimal(userId, orgId, existing.animal)
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Soft delete: immutable ledger — retain the row, flag it as deleted so it
    // disappears from the UI but remains in the database and data exports.
    await prisma.record.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: userId } })
    logAudit({ userId, orgId, action: 'DELETE', entity: 'Record', entityId: id, metadata: { type: existing.type, animalId: existing.animalId, softDelete: true } })
    return { data: { success: true } }
  } catch {
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
  }
})
