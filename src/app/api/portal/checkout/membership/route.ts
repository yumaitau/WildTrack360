import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { prisma } from '@/lib/prisma';
import { getPortalMember } from '@/lib/portal';
import { gateFeature } from '@/lib/features';
import { createRecurringSubscription } from '@/lib/square/subscriptions';
import { totalWithCoveredFees } from '@/lib/fees';

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
      coverFees?: boolean;
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

    // When the member opts to cover fees, gross up the trusted tier price so the
    // org nets the full tier amount after the 5% platform + ~2.2% Square fees.
    // Derived server-side from tier.amountCents — never from a client value — and
    // stored as the subscription amount so every annual renewal covers fees too.
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
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create membership payment';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
