import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getPortalMember } from '@/lib/portal';
import { gateFeature } from '@/lib/features';
import { createMembershipPayment } from '@/lib/stripe/checkout';
import { createMembershipSubscription } from '@/lib/stripe/subscriptions';

// One endpoint for both one-off + recurring membership purchases. Branches
// on the tier's billingInterval so the portal UI doesn't need to know which
// shape to call.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getPortalMember(userId);
  if (!session) return NextResponse.json({ error: 'No membership found' }, { status: 404 });
  const gated = await gateFeature(session.member.clerkOrganizationId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;

  try {
    const body = (await request.json()) as { tierId?: string };
    if (!body.tierId) {
      return NextResponse.json({ error: 'tierId required' }, { status: 400 });
    }

    const tier = await prisma.membershipTier.findFirst({
      where: {
        id: body.tierId,
        clerkOrganizationId: session.member.clerkOrganizationId,
        active: true,
        archivedAt: null,
      },
    });
    if (!tier) return NextResponse.json({ error: 'Tier not found' }, { status: 404 });

    if (tier.billingInterval === 'MONTHLY' || tier.billingInterval === 'ANNUAL') {
      const result = await createMembershipSubscription({
        orgId: session.member.clerkOrganizationId,
        tierId: body.tierId,
        memberId: session.member.id,
        donorEmail: session.email,
        donorName: `${session.member.firstName} ${session.member.lastName}`.trim(),
      });
      return NextResponse.json(result);
    }

    const result = await createMembershipPayment({
      orgId: session.member.clerkOrganizationId,
      tierId: body.tierId,
      memberId: session.member.id,
      donorEmail: session.email,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create membership payment';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
