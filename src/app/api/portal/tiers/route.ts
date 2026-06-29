import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { prisma } from '@/lib/prisma';
import { getPortalMember } from '@/lib/portal';
import { gateFeature } from '@/lib/features';
import { route } from '@/lib/openapi/route';
import { listPortalTiersContract } from './openapi';

export const GET = route(listPortalTiersContract, async () => {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const session = await getPortalMember(userId);
  if (!session) return NextResponse.json({ error: 'No membership found' }, { status: 404 });
  const gated = await gateFeature(session.member.clerkOrganizationId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;

  const tiers = await prisma.membershipTier.findMany({
    where: {
      clerkOrganizationId: session.member.clerkOrganizationId,
      active: true,
      archivedAt: null,
    },
    orderBy: { amountCents: 'asc' },
  });
  return {
    data: tiers.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      amountCents: t.amountCents,
      currency: t.currency,
      billingInterval: t.billingInterval,
      benefits: Array.isArray(t.benefitsJson) ? t.benefitsJson : [],
    })),
  };
});
