import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPortalMember } from '@/lib/portal';
import { gateFeature } from '@/lib/features';
import { createDonationPayment } from '@/lib/square/checkout';

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
      message?: string | null;
      isAnonymous?: boolean;
      sourceId?: string;
      verificationToken?: string | null;
    };
    if (typeof body.amountCents !== 'number') {
      return NextResponse.json({ error: 'amountCents required' }, { status: 400 });
    }
    if (!body.sourceId) {
      return NextResponse.json({ error: 'sourceId required' }, { status: 400 });
    }
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
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create donation';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
