import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getPortalMember } from '@/lib/portal';
import { gateFeature } from '@/lib/features';
import { prisma } from '@/lib/prisma';
import { cancelSubscription } from '@/lib/square/subscriptions';

// Cancel a recurring subscription the signed-in member owns. Scoped to their
// own memberId so a member can't cancel anyone else's subscription.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getPortalMember(userId);
  if (!session) return NextResponse.json({ error: 'No membership found' }, { status: 404 });
  const gated = await gateFeature(session.member.clerkOrganizationId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;

  const { id } = await params;
  const sub = await prisma.recurringSubscription.findFirst({
    where: { id, memberId: session.member.id },
    select: { id: true },
  });
  if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

  await cancelSubscription(session.member.clerkOrganizationId, id);
  return NextResponse.json({ ok: true });
}
