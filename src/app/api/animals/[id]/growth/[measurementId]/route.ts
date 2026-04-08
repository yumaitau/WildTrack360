import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { canAccessAnimal, getUserRole, hasPermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; measurementId: string }> }
) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, measurementId } = await params

  try {
    // First verify access to the animal (same checks as GET/POST)
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

    // Now verify the measurement exists
    const measurement = await prisma.growthMeasurement.findFirst({
      where: { id: measurementId, animalId: id, clerkOrganizationId: orgId },
    })
    if (!measurement) {
      return NextResponse.json({ error: 'Measurement not found' }, { status: 404 })
    }

    // Within the authorized scope, only the creator or someone with edit_any can delete
    if (measurement.clerkUserId !== userId && !hasPermission(role, 'animal:edit_any')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.growthMeasurement.delete({ where: { id: measurementId } })

    logAudit({
      userId,
      orgId,
      action: 'DELETE',
      entity: 'GrowthMeasurement',
      entityId: measurementId,
      metadata: { animalId: id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting growth measurement:', error)
    return NextResponse.json({ error: 'Failed to delete measurement' }, { status: 500 })
  }
}
