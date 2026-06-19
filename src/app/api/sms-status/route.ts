import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { prisma } from '@/lib/prisma';
import { route } from '@/lib/openapi/route';
import { smsStatusContract } from './openapi';

export const GET = route(smsStatusContract, async () => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const subscription = await prisma.smsSubscription.findUnique({
    where: { organisationId: orgId },
    select: { tier: true },
  });

  return { data: { enabled: !!subscription && subscription.tier !== 'NONE' } };
});
