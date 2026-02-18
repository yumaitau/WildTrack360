import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { sendSms } from '@/lib/sms';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

const WEBHOOK_API_KEY = process.env.WEBHOOK_API_KEY!;
const WEBHOOK_ORG_ID = process.env.WEBHOOK_ORG_ID!;
const WEBHOOK_USER_ID = process.env.WEBHOOK_USER_ID!;

function verifyApiKey(request: Request): boolean {
  const provided = request.headers.get('x-api-key') || '';
  if (!provided || !WEBHOOK_API_KEY) return false;
  if (provided.length !== WEBHOOK_API_KEY.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(provided),
    Buffer.from(WEBHOOK_API_KEY)
  );
}

/**
 * POST /api/webhook/elevenlabs
 *
 * Called by ElevenLabs voice agent mid-call to create a pindrop session.
 *
 * Headers:
 *   x-api-key: <WEBHOOK_API_KEY>
 *
 * Body (JSON):
 *   callerName:  string (required)
 *   callerPhone: string (required)
 *   species?:    string
 *   description?: string
 *
 * Returns:
 *   { sessionId, url, smsMessage, smsSent }
 */
export async function POST(request: Request) {
  if (!verifyApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!WEBHOOK_ORG_ID || !WEBHOOK_USER_ID) {
    return NextResponse.json(
      { error: 'Webhook not configured (missing WEBHOOK_ORG_ID or WEBHOOK_USER_ID)' },
      { status: 500 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const callerName = typeof body.callerName === 'string' ? body.callerName.trim() : '';
  const callerPhone = typeof body.callerPhone === 'string' ? body.callerPhone.trim() : '';

  if (!callerName || !callerPhone) {
    return NextResponse.json(
      { error: 'callerName and callerPhone are required' },
      { status: 400 }
    );
  }

  const species = typeof body.species === 'string' ? body.species.trim() || null : null;
  const description = typeof body.description === 'string' ? body.description.trim() || null : null;

  const session = await prisma.pindropSession.create({
    data: {
      accessToken: nanoid(21),
      callerName,
      callerPhone,
      species,
      description,
      clerkOrganizationId: WEBHOOK_ORG_ID,
      clerkUserId: WEBHOOK_USER_ID,
    },
  });

  logAudit({
    userId: WEBHOOK_USER_ID,
    orgId: WEBHOOK_ORG_ID,
    action: 'CREATE',
    entity: 'PindropSession',
    entityId: session.id,
    metadata: { callerName, callerPhone, species, source: 'elevenlabs-webhook' },
  });

  // Build the public URL — use x-forwarded-host / host header to determine origin
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host') || 'localhost:3000';
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const origin = `${proto}://${host}`;

  const url = `${origin}/pin/${session.id}?t=${session.accessToken}`;
  const smsMessage = `Hi ${callerName}, thanks for calling WildTrack360. Please tap this link to share the location of the wildlife sighting: ${url}`;

  // Send SMS to caller
  let smsSent = false;
  try {
    await sendSms(callerPhone, smsMessage);
    smsSent = true;
  } catch (err) {
    console.error('Failed to send SMS via Twilio:', err);
  }

  return NextResponse.json({
    sessionId: session.id,
    url,
    smsMessage,
    smsSent,
  });
}
