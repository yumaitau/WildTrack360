import { NextResponse } from 'next/server';
import { getSessionForPublicAccess } from '@/lib/pindrop';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { nanoid } from 'nanoid';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PHOTOS_PER_SESSION = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

function getS3Client() {
  return new S3Client({
    region: process.env.S3_REGION || 'ap-southeast-2',
    endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
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

  if (session.photoUrls.length >= MAX_PHOTOS_PER_SESSION) {
    return NextResponse.json(
      { error: `Maximum ${MAX_PHOTOS_PER_SESSION} photos allowed` },
      { status: 400 }
    );
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

  const rawExt = (file.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  const key = `pindrop/${session.clerkOrganizationId}/${sessionId}/${nanoid()}.${rawExt}`;
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

  // Return the S3 key — the authenticated photo serve route will handle access
  return NextResponse.json({ url: key });
}
