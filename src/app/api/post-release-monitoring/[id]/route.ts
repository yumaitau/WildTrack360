import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/clerk-server'
import { logAudit } from '@/lib/audit'
import { getUserRole, hasPermission } from '@/lib/rbac'
import { route } from '@/lib/openapi/route'
import { getPRMContract, updatePRMContract, deletePRMContract } from '../openapi'

export const GET = route(getPRMContract, async ({ params }) => {
  const { id } = params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const record = await prisma.postReleaseMonitoring.findFirst({
      where: { id, clerkOrganizationId: orgId },
      include: { animal: { select: { name: true, species: true } } },
    })
    if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    return { data: record }
  } catch {
    return NextResponse.json({ error: 'Failed to fetch record' }, { status: 500 })
  }
})

export const PATCH = route(updatePRMContract, async ({ params, body }) => {
  const { id } = params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = await getUserRole(userId, orgId)
  if (!hasPermission(role, 'compliance:manage_post_release'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const existing = await prisma.postReleaseMonitoring.findFirst({ where: { id, clerkOrganizationId: orgId } })
    if (!existing) return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    const safeData: Record<string, unknown> = {}
    const b = body as Record<string, unknown>
    if (b.date !== undefined) safeData.date = new Date(b.date as string)
    if (b.time !== undefined) safeData.time = b.time
    if (b.location !== undefined) safeData.location = b.location
    if (b.coordinates !== undefined) safeData.coordinates = b.coordinates
    if (b.animalCondition !== undefined) safeData.animalCondition = b.animalCondition
    if (b.notes !== undefined) safeData.notes = b.notes
    if (b.photos !== undefined) safeData.photos = b.photos
    const record = await prisma.postReleaseMonitoring.update({
      where: { id },
      data: { ...safeData, clerkUserId: userId, clerkOrganizationId: orgId } as Parameters<typeof prisma.postReleaseMonitoring.update>[0]['data'],
    })
    logAudit({ userId, orgId, action: 'UPDATE', entity: 'PostReleaseMonitoring', entityId: id, metadata: { fields: Object.keys(safeData) } })
    return { data: record }
  } catch {
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 })
  }
})

export const DELETE = route(deletePRMContract, async ({ params }) => {
  const { id } = params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = await getUserRole(userId, orgId)
  if (!hasPermission(role, 'compliance:manage_post_release'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const existing = await prisma.postReleaseMonitoring.findFirst({ where: { id, clerkOrganizationId: orgId } })
    if (!existing) return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    await prisma.postReleaseMonitoring.delete({ where: { id } })
    logAudit({ userId, orgId, action: 'DELETE', entity: 'PostReleaseMonitoring', entityId: id })
    return { data: { success: true } }
  } catch {
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
  }
})
