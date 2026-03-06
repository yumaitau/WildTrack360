import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET(request: Request) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const callLogs = await prisma.callLog.findMany({
      where: { clerkOrganizationId: orgId },
      include: { animal: { select: { id: true, name: true, species: true } } },
      orderBy: { dateTime: 'desc' },
    })
    return NextResponse.json(callLogs)
  } catch (error) {
    console.error('Error fetching call logs:', error)
    return NextResponse.json({ error: 'Failed to fetch call logs' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Resolve the current user's name for takenByUserName
  let userName: string | null = null
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null
  } catch {
    // proceed without name
  }

  try {
    // Verify the target animal belongs to this org
    if (body.animalId) {
      const animal = await prisma.animal.findFirst({
        where: { id: body.animalId, clerkOrganizationId: orgId },
      })
      if (!animal) {
        return NextResponse.json({ error: 'Animal not found in this organization' }, { status: 400 })
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const callLog = await tx.callLog.create({
        data: {
          dateTime: body.dateTime ? new Date(body.dateTime) : new Date(),
          status: body.status || 'OPEN',
          callerName: body.callerName,
          callerPhone: body.callerPhone ?? null,
          callerEmail: body.callerEmail ?? null,
          species: body.species ?? null,
          location: body.location ?? null,
          coordinates: body.coordinates ?? null,
          suburb: body.suburb ?? null,
          postcode: body.postcode ?? null,
          notes: body.notes ?? null,
          reason: body.reason ?? null,
          referrer: body.referrer ?? null,
          action: body.action ?? null,
          outcome: body.outcome ?? null,
          takenByUserId: userId,
          takenByUserName: userName,
          assignedToUserId: body.assignedToUserId ?? null,
          assignedToUserName: body.assignedToUserName ?? null,
          animalId: body.animalId ?? null,
          clerkOrganizationId: orgId,
        },
      })

      // If linked to an animal, create a record on the animal's timeline
      if (callLog.animalId) {
        const parts = [
          `Call from ${callLog.callerName}`,
          callLog.reason ? `Reason: ${callLog.reason}` : null,
          callLog.action ? `Action: ${callLog.action}` : null,
          callLog.outcome ? `Outcome: ${callLog.outcome}` : null,
          callLog.referrer ? `Referred by: ${callLog.referrer}` : null,
        ].filter(Boolean)

        await tx.record.create({
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

      return callLog
    })

    logAudit({ userId, orgId, action: 'CREATE', entity: 'CallLog', entityId: created.id, metadata: { callerName: body.callerName, reason: body.reason } })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Error creating call log:', error)
    return NextResponse.json({ error: 'Failed to create call log' }, { status: 500 })
  }
}
