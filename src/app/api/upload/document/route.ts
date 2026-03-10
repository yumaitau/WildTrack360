import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { randomUUID } from 'crypto'
import { uploadToS3 } from '@/lib/s3'
import { getUserRole, hasPermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const PDF_MAGIC = '%PDF-'

/**
 * Document upload endpoint — uploads a PDF to S3 and returns the S3 key.
 * Used for vet reports and other compliance documents.
 */
export async function POST(request: Request) {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })

  const role = await getUserRole(userId, orgId)
  if (!hasPermission(role, 'compliance:draft_permanent_care')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 20MB.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Validate PDF magic bytes (more reliable than client-supplied MIME type)
    const header = buffer.subarray(0, 5).toString('ascii')
    if (header !== PDF_MAGIC) {
      return NextResponse.json({ error: 'Invalid file. Only PDF files are allowed.' }, { status: 400 })
    }

    const uuid = randomUUID()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const key = `orgs/${orgId}/documents/${uuid}-${sanitizedName}`

    const s3Key = await uploadToS3(buffer, key, 'application/pdf')

    logAudit({
      userId,
      orgId,
      action: 'CREATE',
      entity: 'Document',
      entityId: null,
      metadata: { s3Key, fileName: file.name },
    })

    return NextResponse.json({ key: s3Key, fileName: file.name }, { status: 201 })
  } catch (error: any) {
    console.error('Document upload error:', error)
    const message = error?.Code === 'AccessDenied'
      ? 'Storage access denied. Please check S3/Wasabi credentials and bucket configuration.'
      : 'Upload failed. Please try again.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
