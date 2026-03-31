import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { sendSms } from '@/lib/sms';
import { nanoid } from 'nanoid';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { callerPhone, callLogId } = body as { callerPhone?: string; callLogId?: string };

  if (!callerPhone) {
    return NextResponse.json({ error: 'Caller phone is required' }, { status: 400 });
  }

  if (callLogId) {
    const callLog = await prisma.callLog.findFirst({
      where: { id: callLogId, clerkOrganizationId: orgId },
    });
    if (!callLog) {
      return NextResponse.json({ error: 'Call log not found' }, { status: 404 });
    }
  }

  const session = await prisma.pindropSession.create({
    data: {
      accessToken: nanoid(32),
      callLogId: callLogId || null,
      clerkOrganizationId: orgId,
      clerkUserId: userId,
    },
  });

  // Build the URL using the org's subdomain from Clerk publicMetadata
  const clerk = await clerkClient();
  const org = await clerk.organizations.getOrganization({ organizationId: orgId });
  const orgUrl = (org.publicMetadata as Record<string, unknown>)?.org_url as string | undefined;

  if (!orgUrl || !/^[a-zA-Z0-9-]+$/.test(orgUrl)) {
    await prisma.pindropSession.delete({ where: { id: session.id } });
    return NextResponse.json({ error: 'Organisation is not configured for pindrop links. Please contact an administrator.' }, { status: 422 });
  }

  const protocol = ROOT_DOMAIN.startsWith('localhost') ? 'http' : 'https';
  const pinUrl = `${protocol}://${orgUrl}.${ROOT_DOMAIN}/pin/${session.id}?t=${session.accessToken}`;

  const smsResult = await sendSms({
    organisationId: orgId,
    recipientPhone: callerPhone,
    messageBody: `WildTrack360: You've been sent a link to share your location and details for a wildlife report. Please tap the link below:\n\n${pinUrl}`,
    purpose: 'PIN_DROP_LINK',
    sentById: userId,
  });

  if (!smsResult.success) {
    await prisma.pindropSession.delete({ where: { id: session.id } });
    return NextResponse.json({ error: smsResult.reason || 'Failed to send SMS.' }, { status: smsResult.blocked ? 422 : 500 });
  }

  logAudit({
    userId,
    orgId,
    action: 'CREATE',
    entity: 'PindropSession',
    entityId: session.id,
    metadata: { callLogId },
  });

  return NextResponse.json({ id: session.id, url: pinUrl }, { status: 201 });
}
