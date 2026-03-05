import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

const LOOKUP_MODELS = {
  reason: 'callLogReason',
  referrer: 'callLogReferrer',
  action: 'callLogAction',
  outcome: 'callLogOutcome',
} as const

type LookupType = keyof typeof LOOKUP_MODELS

function getModel(type: LookupType) {
  const modelName = LOOKUP_MODELS[type]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any)[modelName]
}

export async function GET(request: Request) {
  const { userId, orgId: activeOrgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('orgId') || activeOrgId || undefined
  const type = searchParams.get('type') as LookupType | null
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })

  try {
    // If type is specified, return just that lookup list; otherwise return all four
    if (type && LOOKUP_MODELS[type]) {
      const items = await getModel(type).findMany({
        where: { clerkOrganizationId: orgId },
        orderBy: { displayOrder: 'asc' },
      })
      return NextResponse.json({ [type]: items })
    }

    const [reasons, referrers, actions, outcomes] = await Promise.all([
      prisma.callLogReason.findMany({ where: { clerkOrganizationId: orgId }, orderBy: { displayOrder: 'asc' } }),
      prisma.callLogReferrer.findMany({ where: { clerkOrganizationId: orgId }, orderBy: { displayOrder: 'asc' } }),
      prisma.callLogAction.findMany({ where: { clerkOrganizationId: orgId }, orderBy: { displayOrder: 'asc' } }),
      prisma.callLogOutcome.findMany({ where: { clerkOrganizationId: orgId }, orderBy: { displayOrder: 'asc' } }),
    ])
    return NextResponse.json({ reason: reasons, referrer: referrers, action: actions, outcome: outcomes })
  } catch (error) {
    console.error('Error fetching call log lookups:', error)
    return NextResponse.json({ error: 'Failed to fetch lookups' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { userId, orgId: activeOrgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const orgId = body.clerkOrganizationId || activeOrgId || undefined
  const type = body.type as LookupType
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  if (!type || !LOOKUP_MODELS[type]) return NextResponse.json({ error: 'Invalid lookup type' }, { status: 400 })
  if (!body.label?.trim()) return NextResponse.json({ error: 'Label is required' }, { status: 400 })

  try {
    const created = await getModel(type).create({
      data: {
        label: body.label.trim(),
        displayOrder: body.displayOrder ?? 0,
        active: body.active ?? true,
        clerkOrganizationId: orgId,
      },
    })
    logAudit({ userId, orgId, action: 'CREATE', entity: `CallLog${type.charAt(0).toUpperCase() + type.slice(1)}`, entityId: created.id, metadata: { label: body.label } })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Error creating lookup:', error)
    return NextResponse.json({ error: 'Failed to create lookup item' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const { userId, orgId: activeOrgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const orgId = body.clerkOrganizationId || activeOrgId || undefined
  const type = body.type as LookupType
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  if (!type || !LOOKUP_MODELS[type]) return NextResponse.json({ error: 'Invalid lookup type' }, { status: 400 })
  if (!body.id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

  try {
    const updateData: Record<string, unknown> = {}
    if (body.label !== undefined) updateData.label = body.label.trim()
    if (body.displayOrder !== undefined) updateData.displayOrder = body.displayOrder
    if (body.active !== undefined) updateData.active = body.active

    const updated = await getModel(type).update({
      where: { id: body.id },
      data: updateData,
    })
    logAudit({ userId, orgId, action: 'UPDATE', entity: `CallLog${type.charAt(0).toUpperCase() + type.slice(1)}`, entityId: body.id, metadata: { fields: Object.keys(updateData) } })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating lookup:', error)
    return NextResponse.json({ error: 'Failed to update lookup item' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { userId, orgId: activeOrgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('orgId') || activeOrgId || undefined
  const type = searchParams.get('type') as LookupType | null
  const id = searchParams.get('id')
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  if (!type || !LOOKUP_MODELS[type]) return NextResponse.json({ error: 'Invalid lookup type' }, { status: 400 })
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

  try {
    await getModel(type).delete({ where: { id } })
    logAudit({ userId, orgId, action: 'DELETE', entity: `CallLog${type.charAt(0).toUpperCase() + type.slice(1)}`, entityId: id })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting lookup:', error)
    return NextResponse.json({ error: 'Failed to delete lookup item' }, { status: 500 })
  }
}
