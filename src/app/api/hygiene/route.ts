import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { userId, orgId: activeOrgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('orgId') || activeOrgId || undefined
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  try {
    const logs = await prisma.hygieneLog.findMany({
      where: { clerkUserId: userId, clerkOrganizationId: orgId },
      include: { carer: true }, // CarerProfile relation
      orderBy: { date: 'desc' },
    })
    return NextResponse.json(logs)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch hygiene logs' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { userId, orgId: activeOrgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const orgId = body.clerkOrganizationId || activeOrgId || undefined
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
        photos: body.photos ?? null,
        notes: body.notes ?? null,
        carerId: body.carerId,
        clerkUserId: userId,
        clerkOrganizationId: orgId,
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create hygiene log' }, { status: 500 })
  }
}


