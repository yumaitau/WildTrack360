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
    return NextResponse.json({ error: 'Invalid session' }, { status: 404 });
  }

  if (session.status !== 'PENDING') {
    return NextResponse.json(
      { error: 'This session has already been submitted' },
      { status: 409 }
    );
  }

  const body = await request.json();
  const { lat, lng, address, photoUrls, callerNotes } = body;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json(
      { error: 'Location (lat/lng) is required' },
      { status: 400 }
    );
  }

  const userAgent = request.headers.get('user-agent') || undefined;

  await prisma.pindropSession.update({
    where: { id: sessionId },
    data: {
      lat,
      lng,
      address: address || null,
      photoUrls: photoUrls || [],
      callerNotes: callerNotes || null,
      userAgent,
      submittedAt: new Date(),
      status: 'SUBMITTED',
    },
  });

  return NextResponse.json({ success: true });
}
