import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getOrganisationInfo } from '@/lib/org-directory';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { sendSms } from '@/lib/sms';
import { nanoid } from 'nanoid';
import { route } from '@/lib/openapi/route';
import { createPindropContract } from './openapi';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

export const POST = route(createPindropContract, async ({ body }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { callerPhone, callerName, callLogId } = body;

  if (!callerPhone) return NextResponse.json({ error: 'Caller phone is required' }, { status: 400 });

  if (callLogId) {
    const callLog = await prisma.callLog.findFirst({ where: { id: callLogId, clerkOrganizationId: orgId } });
    if (!callLog) return NextResponse.json({ error: 'Call log not found' }, { status: 404 });
  }

  const session = await prisma.pindropSession.create({
    data: {
      accessToken: nanoid(32),
      callerPhone,
      callerName: callerName || null,
      callLogId: callLogId || null,
      clerkOrganizationId: orgId,
      clerkUserId: userId,
    },
  });

  const org = await getOrganisationInfo(orgId);
  const orgUrl = org?.slug ?? undefined;

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

  logAudit({ userId, orgId, action: 'CREATE', entity: 'PindropSession', entityId: session.id, metadata: { callLogId } });
  return { data: { id: session.id, url: pinUrl }, status: 201 as const };
});
