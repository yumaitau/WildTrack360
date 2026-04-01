import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const subscription = await prisma.smsSubscription.findUnique({
    where: { organisationId: orgId },
    select: { tier: true },
  });

  return NextResponse.json({
    enabled: !!subscription && subscription.tier !== 'NONE',
  });
}
