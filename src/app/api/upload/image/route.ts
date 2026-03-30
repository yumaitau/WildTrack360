import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { randomUUID } from 'crypto'
import { uploadToS3 } from '@/lib/s3'
import { logAudit } from '@/lib/audit'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/**
 * Simple image upload endpoint — uploads a file to S3 and returns the S3 key.
 * No database record is created. Used for the Animal.photo (primary photo) field.
 * The key is served via the authenticated proxy at /api/photos/[...key].
 */
export async function POST(request: Request) {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB' }, { status: 400 })
    }

    const uuid = randomUUID()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const key = `orgs/${orgId}/animal-photos/${uuid}-${sanitizedName}`

    const buffer = Buffer.from(await file.arrayBuffer())
    // Returns the S3 key (NOT a public URL) — objects are private
    const s3Key = await uploadToS3(buffer, key, file.type)

    logAudit({
      userId,
      orgId,
      action: 'CREATE',
      entity: 'AnimalPhoto',
      entityId: null,
      metadata: { s3Key, fileName: file.name },
    })

    return NextResponse.json({ url: s3Key }, { status: 201 })
  } catch (error: any) {
    console.error('Image upload error:', error)
    const message = 'Upload failed. Please try again.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
