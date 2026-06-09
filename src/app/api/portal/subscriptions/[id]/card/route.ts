import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPortalMember } from '@/lib/portal';
import { gateFeature } from '@/lib/features';
import { prisma } from '@/lib/prisma';
import { getValidAccessToken } from '@/lib/square/oauth';
import { saveCardOnFile } from '@/lib/square/cards';

// Swap the card-on-file used for a member's recurring subscription. The client
// vaults a new card via the Web Payments SDK (STORE intent) and posts the token
// here; we re-vault it on the org's Square account and point the subscription
// (and member) at the new card id.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getPortalMember(userId);
  if (!session) return NextResponse.json({ error: 'No membership found' }, { status: 404 });
  const gated = await gateFeature(session.member.clerkOrganizationId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;

  const { id } = await params;
  const sub = await prisma.recurringSubscription.findFirst({
    where: { id, memberId: session.member.id },
  });
  if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

  try {
    const body = (await request.json()) as { sourceId?: string; verificationToken?: string | null };
    if (!body.sourceId) return NextResponse.json({ error: 'sourceId required' }, { status: 400 });

    const { accessToken } = await getValidAccessToken(sub.clerkOrganizationId);
    const cardId = await saveCardOnFile({
      accessToken,
      customerId: sub.squareCustomerId,
      sourceId: body.sourceId,
      verificationToken: body.verificationToken,
    });
    await prisma.recurringSubscription.update({ where: { id: sub.id }, data: { squareCardId: cardId } });
    await prisma.member.update({ where: { id: session.member.id }, data: { squareCardId: cardId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update card';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
