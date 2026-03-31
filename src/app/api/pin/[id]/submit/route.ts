import { NextResponse } from 'next/server';
import { getSessionForPublicAccess } from '@/lib/pindrop';
import { prisma } from '@/lib/prisma';

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
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
  }

  if (session.status !== 'PENDING') {
    return NextResponse.json(
      { error: 'This form has already been submitted' },
      { status: 409 }
    );
  }

  const body = await request.json();
  const { callerName, callerEmail, callerPhone, lat, lng, address, photoUrls, callerNotes } = body;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json(
      { error: 'Please drop a pin on the map to mark the location' },
      { status: 400 }
    );
  }

  // Validate photoUrls — only allow S3 keys that belong to this session
  const expectedPrefix = `pindrop/${session.clerkOrganizationId}/${sessionId}/`;
  const safePhotoUrls = Array.isArray(photoUrls)
    ? photoUrls.filter((url: unknown) => typeof url === 'string' && url.startsWith(expectedPrefix))
    : [];

  // Validate string fields
  const safeName = typeof callerName === 'string' ? callerName.slice(0, 200) : null;
  const safeEmail = typeof callerEmail === 'string' ? callerEmail.slice(0, 200) : null;
  const safePhone = typeof callerPhone === 'string' ? callerPhone.slice(0, 50) : null;
  const safeAddress = typeof address === 'string' ? address.slice(0, 500) : null;
  const safeNotes = typeof callerNotes === 'string' ? callerNotes.slice(0, 2000) : null;

  const userAgent = request.headers.get('user-agent') || undefined;

  await prisma.pindropSession.update({
    where: { id: sessionId },
    data: {
      callerName: safeName || null,
      callerEmail: safeEmail || null,
      callerPhone: safePhone || null,
      lat,
      lng,
      address: safeAddress || null,
      photoUrls: safePhotoUrls,
      callerNotes: safeNotes || null,
      userAgent,
      submittedAt: new Date(),
      status: 'SUBMITTED',
    },
  });

  return NextResponse.json({ success: true });
}
