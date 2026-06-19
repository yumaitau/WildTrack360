import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/clerk-server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { route } from '@/lib/openapi/route'
import { listHygieneLogsContract, createHygieneLogContract } from './openapi'

export const GET = route(listHygieneLogsContract, async () => {
  const { userId, orgId: activeOrgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = activeOrgId
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  try {
    const logs = await prisma.hygieneLog.findMany({
      where: { clerkUserId: userId, clerkOrganizationId: orgId },
      include: { carer: true },
      orderBy: { date: 'desc' },
    })
    return { data: logs }
  } catch {
    return NextResponse.json({ error: 'Failed to fetch hygiene logs' }, { status: 500 })
  }
})

export const POST = route(createHygieneLogContract, async ({ body }) => {
  const { userId, orgId: activeOrgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = activeOrgId
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  try {
    const created = await prisma.hygieneLog.create({
      data: {
        date: body.date ? new Date(body.date) : new Date(),
        type: body.type || 'DAILY',
        description: body.description || 'Daily hygiene log',
        completed: Boolean(body.completed ?? true),
        enclosureCleaned: Boolean(body.enclosureCleaned),
        ppeUsed: Boolean(body.ppeUsed),
        handwashAvailable: Boolean(body.handwashAvailable),
        feedingBowlsDisinfected: Boolean(body.feedingBowlsDisinfected),
        quarantineSignsPresent: Boolean(body.quarantineSignsPresent),
        photos: body.photos != null ? (body.photos as Prisma.InputJsonValue) : Prisma.DbNull,
        notes: body.notes ?? null,
        carerId: body.carerId,
        clerkUserId: userId,
        clerkOrganizationId: orgId,
      },
    })
    logAudit({ userId, orgId, action: 'CREATE', entity: 'HygieneLog', entityId: created.id, metadata: { type: created.type } })
    return { data: created, status: 201 as const }
  } catch {
    return NextResponse.json({ error: 'Failed to create hygiene log' }, { status: 500 })
  }
})


