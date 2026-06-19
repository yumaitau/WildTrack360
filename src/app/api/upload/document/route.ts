import { NextResponse } from 'next/server'
import { auth } from '@/lib/clerk-server'
import { randomUUID } from 'node:crypto'
import { uploadToS3 } from '@/lib/s3'
import { getUserRole, hasPermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { route } from '@/lib/openapi/route'
import { uploadDocumentContract } from '../openapi'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const PDF_MAGIC = '%PDF-'

export const POST = route(uploadDocumentContract, async ({ request }) => {
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

    const header = buffer.subarray(0, 5).toString('ascii')
    if (header !== PDF_MAGIC) {
      return NextResponse.json({ error: 'Invalid file. Only PDF files are allowed.' }, { status: 400 })
    }

    const uuid = randomUUID()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const key = `orgs/${orgId}/documents/${uuid}-${sanitizedName}`

    const s3Key = await uploadToS3(buffer, key, 'application/pdf')

    logAudit({ userId, orgId, action: 'CREATE', entity: 'Document', entityId: null, metadata: { s3Key, fileName: file.name } })
    return { data: { key: s3Key, fileName: file.name }, status: 201 as const }
  } catch {
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }
})
