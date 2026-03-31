import { NextResponse } from 'next/server';
import { getSessionForPublicAccess } from '@/lib/pindrop';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PHOTOS_PER_SESSION = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);

function getS3Client() {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be configured');
  }
  return new S3Client({
    region: process.env.S3_REGION || 'ap-southeast-2',
    endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: !!process.env.S3_ENDPOINT,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('t');

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 });
  }

  const session = await getSessionForPublicAccess(sessionId, token);
  if (!session) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 404 });
  }

  if (session.status !== 'PENDING') {
    return NextResponse.json({ error: 'Session already submitted' }, { status: 409 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Only image files (JPEG, PNG, WebP, HEIC) are allowed' },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File must be under 10MB' }, { status: 400 });
  }

  // Derive a safe file extension from the filename, falling back to 'jpg'
  const dotParts = file.name.split('.');
  const rawExt = dotParts.length > 1
    ? dotParts.pop()!.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 10)
    : 'jpg';
  const ext = ALLOWED_EXTS.has(rawExt) ? rawExt : 'jpg';

  const key = `pindrop/${session.clerkOrganizationId}/${sessionId}/${nanoid()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const s3 = getS3Client();
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );
  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }

  // Atomically append the photo URL and enforce the limit in one transaction
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.pindropSession.findUniqueOrThrow({ where: { id: sessionId } });
      if (current.photoUrls.length >= MAX_PHOTOS_PER_SESSION) {
        throw new Error('PHOTO_LIMIT');
      }
      await tx.pindropSession.update({
        where: { id: sessionId },
        data: { photoUrls: [...current.photoUrls, key] },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'PHOTO_LIMIT') {
      return NextResponse.json({ error: `Maximum ${MAX_PHOTOS_PER_SESSION} photos allowed` }, { status: 400 });
    }
    console.error('Photo URL save error:', error);
    return NextResponse.json({ error: 'Failed to save photo reference' }, { status: 500 });
  }

  return NextResponse.json({ url: key });
}
