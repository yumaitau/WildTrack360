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
    const created = await prisma.callLog.create({
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
    logAudit({ userId, orgId, action: 'CREATE', entity: 'CallLog', entityId: created.id, metadata: { callerName: body.callerName, reason: body.reason } })

    // If linked to an animal, create a record on the animal's timeline
    if (created.animalId) {
      const parts = [
        `Call from ${created.callerName}`,
        created.reason ? `Reason: ${created.reason}` : null,
        created.action ? `Action: ${created.action}` : null,
        created.outcome ? `Outcome: ${created.outcome}` : null,
        created.referrer ? `Referred by: ${created.referrer}` : null,
      ].filter(Boolean)

      await prisma.record.create({
        data: {
          type: 'OTHER',
          date: created.dateTime,
          description: `[CallLog:${created.id}] ${parts.join(' | ')}`,
          location: [created.location, created.suburb, created.postcode].filter(Boolean).join(', ') || null,
          notes: created.notes,
          animalId: created.animalId,
          clerkUserId: userId,
          clerkOrganizationId: orgId,
        },
      })
    }

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Error creating call log:', error)
    return NextResponse.json({ error: 'Failed to create call log' }, { status: 500 })
  }
}
