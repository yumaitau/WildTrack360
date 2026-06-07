import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPortalMember } from '@/lib/portal';
import { gateFeature } from '@/lib/features';
import { createRecurringDonationSubscription } from '@/lib/stripe/subscriptions';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getPortalMember(userId);
  if (!session) return NextResponse.json({ error: 'No membership found' }, { status: 404 });
  const gated = await gateFeature(session.member.clerkOrganizationId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;

  try {
    const body = (await request.json()) as {
      amountCents?: number;
      interval?: 'MONTHLY' | 'ANNUAL';
    };
    if (typeof body.amountCents !== 'number') {
      return NextResponse.json({ error: 'amountCents required' }, { status: 400 });
    }
    if (body.interval !== 'MONTHLY' && body.interval !== 'ANNUAL') {
      return NextResponse.json({ error: 'interval must be MONTHLY or ANNUAL' }, { status: 400 });
    }
    const result = await createRecurringDonationSubscription({
      orgId: session.member.clerkOrganizationId,
      memberId: session.member.id,
      donorEmail: session.email,
      donorName: `${session.member.firstName} ${session.member.lastName}`.trim(),
      amountCents: body.amountCents,
      interval: body.interval,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start recurring donation';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
