import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { logAudit } from '@/lib/audit'
import { getUserRole, hasPermission } from '@/lib/rbac'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const record = await prisma.postReleaseMonitoring.findFirst({
      where: { id, clerkOrganizationId: orgId },
      include: { animal: { select: { name: true, species: true } } },
    })
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }
    return NextResponse.json(record)
  } catch (error) {
    console.error('Error fetching post-release record:', error)
    return NextResponse.json({ error: 'Failed to fetch record' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = await getUserRole(userId, orgId)
  if (!hasPermission(role, 'compliance:manage_post_release')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Verify record belongs to this org
    const existing = await prisma.postReleaseMonitoring.findFirst({
      where: { id, clerkOrganizationId: orgId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    const body = await request.json()

    // Allowlist safe fields
    const safeData: Record<string, unknown> = {}
    if (body.date !== undefined) safeData.date = new Date(body.date)
    if (body.time !== undefined) safeData.time = body.time
    if (body.location !== undefined) safeData.location = body.location
    if (body.coordinates !== undefined) safeData.coordinates = body.coordinates
    if (body.animalCondition !== undefined) safeData.animalCondition = body.animalCondition
    if (body.notes !== undefined) safeData.notes = body.notes
    if (body.photos !== undefined) safeData.photos = body.photos

    const record = await prisma.postReleaseMonitoring.update({
      where: { id },
      data: {
        ...safeData,
        clerkUserId: userId,
        clerkOrganizationId: orgId,
      },
    })

    logAudit({
      userId,
      orgId,
      action: 'UPDATE',
      entity: 'PostReleaseMonitoring',
      entityId: id,
      metadata: { fields: Object.keys(safeData) },
    })
    return NextResponse.json(record)
  } catch (error) {
    console.error('Error updating post-release record:', error)
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = await getUserRole(userId, orgId)
  if (!hasPermission(role, 'compliance:manage_post_release')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Verify record belongs to this org before deleting
    const existing = await prisma.postReleaseMonitoring.findFirst({
      where: { id, clerkOrganizationId: orgId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    await prisma.postReleaseMonitoring.delete({ where: { id } })
    logAudit({
      userId,
      orgId,
      action: 'DELETE',
      entity: 'PostReleaseMonitoring',
      entityId: id,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting post-release record:', error)
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
  }
}
