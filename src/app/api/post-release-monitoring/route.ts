import { NextResponse } from 'next/server'
import { auth } from '@/lib/clerk-server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { getUserRole, hasPermission } from '@/lib/rbac'
import { route } from '@/lib/openapi/route'
import { listPRMContract, createPRMContract } from './openapi'

export const GET = route(listPRMContract, async ({ query }) => {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  try {
    const records = await prisma.postReleaseMonitoring.findMany({
      where: { clerkOrganizationId: orgId, ...(query.animalId ? { animalId: query.animalId } : {}) },
      include: { animal: { select: { name: true, species: true } } },
      orderBy: { date: 'desc' },
    })
    return { data: records }
  } catch {
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 })
  }
})

export const POST = route(createPRMContract, async ({ body }) => {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })

  const role = await getUserRole(userId, orgId)
  if (!hasPermission(role, 'compliance:manage_post_release')) {
    if (!hasPermission(role, 'animal:edit_own')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const animal = await prisma.animal.findFirst({
    where: { id: body.animalId, clerkOrganizationId: orgId },
  })
  if (!animal) return NextResponse.json({ error: 'Animal not found' }, { status: 404 })

  if (!hasPermission(role, 'compliance:manage_post_release') && animal.carerId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const created = await prisma.postReleaseMonitoring.create({
      data: {
        animalId: body.animalId,
        date: body.date ? new Date(body.date) : new Date(),
        time: body.time ?? null,
        location: body.location ?? null,
        coordinates: body.coordinates ?? null,
        animalCondition: body.animalCondition ?? null,
        notes: body.notes,
        photos: body.photos ?? null,
        clerkUserId: userId,
        clerkOrganizationId: orgId,
      },
    })
    logAudit({ userId, orgId, action: 'CREATE', entity: 'PostReleaseMonitoring', entityId: created.id, metadata: { animalId: body.animalId } })
    return { data: created, status: 201 as const }
  } catch {
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 })
  }
})
