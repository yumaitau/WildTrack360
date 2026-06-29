import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/clerk-server'
import { clerkClient } from '@/lib/clerk-server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { route } from '@/lib/openapi/route'
import { listCallLogsContract, createCallLogContract } from './openapi'

export const GET = route(listCallLogsContract, async () => {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const callLogs = await prisma.callLog.findMany({
      where: { clerkOrganizationId: orgId },
      include: { animal: { select: { id: true, name: true, species: true } } },
      orderBy: { dateTime: 'desc' },
    })
    return { data: callLogs }
  } catch {
    return NextResponse.json({ error: 'Failed to fetch call logs' }, { status: 500 })
  }
})

export const POST = route(createCallLogContract, async ({ body }) => {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let userName: string | null = null
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null
  } catch {
    // proceed without name
  }

  try {
    if (body.animalId) {
      const animal = await prisma.animal.findFirst({ where: { id: body.animalId, clerkOrganizationId: orgId } })
      if (!animal) return NextResponse.json({ error: 'Animal not found in this organization' }, { status: 400 })
    }

    const created = await prisma.$transaction(async (tx) => {
      const callLog = await tx.callLog.create({
        data: {
          dateTime: body.dateTime ? new Date(body.dateTime) : new Date(),
          status: body.status ?? 'OPEN',
          callerName: body.callerName,
          callerPhone: body.callerPhone ?? null,
          callerEmail: body.callerEmail ?? null,
          species: body.species ?? null,
          location: body.location ?? null,
          coordinates: body.coordinates != null ? (body.coordinates as Prisma.InputJsonValue) : Prisma.DbNull,
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

      if (body.pindropSessionId) {
        const linked = await tx.pindropSession.updateMany({
          where: { id: body.pindropSessionId, clerkOrganizationId: orgId, callLogId: null },
          data: { callLogId: callLog.id },
        })
        if (linked.count === 0) {
          console.warn(`[CallLog] Pindrop session ${body.pindropSessionId} could not be linked to call log ${callLog.id} - already used or not found`)
        }
      }

      return callLog
    })

    logAudit({ userId, orgId, action: 'CREATE', entity: 'CallLog', entityId: created.id, metadata: { callerName: body.callerName, reason: body.reason } })
    return { data: created, status: 201 as const }
  } catch {
    return NextResponse.json({ error: 'Failed to create call log' }, { status: 500 })
  }
})
