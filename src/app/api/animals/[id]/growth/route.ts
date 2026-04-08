import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { canAccessAnimal, getUserRole } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    const animal = await prisma.animal.findFirst({
      where: { id, clerkOrganizationId: orgId },
    })
    if (!animal) return NextResponse.json({ error: 'Animal not found' }, { status: 404 })

    const role = await getUserRole(userId, orgId)
    if (role === 'CARER' && animal.carerId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (role === 'COORDINATOR') {
      const allowed = await canAccessAnimal(userId, orgId, animal)
      if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const measurements = await prisma.growthMeasurement.findMany({
      where: { animalId: id, clerkOrganizationId: orgId },
      orderBy: { date: 'asc' },
    })

    return NextResponse.json(measurements)
  } catch (error) {
    console.error('Error fetching growth measurements:', error)
    return NextResponse.json({ error: 'Failed to fetch growth measurements' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    const animal = await prisma.animal.findFirst({
      where: { id, clerkOrganizationId: orgId },
    })
    if (!animal) return NextResponse.json({ error: 'Animal not found' }, { status: 404 })

    const role = await getUserRole(userId, orgId)
    if (role === 'CARER' && animal.carerId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (role === 'COORDINATOR') {
      const allowed = await canAccessAnimal(userId, orgId, animal)
      if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    const measurement = await prisma.growthMeasurement.create({
      data: {
        animalId: id,
        date: new Date(body.date),
        weightGrams: body.weightGrams ?? null,
        headLengthMm: body.headLengthMm ?? null,
        earLengthMm: body.earLengthMm ?? null,
        armLengthMm: body.armLengthMm ?? null,
        legLengthMm: body.legLengthMm ?? null,
        footLengthMm: body.footLengthMm ?? null,
        tailLengthMm: body.tailLengthMm ?? null,
        bodyLengthMm: body.bodyLengthMm ?? null,
        wingLengthMm: body.wingLengthMm ?? null,
        notes: body.notes ?? null,
        clerkUserId: userId,
        clerkOrganizationId: orgId,
      },
    })

    logAudit({
      userId,
      orgId,
      action: 'CREATE',
      entity: 'GrowthMeasurement',
      entityId: measurement.id,
      metadata: { animalId: id },
    })

    return NextResponse.json(measurement, { status: 201 })
  } catch (error) {
    console.error('Error creating growth measurement:', error)
    return NextResponse.json({ error: 'Failed to create growth measurement' }, { status: 500 })
  }
}
