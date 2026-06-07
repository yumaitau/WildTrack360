import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try {
    await requirePermission(userId, orgId, 'donation:view');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? undefined;
  const kind = searchParams.get('kind') ?? undefined;

  const payments = await prisma.payment.findMany({
    where: {
      clerkOrganizationId: orgId,
      ...(status ? { status: status as 'SUCCEEDED' | 'REQUIRES_ACTION' | 'FAILED' | 'REFUNDED' } : {}),
      ...(kind ? { kind: kind as 'DONATION_ONE_OFF' | 'MEMBERSHIP_ONE_OFF' | 'DONATION_RECURRING' | 'MEMBERSHIP_RECURRING' } : {}),
    },
    include: {
      member: { select: { id: true, firstName: true, lastName: true, email: true } },
      donations: { select: { donorEmail: true, donorName: true, isAnonymous: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return NextResponse.json(payments);
}
