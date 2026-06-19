import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getPortalMember } from '@/lib/portal';
import { gateFeature } from '@/lib/features';
import { createRecurringSubscription } from '@/lib/square/subscriptions';
import { route } from '@/lib/openapi/route';
import { recurringDonationCheckoutContract } from './openapi';

export const POST = route(recurringDonationCheckoutContract, async ({ body }) => {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getPortalMember(userId);
  if (!session) return NextResponse.json({ error: 'No membership found' }, { status: 404 });
  const gated = await gateFeature(session.member.clerkOrganizationId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;

  try {
    const result = await createRecurringSubscription({
      orgId: session.member.clerkOrganizationId,
      memberId: session.member.id,
      kind: 'DONATION',
      donorEmail: session.email,
      donorName: `${session.member.firstName} ${session.member.lastName}`.trim(),
      amountCents: body.amountCents,
      interval: body.interval,
      isAnonymous: Boolean(body.isAnonymous),
      sourceId: body.sourceId,
      verificationToken: body.verificationToken ?? null,
    });
    return { data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start recurring donation';
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
