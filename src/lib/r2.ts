import 'server-only';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';

const isR2Configured =
  !!process.env.R2_ENDPOINT &&
  !!process.env.R2_ACCESS_KEY_ID &&
  !!process.env.R2_SECRET_ACCESS_KEY &&
  !!process.env.R2_BUCKET;

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
 * Upload a file. Uses Cloudflare R2 when configured,
 * otherwise falls back to local /public/uploads/ directory.
 */
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  if (isR2Configured) {
    const s3 = getS3Client();
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    return `${process.env.R2_PUBLIC_BASE_URL}/${key}`;
  }

  // Local fallback: write to public/uploads/
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', path.dirname(key));
  await fs.mkdir(uploadsDir, { recursive: true });
  const filePath = path.join(process.cwd(), 'public', 'uploads', key);
  await fs.writeFile(filePath, body);
  return `/uploads/${key}`;
}
