import { NextResponse } from 'next/server';
import { getSessionForPublicAccess } from '@/lib/pindrop';
import { uploadToR2 } from '@/lib/r2';
import { nanoid } from 'nanoid';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PHOTOS_PER_SESSION = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

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
    return NextResponse.json(
      { error: 'Session already submitted' },
      { status: 409 }
    );
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
    return NextResponse.json(
      { error: 'File must be under 10MB' },
      { status: 400 }
    );
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const key = `pindrop/${sessionId}/${nanoid()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const url = await uploadToR2(key, buffer, file.type);

  return NextResponse.json({ url });
}
