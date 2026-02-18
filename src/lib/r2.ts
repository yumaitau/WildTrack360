import 'server-only';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

let _s3: S3Client | null = null;
function getS3Client(): S3Client {
  if (!_s3) {
    _s3 = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _s3;
}

/**
 * Upload a file to Cloudflare R2.
 */
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const isR2Configured =
    !!process.env.R2_ENDPOINT &&
    !!process.env.R2_ACCESS_KEY_ID &&
    !!process.env.R2_SECRET_ACCESS_KEY &&
    !!process.env.R2_BUCKET_NAME;

  if (!isR2Configured) {
    throw new Error(
      'R2 storage is not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME environment variables.'
    );
  }

  const s3 = getS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
