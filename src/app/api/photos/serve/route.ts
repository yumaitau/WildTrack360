import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getObjectFromS3, extractOrgIdFromKey } from '@/lib/s3'

/**
 * Authenticated photo proxy.
 *
 * Usage: GET /api/photos/serve?key=orgs/{orgId}/animals/{animalId}/{file}
 *
 * This route:
 *  1. Authenticates the requesting user via Clerk
 *  2. Extracts the orgId embedded in the S3 key
 *  3. Verifies the user belongs to that org
 *  4. Returns the image from S3 with appropriate cache headers
 *
 * If any check fails the request is rejected — photos are NEVER
 * accessible outside their owning organisation.
 */
export async function GET(request: Request) {
  // 1. Authenticate
  const { userId, orgId } = await auth()

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  if (!orgId) {
    return new NextResponse('No active organization', { status: 403 })
  }

  // 2. Get the S3 key from the query parameter
  const { searchParams } = new URL(request.url)
  const s3Key = searchParams.get('key')
  if (!s3Key) {
    return new NextResponse('Missing key parameter', { status: 400 })
  }

  // 3. Extract the orgId from the key and validate ownership
  const keyOrgId = extractOrgIdFromKey(s3Key)
  if (!keyOrgId) {
    return new NextResponse('Invalid photo key', { status: 400 })
  }
  if (keyOrgId !== orgId) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // 4. Fetch from S3 and return
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
  } catch (error: any) {
    const statusCode = error?.$metadata?.httpStatusCode
    const errorCode = error?.Code || error?.name
    console.error('Photo proxy error:', { s3Key, errorCode, statusCode })

    if (errorCode === 'NoSuchKey' || statusCode === 404) {
      return new NextResponse('Photo not found', { status: 404 })
    }
    if (errorCode === 'AccessDenied' || statusCode === 403) {
      return new NextResponse('Storage access denied', { status: 502 })
    }
    return new NextResponse('Failed to retrieve photo', { status: 500 })
  }
}
