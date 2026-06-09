import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPortalMember } from '@/lib/portal';
import { gateFeature } from '@/lib/features';
import { prisma } from '@/lib/prisma';

// Active recurring subscriptions for the signed-in member (donations +
// memberships) so they can review and cancel them in the portal.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getPortalMember(userId);
  if (!session) return NextResponse.json({ error: 'No membership found' }, { status: 404 });
  const gated = await gateFeature(session.member.clerkOrganizationId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;

  const subs = await prisma.recurringSubscription.findMany({
    where: { memberId: session.member.id, status: { in: ['ACTIVE', 'PENDING', 'PAST_DUE'] } },
    orderBy: { createdAt: 'desc' },
  });

  const tierIds = subs.map((s) => s.tierId).filter((id): id is string => Boolean(id));
  const tiers = tierIds.length
    ? await prisma.membershipTier.findMany({
        where: { id: { in: tierIds } },
        select: { id: true, name: true },
      })
    : [];
  const tierName = new Map(tiers.map((t) => [t.id, t.name]));

  return NextResponse.json(
    subs.map((s) => ({
      id: s.id,
      kind: s.kind,
      label: s.kind === 'MEMBERSHIP' ? (tierName.get(s.tierId ?? '') ?? 'Membership') : 'Donation',
      amountCents: s.amountCents,
      currency: s.currency,
      interval: s.interval,
      status: s.status,
      nextChargeAt: s.nextChargeAt,
      startedAt: s.startedAt,
    }))
  );
}
