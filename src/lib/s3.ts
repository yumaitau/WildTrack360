import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'wildtrack360'

/**
 * Upload a file to S3 as a **private** object (no public access).
 * Returns the S3 key (NOT a public URL). All reads go through the
 * authenticated proxy at /api/photos/serve/[...key].
 */
export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // No ACL — objects are private by default
    })
  )

  return key
}

/**
 * Fetch a private object from S3. Returns the body as a Buffer and content type.
 * Used by the /api/photos proxy route after org-level auth.
 */
export async function getObjectFromS3(key: string): Promise<{
  body: Buffer
  contentType: string
}> {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  )

  const byteArray = await response.Body!.transformToByteArray()

  return {
    body: Buffer.from(byteArray),
    contentType: response.ContentType || 'application/octet-stream',
  }
}

/**
 * Delete a private object from S3.
 */
export async function deleteObjectFromS3(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  )
}

/**
 * Extract the orgId from an S3 key.
 * Keys follow either: orgs/{orgId}/... or pindrop/{orgId}/...
 */
export function extractOrgIdFromKey(key: string): string | null {
  const match = key.match(/^(?:orgs|pindrop)\/([^/]+)\//)
  return match ? match[1] : null
}

export { s3Client, BUCKET_NAME }
