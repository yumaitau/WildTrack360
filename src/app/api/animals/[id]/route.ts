import { NextResponse } from 'next/server'
import { auth } from '@/lib/clerk-server'
import { updateAnimal, deleteAnimal } from '@/lib/database'
import { prisma } from '@/lib/prisma'
import { Prisma, type AnimalStatus } from '@prisma/client'
import { canAccessAnimal, getUserRole, hasPermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { route } from '@/lib/openapi/route'
import { updateAnimalContract, deleteAnimalContract } from './openapi'

export const PATCH = route(updateAnimalContract, async ({ params, body }) => {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = params
  const data = { ...(body as Record<string, unknown>) }

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
      // Can always edit - no additional check needed
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Compliance guardrails: validate status transitions
    if (data.status && data.status !== animal.status) {
      const { validateStatusTransition } = await import('@/lib/compliance-guardrails')
      const result = await validateStatusTransition(id, orgId, data.status as AnimalStatus)
      if (!result.allowed) {
        // Allow admin override if explicitly requested
        if (!(data._overrideValidation && hasPermission(role, 'compliance:override_validation'))) {
          return NextResponse.json({ error: result.reason }, { status: 422 })
        }
        // Log the override
        logAudit({ userId, orgId, action: 'UPDATE', entity: 'Animal', entityId: id, metadata: { overrideReason: result.reason, newStatus: data.status } })
      }
    }

    // Remove internal flags before saving
    delete data._overrideValidation
    delete data._autoGenerateOrgAnimalId

    // Validate orgAnimalId uniqueness within org if it changed
    if (data.orgAnimalId && data.orgAnimalId !== animal.orgAnimalId) {
      const existing = await prisma.animal.findFirst({
        where: {
          clerkOrganizationId: orgId,
          orgAnimalId: data.orgAnimalId as string,
          id: { not: id },
        },
      })
      if (existing) {
        return NextResponse.json(
          { error: `Animal ID "${data.orgAnimalId}" is already in use by another animal in this organisation.` },
          { status: 422 }
        )
      }
    }

    const updated = await updateAnimal(id, data)
    logAudit({ userId, orgId, action: 'UPDATE', entity: 'Animal', entityId: id, metadata: { fields: Object.keys(data) } })
    return { data: updated }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json(
        { error: `Animal ID "${data.orgAnimalId}" is already in use by another animal in this organisation.` },
        { status: 422 }
      )
    }
    return NextResponse.json({ error: 'Failed to update animal' }, { status: 500 })
  }
})

export const DELETE = route(deleteAnimalContract, async ({ params }) => {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = params

  try {
    // Only ADMIN can delete animals
    const role = await getUserRole(userId, orgId)
    if (!hasPermission(role, 'animal:delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await deleteAnimal(id, orgId)
    logAudit({ userId, orgId, action: 'DELETE', entity: 'Animal', entityId: id })
    return { data: { ok: true } }
  } catch (e) {
    const message = e instanceof Error ? e.message : ''
    if (message === 'Animal not found') {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete animal' }, { status: 500 })
  }
})
