import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/clerk-server'
import { logAudit } from '@/lib/audit'
import { route } from '@/lib/openapi/route'
import { getSpeciesByIdContract, updateSpeciesByIdContract, deleteSpeciesByIdContract } from '../openapi'

export const GET = route(getSpeciesByIdContract, async ({ params }) => {
  const { id } = params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const species = await prisma.species.findFirst({ where: { id, clerkOrganizationId: orgId } })
    if (!species) return NextResponse.json({ error: 'Species not found' }, { status: 404 })
    return { data: species }
  } catch {
    return NextResponse.json({ error: 'Failed to fetch species' }, { status: 500 })
  }
})

export const PATCH = route(updateSpeciesByIdContract, async ({ params, body }) => {
  const { id } = params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const existing = await prisma.species.findFirst({ where: { id, clerkOrganizationId: orgId } })
    if (!existing) return NextResponse.json({ error: 'Species not found or access denied' }, { status: 404 })
    const { id: _id, createdAt: _c, updatedAt: _u, clerkUserId: _cu, clerkOrganizationId: _co, ...updateData } = body as Record<string, unknown>
    const species = await prisma.species.update({ where: { id, clerkOrganizationId: orgId }, data: updateData })
    logAudit({ userId, orgId, action: 'UPDATE', entity: 'Species', entityId: id, metadata: { fields: Object.keys(updateData) } })
    return { data: species }
  } catch {
    return NextResponse.json({ error: 'Failed to update species' }, { status: 500 })
  }
})

export const DELETE = route(deleteSpeciesByIdContract, async ({ params }) => {
  const { id } = params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const existing = await prisma.species.findFirst({ where: { id, clerkOrganizationId: orgId } })
    if (!existing) return NextResponse.json({ error: 'Species not found or access denied' }, { status: 404 })
    await prisma.species.delete({ where: { id, clerkOrganizationId: orgId } })
    logAudit({ userId, orgId, action: 'DELETE', entity: 'Species', entityId: id, metadata: { name: existing.name } })
    return { data: { success: true } }
  } catch {
    return NextResponse.json({ error: 'Failed to delete species' }, { status: 500 })
  }
})
