import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { deleteObjectFromS3 } from '@/lib/s3'
import { getUserRole, hasPermission, canAccessAnimal } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

/**
 * DELETE /api/photos/:id
 *
 * Deletes a gallery photo (Photo record + S3 object).
 *
 * Access rules:
 *  - ADMIN / COORDINATOR_ALL: can delete any photo in their org
 *  - COORDINATOR: can delete photos for animals in their species group
 *  - CARER / CARER_ALL: can delete photos ONLY if the animal is directly
 *    assigned to them as carer
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })

  const { id } = await params

  // Fetch the photo and verify org ownership
  const photo = await prisma.photo.findFirst({
    where: { id, clerkOrganizationId: orgId },
    include: { animal: { select: { id: true, name: true, species: true, carerId: true } } },
  })
  if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 })

  // RBAC check: admins & coordinators can edit any animal they can access,
  // carers can only manage photos for animals assigned to them
  const role = await getUserRole(userId, orgId)

  if (hasPermission(role, 'animal:edit_any')) {
    // ADMIN / COORDINATOR_ALL / COORDINATOR — verify species-level access
    if (photo.animal) {
      const allowed = await canAccessAnimal(userId, orgId, photo.animal)
      if (!allowed) {
        return NextResponse.json({ error: 'You do not have access to this animal' }, { status: 403 })
      }
    }
  } else if (hasPermission(role, 'animal:edit_own')) {
    // CARER / CARER_ALL — only if the animal is assigned to them
    if (!photo.animal || photo.animal.carerId !== userId) {
      return NextResponse.json(
        { error: 'You can only manage photos for animals assigned to you' },
        { status: 403 }
      )
    }
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Delete from S3 first — if this fails, do not remove the DB record
    await deleteObjectFromS3(photo.url)

    // Delete the DB record
    await prisma.photo.delete({ where: { id } })

    // Audit log
    logAudit({
      userId,
      orgId,
      action: 'DELETE',
      entity: 'Photo',
      entityId: id,
      metadata: {
        animalId: photo.animalId,
        animalName: photo.animal?.name,
        description: photo.description,
        s3Key: photo.url,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Photo delete error:', error)
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
  }
}
