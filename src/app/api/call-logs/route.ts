import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET(request: Request) {
  const { userId, orgId: activeOrgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('orgId') || activeOrgId || undefined
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })

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
  const { userId, orgId: activeOrgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const orgId = body.clerkOrganizationId || activeOrgId || undefined
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })

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
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Error creating call log:', error)
    return NextResponse.json({ error: 'Failed to create call log' }, { status: 500 })
  }
}
