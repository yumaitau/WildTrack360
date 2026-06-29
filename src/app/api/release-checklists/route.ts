import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/clerk-server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { route } from '@/lib/openapi/route'
import { listReleaseChecklistsContract, createReleaseChecklistContract } from './openapi'

export const GET = route(listReleaseChecklistsContract, async ({ query }) => {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  try {
    const where: Record<string, unknown> = { clerkUserId: userId, clerkOrganizationId: orgId }
    if (query.animalId) where.animalId = query.animalId
    if (query.completed != null) where.completed = query.completed === 'true'
    const checklists = await prisma.releaseChecklist.findMany({ where, orderBy: { releaseDate: 'desc' } })
    return { data: checklists }
  } catch {
    return NextResponse.json({ error: 'Failed to fetch release checklists' }, { status: 500 })
  }
})

export const POST = route(createReleaseChecklistContract, async ({ body }) => {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  try {
    const created = await prisma.releaseChecklist.create({
      data: {
        releaseDate: new Date(body.releaseDate),
        animalId: body.animalId,
        releaseLocation: body.releaseLocation,
        releaseCoordinates: body.releaseCoordinates != null ? (body.releaseCoordinates as Prisma.InputJsonValue) : Prisma.DbNull,
        within10km: Boolean(body.within10km ?? false),
        releaseType: body.releaseType,
        fitnessIndicators: Array.isArray(body.fitnessIndicators) ? body.fitnessIndicators : [],
        vetSignOff: body.vetSignOff != null ? (body.vetSignOff as Prisma.InputJsonValue) : Prisma.DbNull,
        photos: body.photos != null ? (body.photos as Prisma.InputJsonValue) : Prisma.DbNull,
        completed: Boolean(body.completed ?? true),
        notes: body.notes ?? null,
        clerkUserId: userId,
        clerkOrganizationId: orgId,
      },
    })
    logAudit({ userId, orgId, action: 'CREATE', entity: 'ReleaseChecklist', entityId: created.id, metadata: { animalId: body.animalId } })
    return { data: created, status: 201 as const }
  } catch {
    return NextResponse.json({ error: 'Failed to create release checklist' }, { status: 500 })
  }
})
