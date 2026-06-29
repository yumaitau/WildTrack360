import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/clerk-server'
import { logAudit } from '@/lib/audit'
import { route } from '@/lib/openapi/route'
import { getCallLogContract, updateCallLogContract, deleteCallLogContract } from '../openapi'

async function createCallLogRecord(callLog: Record<string, unknown>, userId: string, orgId: string, tx?: typeof prisma) {
  const db = tx ?? prisma
  const parts = [
    `Call from ${callLog.callerName}`,
    callLog.reason ? `Reason: ${callLog.reason}` : null,
    callLog.action ? `Action: ${callLog.action}` : null,
    callLog.outcome ? `Outcome: ${callLog.outcome}` : null,
    callLog.referrer ? `Referred by: ${callLog.referrer}` : null,
  ].filter(Boolean)
  await (db as typeof prisma).record.create({
    data: {
      type: 'OTHER',
      date: callLog.dateTime as Date,
      description: `[CallLog:${callLog.id}] ${parts.join(' | ')}`,
      location: [callLog.location, callLog.suburb, callLog.postcode].filter(Boolean).join(', ') || null,
      notes: callLog.notes as string | null,
      animalId: callLog.animalId as string,
      clerkUserId: userId,
      clerkOrganizationId: orgId,
    },
  })
}

export const GET = route(getCallLogContract, async ({ params }) => {
  const { id } = params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const callLog = await prisma.callLog.findFirst({
      where: { id, clerkOrganizationId: orgId },
      include: { animal: { select: { id: true, name: true, species: true } } },
    })
    if (!callLog) return NextResponse.json({ error: 'Call log not found' }, { status: 404 })
    return { data: callLog }
  } catch {
    return NextResponse.json({ error: 'Failed to fetch call log' }, { status: 500 })
  }
})

export const PATCH = route(updateCallLogContract, async ({ params, body }) => {
  const { id } = params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = body as Record<string, unknown>

  if (b.animalId !== undefined && b.animalId !== null) {
    if (typeof b.animalId !== 'string' || (b.animalId as string).trim() === '')
      return NextResponse.json({ error: 'animalId must be a non-empty string' }, { status: 400 })
  }
  if (b.dateTime !== undefined) {
    if (isNaN(new Date(b.dateTime as string).getTime()))
      return NextResponse.json({ error: 'dateTime must be a valid date' }, { status: 400 })
  }
  if (b.assignedToUserId !== undefined && b.assignedToUserId !== null) {
    if (typeof b.assignedToUserId !== 'string' || (b.assignedToUserId as string).trim() === '')
      return NextResponse.json({ error: 'assignedToUserId must be a non-empty string' }, { status: 400 })
  }

  try {
    const existing = await prisma.callLog.findFirst({ where: { id, clerkOrganizationId: orgId } })
    if (!existing) return NextResponse.json({ error: 'Call log not found' }, { status: 404 })

    if (b.animalId) {
      const animal = await prisma.animal.findFirst({ where: { id: b.animalId as string, clerkOrganizationId: orgId } })
      if (!animal) return NextResponse.json({ error: 'Animal not found in this organization' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}
    if (b.dateTime !== undefined) updateData.dateTime = new Date(b.dateTime as string)
    for (const f of ['status', 'callerName', 'callerPhone', 'callerEmail', 'species', 'location', 'coordinates', 'suburb', 'postcode', 'notes', 'reason', 'referrer', 'action', 'outcome', 'assignedToUserId', 'assignedToUserName', 'animalId']) {
      if (f in b) updateData[f] = b[f]
    }

    const callLog = await prisma.$transaction(async (tx) => {
      const updated = await tx.callLog.update({ where: { id }, data: updateData })
      const animalChanged = updated.animalId && updated.animalId !== existing.animalId
      if (animalChanged) await createCallLogRecord(updated as unknown as Record<string, unknown>, userId, orgId, tx as unknown as typeof prisma)
      return updated
    })

    logAudit({ userId, orgId, action: 'UPDATE', entity: 'CallLog', entityId: id, metadata: { fields: Object.keys(b) } })
    return { data: callLog }
  } catch {
    return NextResponse.json({ error: 'Failed to update call log' }, { status: 500 })
  }
})

export const DELETE = route(deleteCallLogContract, async ({ params }) => {
  const { id } = params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const existing = await prisma.callLog.findFirst({ where: { id, clerkOrganizationId: orgId } })
    if (!existing) return NextResponse.json({ error: 'Call log not found' }, { status: 404 })
    await prisma.callLog.delete({ where: { id } })
    logAudit({ userId, orgId, action: 'DELETE', entity: 'CallLog', entityId: id })
    return { data: { success: true } }
  } catch {
    return NextResponse.json({ error: 'Failed to delete call log' }, { status: 500 })
  }
})
