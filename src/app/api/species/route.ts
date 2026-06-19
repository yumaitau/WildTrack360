import { NextResponse } from 'next/server'
import { getSpecies, createSpecies } from '@/lib/database'
import { auth } from '@/lib/clerk-server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { route } from '@/lib/openapi/route'
import { listSpeciesContract, createSpeciesContract, renameSpeciesContract, deleteSpeciesByNameContract } from './openapi'

export const GET = route(listSpeciesContract, async () => {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  try {
    const species = await getSpecies(orgId)
    return { data: species }
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (message === 'Organization ID is required') return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    return NextResponse.json({ error: 'Failed to fetch species' }, { status: 500 })
  }
})

export const POST = route(createSpeciesContract, async ({ body }) => {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  try {
    const created = await createSpecies({
      name: body.name,
      scientificName: body.scientificName ?? null,
      type: body.type ?? null,
      description: body.description ?? null,
      careRequirements: body.careRequirements ?? null,
      clerkUserId: userId,
      clerkOrganizationId: orgId,
    })
    logAudit({ userId, orgId, action: 'CREATE', entity: 'Species', entityId: created.id, metadata: { name: body.name } })
    return { data: created, status: 201 as const }
  } catch {
    return NextResponse.json({ error: 'Failed to create species' }, { status: 500 })
  }
})

export const PATCH = route(renameSpeciesContract, async ({ body }) => {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const updated = await prisma.species.updateMany({
      where: { name: body.oldName, clerkOrganizationId: orgId },
      data: { name: body.newName },
    })
    if (updated.count > 0) logAudit({ userId, orgId, action: 'UPDATE', entity: 'Species', metadata: { oldName: body.oldName, newName: body.newName } })
    return { data: { count: updated.count } }
  } catch {
    return NextResponse.json({ error: 'Failed to update species' }, { status: 500 })
  }
})

export const DELETE = route(deleteSpeciesByNameContract, async ({ body }) => {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const deleted = await prisma.species.deleteMany({ where: { name: body.name, clerkOrganizationId: orgId } })
    if (deleted.count > 0) logAudit({ userId, orgId, action: 'DELETE', entity: 'Species', metadata: { name: body.name } })
    return { data: { count: deleted.count } }
  } catch {
    return NextResponse.json({ error: 'Failed to delete species' }, { status: 500 })
  }
})
