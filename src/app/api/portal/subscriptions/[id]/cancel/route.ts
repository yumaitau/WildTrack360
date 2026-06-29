import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getPortalMember } from '@/lib/portal';
import { gateFeature } from '@/lib/features';
import { prisma } from '@/lib/prisma';
import { cancelSubscription } from '@/lib/square/subscriptions';
import { route } from '@/lib/openapi/route';
import { cancelSubscriptionContract } from './openapi';

export const POST = route(cancelSubscriptionContract, async ({ params }) => {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getPortalMember(userId);
  if (!session) return NextResponse.json({ error: 'No membership found' }, { status: 404 });
  const gated = await gateFeature(session.member.clerkOrganizationId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;

  const sub = await prisma.recurringSubscription.findFirst({
    where: { id: params.id, memberId: session.member.id },
    select: { id: true },
  });
  if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

  await cancelSubscription(session.member.clerkOrganizationId, params.id);
  return { data: { ok: true } };
});
