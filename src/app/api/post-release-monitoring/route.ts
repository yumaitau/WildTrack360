import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { getUserRole, hasPermission } from '@/lib/rbac'

export async function GET(request: Request) {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const animalId = searchParams.get('animalId') || undefined

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
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })

  const role = await getUserRole(userId, orgId)
  if (!hasPermission(role, 'compliance:manage_post_release')) {
    // Also allow carers editing their own animal (checked via animal ownership below)
    // but first verify at least edit_own permission
    if (!hasPermission(role, 'animal:edit_own')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await request.json()

  // Validate required fields
  if (!body.animalId || typeof body.animalId !== 'string') {
    return NextResponse.json({ error: 'animalId is required' }, { status: 400 })
  }
  if (typeof body.notes !== 'string' || body.notes.trim().length === 0) {
    return NextResponse.json({ error: 'notes is required and must not be empty' }, { status: 400 })
  }

  // Verify the animal belongs to this org
  const animal = await prisma.animal.findFirst({
    where: { id: body.animalId, clerkOrganizationId: orgId },
  })
  if (!animal) {
    return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
  }

  // If user only has edit_own (not manage_post_release), verify they are the assigned carer
  if (!hasPermission(role, 'compliance:manage_post_release') && animal.carerId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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
