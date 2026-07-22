import { NextRequest, NextResponse } from 'next/server';
import type { CommunitySubscriptionTarget } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyUnsubscribeToken } from '@/lib/community/email/unsubscribe-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PUBLIC route: the signed token is the authorisation, so no session is
// required. A one-click link in an email must work without logging in.

// Verify only — lets a landing page confirm what the link will do before the
// user clicks the button that POSTs it.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }
  const payload = verifyUnsubscribeToken(token, new Date());
  if (!payload) {
    return NextResponse.json({ valid: false, scope: null });
  }
  return NextResponse.json({
    valid: true,
    scope: payload.scope,
    targetType: payload.targetType ?? null,
  });
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 });
  }
  const payload = verifyUnsubscribeToken(token, new Date());
  if (!payload) {
    return NextResponse.json({ ok: false, error: 'Invalid or expired token' }, { status: 400 });
  }

  const { profileId, scope } = payload;

  if (scope === 'all') {
    await prisma.communityNotificationPreference.updateMany({
      where: { profileId },
      data: { emailEnabled: false, preferenceVersion: { increment: 1 } },
    });
    console.log(`[community-email] unsubscribe scope=all profile=${profileId}`);
    return NextResponse.json({ ok: true, applied: 'all' });
  }

  if (scope === 'downgrade') {
    await prisma.communityNotificationPreference.updateMany({
      where: { profileId },
      data: { frequency: 'DAILY', preferenceVersion: { increment: 1 } },
    });
    console.log(`[community-email] unsubscribe scope=downgrade profile=${profileId}`);
    return NextResponse.json({ ok: true, applied: 'downgrade' });
  }

  // scope === "target"
  if (!payload.targetType || !payload.targetId) {
    return NextResponse.json({ ok: false, error: 'Malformed target token' }, { status: 400 });
  }
  const targetType = payload.targetType as CommunitySubscriptionTarget;
  const targetId = payload.targetId;

  await prisma.communitySubscription.upsert({
    where: { profileId_targetType_targetId: { profileId, targetType, targetId } },
    create: { profileId, targetType, targetId, muted: true },
    update: { muted: true },
  });
  await prisma.communityNotificationPreference.updateMany({
    where: { profileId },
    data: { preferenceVersion: { increment: 1 } },
  });
  console.log(
    `[community-email] unsubscribe scope=target profile=${profileId} ${targetType}:${targetId}`
  );
  return NextResponse.json({ ok: true, applied: 'target' });
}
