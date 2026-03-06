import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { logAudit } from '@/lib/audit'

async function createCallLogRecord(callLog: any, userId: string, orgId: string, tx?: any) {
  const db = tx || prisma
  const parts = [
    `Call from ${callLog.callerName}`,
    callLog.reason ? `Reason: ${callLog.reason}` : null,
    callLog.action ? `Action: ${callLog.action}` : null,
    callLog.outcome ? `Outcome: ${callLog.outcome}` : null,
    callLog.referrer ? `Referred by: ${callLog.referrer}` : null,
  ].filter(Boolean)

  await db.record.create({
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

    // Validate that body is a plain object
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 })
    }

    // Validate animalId if provided
    if (body.animalId !== undefined && body.animalId !== null) {
      if (typeof body.animalId !== 'string' || body.animalId.trim() === '') {
        return NextResponse.json({ error: 'animalId must be a non-empty string' }, { status: 400 })
      }
    }

    // Validate dateTime if provided
    if (body.dateTime !== undefined) {
      const parsed = new Date(body.dateTime)
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'dateTime must be a valid date' }, { status: 400 })
      }
    }

    // Validate assignedToUserId if provided
    if (body.assignedToUserId !== undefined && body.assignedToUserId !== null) {
      if (typeof body.assignedToUserId !== 'string' || body.assignedToUserId.trim() === '') {
        return NextResponse.json({ error: 'assignedToUserId must be a non-empty string' }, { status: 400 })
      }
    }

    // Ensure the call log belongs to this org
    const existing = await prisma.callLog.findFirst({
      where: { id, clerkOrganizationId: orgId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Call log not found' }, { status: 404 })
    }

    // Verify the target animal belongs to this org
    if (body.animalId) {
      const animal = await prisma.animal.findFirst({
        where: { id: body.animalId, clerkOrganizationId: orgId },
      })
      if (!animal) {
        return NextResponse.json({ error: 'Animal not found in this organization' }, { status: 403 })
      }
    }

    const updateData = {
      ...(body.dateTime !== undefined ? { dateTime: new Date(body.dateTime) } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.callerName !== undefined ? { callerName: body.callerName } : {}),
      ...(body.callerPhone !== undefined ? { callerPhone: body.callerPhone } : {}),
      ...(body.callerEmail !== undefined ? { callerEmail: body.callerEmail } : {}),
      ...(body.species !== undefined ? { species: body.species } : {}),
      ...(body.location !== undefined ? { location: body.location } : {}),
      ...(body.coordinates !== undefined ? { coordinates: body.coordinates } : {}),
      ...(body.suburb !== undefined ? { suburb: body.suburb } : {}),
      ...(body.postcode !== undefined ? { postcode: body.postcode } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.reason !== undefined ? { reason: body.reason } : {}),
      ...(body.referrer !== undefined ? { referrer: body.referrer } : {}),
      ...(body.action !== undefined ? { action: body.action } : {}),
      ...(body.outcome !== undefined ? { outcome: body.outcome } : {}),
      ...(body.assignedToUserId !== undefined ? { assignedToUserId: body.assignedToUserId } : {}),
      ...(body.assignedToUserName !== undefined ? { assignedToUserName: body.assignedToUserName } : {}),
      ...(body.animalId !== undefined ? { animalId: body.animalId } : {}),
    }

    const callLog = await prisma.$transaction(async (tx) => {
      const updated = await tx.callLog.update({
        where: { id },
        data: updateData,
      })

      // If an animal was newly linked or changed to a different animal, create a record on the animal's timeline
      const animalChanged = updated.animalId && updated.animalId !== existing.animalId
      if (animalChanged) {
        await createCallLogRecord(updated, userId, orgId, tx)
      }

      return updated
    })

    logAudit({ userId, orgId, action: 'UPDATE', entity: 'CallLog', entityId: id, metadata: { fields: Object.keys(body) } })

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
