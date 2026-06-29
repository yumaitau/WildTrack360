import { NextResponse } from 'next/server'
import { auth } from '@/lib/clerk-server'
import { prisma } from '@/lib/prisma'
import { deleteObjectFromS3 } from '@/lib/s3'
import { getUserRole, hasPermission, canAccessAnimal } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { route } from '@/lib/openapi/route'
import { deletePhotoContract } from '../../openapi'

export const DELETE = route(deletePhotoContract, async ({ params }) => {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })

  const { id } = params

  const photo = await prisma.photo.findFirst({
    where: { id, clerkOrganizationId: orgId },
    include: { animal: { select: { id: true, name: true, species: true, carerId: true } } },
  })
  if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 })

  const role = await getUserRole(userId, orgId)

  if (hasPermission(role, 'animal:edit_any')) {
    if (photo.animal) {
      const allowed = await canAccessAnimal(userId, orgId, photo.animal)
      if (!allowed) {
        return NextResponse.json({ error: 'You do not have access to this animal' }, { status: 403 })
      }
    }
  } else if (hasPermission(role, 'animal:edit_own')) {
    if (!photo.animal || photo.animal.carerId !== userId) {
      return NextResponse.json({ error: 'You can only manage photos for animals assigned to you' }, { status: 403 })
    }
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await deleteObjectFromS3(photo.url)
    await prisma.photo.delete({ where: { id } })

    logAudit({
      userId, orgId, action: 'DELETE', entity: 'Photo', entityId: id,
      metadata: { animalId: photo.animalId, animalName: photo.animal?.name, description: photo.description, s3Key: photo.url },
    })

    return { data: { success: true } }
  } catch {
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
  }
})
