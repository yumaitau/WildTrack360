import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getPortalMember } from '@/lib/portal';
import { gateFeature } from '@/lib/features';
import { prisma } from '@/lib/prisma';
import { getValidAccessToken } from '@/lib/square/oauth';
import { saveCardOnFile } from '@/lib/square/cards';
import { route } from '@/lib/openapi/route';
import { updateSubscriptionCardContract } from './openapi';

export const POST = route(updateSubscriptionCardContract, async ({ params, body }) => {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getPortalMember(userId);
  if (!session) return NextResponse.json({ error: 'No membership found' }, { status: 404 });
  const gated = await gateFeature(session.member.clerkOrganizationId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;

  const sub = await prisma.recurringSubscription.findFirst({
    where: { id: params.id, memberId: session.member.id },
  });
  if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

  try {
    const { accessToken } = await getValidAccessToken(sub.clerkOrganizationId);
    const cardId = await saveCardOnFile({
      accessToken,
      customerId: sub.squareCustomerId,
      sourceId: body.sourceId,
      verificationToken: body.verificationToken,
    });
    await prisma.recurringSubscription.update({ where: { id: sub.id }, data: { squareCardId: cardId } });
    await prisma.member.update({ where: { id: session.member.id }, data: { squareCardId: cardId } });
    return { data: { ok: true } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update card';
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
