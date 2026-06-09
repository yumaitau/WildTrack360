import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getPortalMember } from '@/lib/portal';
import { gateFeature } from '@/lib/features';
import { createRecurringSubscription } from '@/lib/square/subscriptions';

// Membership purchase. Memberships are always an annual auto-renewing
// commitment, so this always creates a recurring subscription. Expects the card
// token (sourceId) from the Web Payments SDK.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getPortalMember(userId);
  if (!session) return NextResponse.json({ error: 'No membership found' }, { status: 404 });
  const gated = await gateFeature(session.member.clerkOrganizationId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;

  try {
    const body = (await request.json()) as {
      tierId?: string;
      sourceId?: string;
      verificationToken?: string | null;
    };
    if (!body.tierId) return NextResponse.json({ error: 'tierId required' }, { status: 400 });
    if (!body.sourceId) return NextResponse.json({ error: 'sourceId required' }, { status: 400 });

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

    const result = await createRecurringSubscription({
      orgId: session.member.clerkOrganizationId,
      memberId: session.member.id,
      kind: 'MEMBERSHIP',
      tierId: tier.id,
      donorEmail: session.email,
      donorName,
      amountCents: tier.amountCents,
      currency: tier.currency,
      interval: 'ANNUAL',
      sourceId: body.sourceId,
      verificationToken: body.verificationToken ?? null,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create membership payment';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
