import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getPortalMember } from '@/lib/portal';
import { gateFeature } from '@/lib/features';
import { createDonationPayment } from '@/lib/square/checkout';
import { route } from '@/lib/openapi/route';
import { donationCheckoutContract } from './openapi';

export const POST = route(donationCheckoutContract, async ({ body }) => {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getPortalMember(userId);
  if (!session) return NextResponse.json({ error: 'No membership found' }, { status: 404 });
  const gated = await gateFeature(session.member.clerkOrganizationId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;

  try {
    const result = await createDonationPayment({
      orgId: session.member.clerkOrganizationId,
      amountCents: body.amountCents,
      donorEmail: session.email,
      donorName: `${session.member.firstName} ${session.member.lastName}`.trim(),
      message: body.message ?? null,
      isAnonymous: Boolean(body.isAnonymous),
      memberId: session.member.id,
      sourceId: body.sourceId,
      verificationToken: body.verificationToken ?? null,
    });
    return { data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create donation';
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
