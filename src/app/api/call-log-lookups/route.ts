import { NextResponse } from 'next/server'
import { auth } from '@/lib/clerk-server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { seedCallLogDefaults } from '@/lib/call-log-defaults'
import { route } from '@/lib/openapi/route'
import { listLookupsContract, createLookupContract, updateLookupContract, deleteLookupContract } from './openapi'

const LOOKUP_MODELS = {
  reason: 'callLogReason',
  referrer: 'callLogReferrer',
  action: 'callLogAction',
  outcome: 'callLogOutcome',
} as const

type LookupType = keyof typeof LOOKUP_MODELS

function getModel(type: LookupType) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any)[LOOKUP_MODELS[type]]
}

export const GET = route(listLookupsContract, async ({ query }) => {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const type = query.type as LookupType | undefined
  try {
    if (type && LOOKUP_MODELS[type]) {
      const items = await getModel(type).findMany({ where: { clerkOrganizationId: orgId }, orderBy: { displayOrder: 'asc' } })
      return { data: { [type]: items } }
    }
    await seedCallLogDefaults(orgId)
    const [reasons, referrers, actions, outcomes] = await Promise.all([
      prisma.callLogReason.findMany({ where: { clerkOrganizationId: orgId }, orderBy: { displayOrder: 'asc' } }),
      prisma.callLogReferrer.findMany({ where: { clerkOrganizationId: orgId }, orderBy: { displayOrder: 'asc' } }),
      prisma.callLogAction.findMany({ where: { clerkOrganizationId: orgId }, orderBy: { displayOrder: 'asc' } }),
      prisma.callLogOutcome.findMany({ where: { clerkOrganizationId: orgId }, orderBy: { displayOrder: 'asc' } }),
    ])
    return { data: { reason: reasons, referrer: referrers, action: actions, outcome: outcomes } }
  } catch {
    return NextResponse.json({ error: 'Failed to fetch lookups' }, { status: 500 })
  }
})

export const POST = route(createLookupContract, async ({ body }) => {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const type = body.type as LookupType
  if (!LOOKUP_MODELS[type]) return NextResponse.json({ error: 'Invalid lookup type' }, { status: 400 })
  try {
    const created = await getModel(type).create({
      data: { label: body.label.trim(), displayOrder: body.displayOrder ?? 0, active: body.active ?? true, clerkOrganizationId: orgId },
    })
    logAudit({ userId, orgId, action: 'CREATE', entity: `CallLog${type.charAt(0).toUpperCase() + type.slice(1)}`, entityId: created.id, metadata: { label: body.label } })
    return { data: created, status: 201 as const }
  } catch {
    return NextResponse.json({ error: 'Failed to create lookup item' }, { status: 500 })
  }
})

export const PATCH = route(updateLookupContract, async ({ body }) => {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const type = body.type as LookupType
  if (!LOOKUP_MODELS[type]) return NextResponse.json({ error: 'Invalid lookup type' }, { status: 400 })
  try {
    const existing = await getModel(type).findFirst({ where: { id: body.id, clerkOrganizationId: orgId } })
    if (!existing) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    const updateData: Record<string, unknown> = {}
    if (body.label !== undefined) {
      const trimmed = body.label.trim()
      if (!trimmed) return NextResponse.json({ error: 'Label cannot be empty' }, { status: 400 })
      updateData.label = trimmed
    }
    if (body.displayOrder !== undefined) updateData.displayOrder = body.displayOrder
    if (body.active !== undefined) updateData.active = body.active
    const updated = await getModel(type).update({ where: { id: body.id }, data: updateData })
    logAudit({ userId, orgId, action: 'UPDATE', entity: `CallLog${type.charAt(0).toUpperCase() + type.slice(1)}`, entityId: body.id, metadata: { fields: Object.keys(updateData) } })
    return { data: updated }
  } catch {
    return NextResponse.json({ error: 'Failed to update lookup item' }, { status: 500 })
  }
})

export const DELETE = route(deleteLookupContract, async ({ query }) => {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const type = query.type as LookupType
  const id = query.id
  if (!LOOKUP_MODELS[type]) return NextResponse.json({ error: 'Invalid lookup type' }, { status: 400 })
  try {
    const existing = await getModel(type).findFirst({ where: { id, clerkOrganizationId: orgId } })
    if (!existing) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    await getModel(type).delete({ where: { id } })
    logAudit({ userId, orgId, action: 'DELETE', entity: `CallLog${type.charAt(0).toUpperCase() + type.slice(1)}`, entityId: id })
    return { data: { success: true } }
  } catch {
    return NextResponse.json({ error: 'Failed to delete lookup item' }, { status: 500 })
  }
})
