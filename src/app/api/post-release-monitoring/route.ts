import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET(request: Request) {
  const { userId, orgId: activeOrgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('orgId') || activeOrgId || undefined
  const animalId = searchParams.get('animalId') || undefined
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })

  try {
    const records = await prisma.postReleaseMonitoring.findMany({
      where: {
        clerkOrganizationId: orgId,
        ...(animalId ? { animalId } : {}),
      },
      include: { animal: { select: { name: true, species: true } } },
      orderBy: { date: 'desc' },
    })
    return NextResponse.json(records)
  } catch (error) {
    console.error('Error fetching post-release monitoring records:', error)
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { userId, orgId: activeOrgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const orgId = body.clerkOrganizationId || activeOrgId || undefined
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })

  try {
    const created = await prisma.postReleaseMonitoring.create({
      data: {
        animalId: body.animalId,
        date: body.date ? new Date(body.date) : new Date(),
        time: body.time || null,
        location: body.location || null,
        coordinates: body.coordinates || null,
        animalCondition: body.animalCondition || null,
        notes: body.notes,
        photos: body.photos || null,
        clerkUserId: userId,
        clerkOrganizationId: orgId,
      },
    })
    logAudit({
      userId,
      orgId,
      action: 'CREATE',
      entity: 'PostReleaseMonitoring',
      entityId: created.id,
      metadata: { animalId: body.animalId },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Error creating post-release monitoring record:', error)
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 })
  }
}
