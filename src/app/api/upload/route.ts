import { NextResponse } from 'next/server'
import { auth } from '@/lib/clerk-server'
import { randomUUID } from 'node:crypto'
import { uploadToS3, deleteObjectFromS3 } from '@/lib/s3'
import { prisma } from '@/lib/prisma'
import { getUserRole, hasPermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { route } from '@/lib/openapi/route'
import { uploadPhotoContract } from './openapi'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export const POST = route(uploadPhotoContract, async ({ request }) => {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const animalId = formData.get('animalId') as string | null
    const description = formData.get('description') as string | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!animalId) return NextResponse.json({ error: 'Animal ID is required' }, { status: 400 })
    if (!description) return NextResponse.json({ error: 'Description is required' }, { status: 400 })

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB' }, { status: 400 })
    }

    const animal = await prisma.animal.findFirst({
      where: { id: animalId, clerkOrganizationId: orgId },
    })
    if (!animal) return NextResponse.json({ error: 'Animal not found' }, { status: 404 })

    const role = await getUserRole(userId, orgId)
    if (hasPermission(role, 'animal:edit_any')) {
      // Admin/Coordinator - allowed for any animal in their org
    } else if (hasPermission(role, 'animal:edit_own')) {
      if (animal.carerId !== userId) {
        return NextResponse.json({ error: 'You can only upload photos for animals assigned to you' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const uuid = randomUUID()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const key = `orgs/${orgId}/animals/${animalId}/${uuid}-${sanitizedName}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const s3Key = await uploadToS3(buffer, key, file.type)

    let photo
    try {
      photo = await prisma.photo.create({
        data: {
          url: s3Key,
          description,
          date: new Date(),
          animalId,
          clerkUserId: userId,
          clerkOrganizationId: orgId,
        },
      })
    } catch (dbError) {
      try { await deleteObjectFromS3(s3Key) } catch { /* best effort */ }
      throw dbError
    }

    logAudit({ userId, orgId, action: 'CREATE', entity: 'Photo', entityId: photo.id, metadata: { animalId, description, s3Key } })
    return { data: photo, status: 201 as const }
  } catch {
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }
})
