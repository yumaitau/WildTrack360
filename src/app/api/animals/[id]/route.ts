import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { updateAnimal, deleteAnimal } from '@/lib/database'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
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
    if (role === 'CARER') {
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
    } else if (role === 'ADMIN' || role === 'COORDINATOR_ALL' || role === 'CARER_ALL') {
      // Can always edit — no additional check needed
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Compliance guardrails: validate status transitions
    if (body.status && body.status !== animal.status) {
      const { validateStatusTransition } = await import('@/lib/compliance-guardrails')
      const result = await validateStatusTransition(id, orgId, body.status)
      if (!result.allowed) {
        // Allow admin override if explicitly requested
        if (!(body._overrideValidation && hasPermission(role, 'compliance:override_validation'))) {
          return NextResponse.json({ error: result.reason }, { status: 422 })
        }
        // Log the override
        logAudit({ userId, orgId, action: 'UPDATE', entity: 'Animal', entityId: id, metadata: { overrideReason: result.reason, newStatus: body.status } })
      }
    }

    // Remove internal flags before saving
    delete body._overrideValidation
    delete body._autoGenerateOrgAnimalId

    // Validate orgAnimalId uniqueness within org if it changed
    if (body.orgAnimalId && body.orgAnimalId !== animal.orgAnimalId) {
      const existing = await prisma.animal.findFirst({
        where: {
          clerkOrganizationId: orgId,
          orgAnimalId: body.orgAnimalId,
          id: { not: id },
        },
      })
      if (existing) {
        return NextResponse.json(
          { error: `Animal ID "${body.orgAnimalId}" is already in use by another animal in this organisation.` },
          { status: 422 }
        )
      }
    }

    const updated = await updateAnimal(id, body)
    logAudit({ userId, orgId, action: 'UPDATE', entity: 'Animal', entityId: id, metadata: { fields: Object.keys(body) } })
    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json(
        { error: `Animal ID "${body.orgAnimalId}" is already in use by another animal in this organisation.` },
        { status: 422 }
      )
    }
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
