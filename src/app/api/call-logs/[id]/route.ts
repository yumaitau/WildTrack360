import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { logAudit } from '@/lib/audit'

async function createCallLogRecord(callLog: any, userId: string, orgId: string) {
  const parts = [
    `Call from ${callLog.callerName}`,
    callLog.reason ? `Reason: ${callLog.reason}` : null,
    callLog.action ? `Action: ${callLog.action}` : null,
    callLog.outcome ? `Outcome: ${callLog.outcome}` : null,
    callLog.referrer ? `Referred by: ${callLog.referrer}` : null,
  ].filter(Boolean)

  await prisma.record.create({
    data: {
      type: 'OTHER',
      date: callLog.dateTime,
      description: `[CallLog:${callLog.id}] ${parts.join(' | ')}`,
      location: [callLog.location, callLog.suburb, callLog.postcode].filter(Boolean).join(', ') || null,
      notes: callLog.notes,
      animalId: callLog.animalId,
      clerkUserId: userId,
      clerkOrganizationId: orgId,
    },
  })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const callLog = await prisma.callLog.findFirst({
      where: { id, clerkOrganizationId: orgId },
      include: { animal: { select: { id: true, name: true, species: true } } },
    })

    if (!callLog) {
      return NextResponse.json({ error: 'Call log not found' }, { status: 404 })
    }

    return NextResponse.json(callLog)
  } catch (error) {
    console.error('Error fetching call log:', error)
    return NextResponse.json({ error: 'Failed to fetch call log' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Ensure the call log belongs to this org
    const existing = await prisma.callLog.findFirst({
      where: { id, clerkOrganizationId: orgId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Call log not found' }, { status: 404 })
    }

    const { clerkOrganizationId: _orgId, id: _id, createdAt: _c, ...updateData } = body

    const callLog = await prisma.callLog.update({
      where: { id },
      data: {
        ...updateData,
        ...(updateData.dateTime ? { dateTime: new Date(updateData.dateTime) } : {}),
      },
    })

    logAudit({ userId, orgId, action: 'UPDATE', entity: 'CallLog', entityId: id, metadata: { fields: Object.keys(body) } })

    // If an animal was newly linked or changed to a different animal, create a record on the animal's timeline
    const animalChanged = callLog.animalId && callLog.animalId !== existing.animalId
    if (animalChanged) {
      await createCallLogRecord(callLog, userId, orgId)
    }

    return NextResponse.json(callLog)
  } catch (error) {
    console.error('Error updating call log:', error)
    return NextResponse.json({ error: 'Failed to update call log' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const existing = await prisma.callLog.findFirst({
      where: { id, clerkOrganizationId: orgId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Call log not found' }, { status: 404 })
    }

    await prisma.callLog.delete({ where: { id } })

    logAudit({ userId, orgId, action: 'DELETE', entity: 'CallLog', entityId: id })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting call log:', error)
    return NextResponse.json({ error: 'Failed to delete call log' }, { status: 500 })
  }
}
