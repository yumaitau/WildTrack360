import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { updateAnimal, deleteAnimal } from '@/lib/database'
import { prisma } from '@/lib/prisma'
import { canAccessAnimal, getUserRole, hasPermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json()

  try {
    // Fetch the animal to check access
    const animal = await prisma.animal.findFirst({
      where: { id, clerkOrganizationId: orgId },
    })
    if (!animal) return NextResponse.json({ error: 'Animal not found' }, { status: 404 })

    const role = await getUserRole(userId, orgId)

    // Fail-closed: explicitly enumerate allowed roles
    if (role === 'CARER' || role === 'CARER_ALL') {
      // Can only edit animals assigned to them
      if (animal.carerId !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (role === 'COORDINATOR') {
      // Can edit animals in their species groups
      const allowed = await canAccessAnimal(userId, orgId, animal)
      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (role === 'ADMIN' || role === 'COORDINATOR_ALL') {
      // Can always edit — no additional check needed
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await updateAnimal(id, body)
    logAudit({ userId, orgId, action: 'UPDATE', entity: 'Animal', entityId: id, metadata: { fields: Object.keys(body) } })
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update animal' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    // Only ADMIN can delete animals
    const role = await getUserRole(userId, orgId)
    if (!hasPermission(role, 'animal:delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await deleteAnimal(id, orgId)
    logAudit({ userId, orgId, action: 'DELETE', entity: 'Animal', entityId: id })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : ''
    if (message === 'Animal not found') {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete animal' }, { status: 500 })
  }
}
