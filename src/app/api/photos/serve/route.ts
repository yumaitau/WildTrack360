import { NextResponse } from 'next/server'
import { auth } from '@/lib/clerk-server'
import { getObjectFromS3, extractOrgIdFromKey } from '@/lib/s3'
import { route } from '@/lib/openapi/route'
import { servePhotoContract } from '../openapi'

export const GET = route(servePhotoContract, async ({ query }) => {
  const { userId, orgId } = await auth()

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  if (!orgId) {
    return new NextResponse('No active organization', { status: 403 })
  }

  const s3Key = query.key

  const keyOrgId = extractOrgIdFromKey(s3Key)
  if (!keyOrgId) {
    return new NextResponse('Invalid photo key', { status: 400 })
  }
  if (keyOrgId !== orgId) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  try {
    const { body, contentType } = await getObjectFromS3(s3Key)

    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(body.length),
        'Cache-Control': 'private, max-age=3600, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error: unknown) {
    const err = error as { $metadata?: { httpStatusCode?: number }; Code?: string; name?: string }
    const statusCode = err?.$metadata?.httpStatusCode
    const errorCode = err?.Code || err?.name
    console.error('Photo proxy error:', { s3Key, errorCode, statusCode })

    if (errorCode === 'NoSuchKey' || statusCode === 404) {
      return new NextResponse('Photo not found', { status: 404 })
    }
    if (errorCode === 'AccessDenied' || statusCode === 403) {
      return new NextResponse('Storage access denied', { status: 502 })
    }
    return new NextResponse('Failed to retrieve photo', { status: 500 })
  }
})
