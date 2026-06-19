import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { prisma } from '@/lib/prisma';
import { getPortalMember } from '@/lib/portal';
import { gateFeature } from '@/lib/features';
import { createRecurringSubscription } from '@/lib/square/subscriptions';
import { totalWithCoveredFees } from '@/lib/fees';
import { route } from '@/lib/openapi/route';
import { membershipCheckoutContract } from './openapi';

export const POST = route(membershipCheckoutContract, async ({ body }) => {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getPortalMember(userId);
  if (!session) return NextResponse.json({ error: 'No membership found' }, { status: 404 });
  const gated = await gateFeature(session.member.clerkOrganizationId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;

  try {
    const tier = await prisma.membershipTier.findFirst({
      where: {
        id: body.tierId,
        clerkOrganizationId: session.member.clerkOrganizationId,
        active: true,
        archivedAt: null,
      },
    });
    if (!tier) return NextResponse.json({ error: 'Tier not found' }, { status: 404 });

    const donorName = `${session.member.firstName} ${session.member.lastName}`.trim();

    const amountCents = body.coverFees
      ? totalWithCoveredFees(tier.amountCents)
      : tier.amountCents;

    const result = await createRecurringSubscription({
      orgId: session.member.clerkOrganizationId,
      memberId: session.member.id,
      kind: 'MEMBERSHIP',
      tierId: tier.id,
      donorEmail: session.email,
      donorName,
      amountCents,
      currency: tier.currency,
      interval: 'ANNUAL',
      sourceId: body.sourceId,
      verificationToken: body.verificationToken ?? null,
    });
    return { data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create membership payment';
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
