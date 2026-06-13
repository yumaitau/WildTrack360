import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
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

  const VALID_STATUS = ['SUCCEEDED', 'REQUIRES_ACTION', 'FAILED', 'REFUNDED'] as const;
  const VALID_KIND = [
    'DONATION_ONE_OFF',
    'MEMBERSHIP_ONE_OFF',
    'DONATION_RECURRING',
    'MEMBERSHIP_RECURRING',
  ] as const;
  const statusFilter =
    status && (VALID_STATUS as readonly string[]).includes(status)
      ? (status as (typeof VALID_STATUS)[number])
      : undefined;
  const kindFilter =
    kind && (VALID_KIND as readonly string[]).includes(kind)
      ? (kind as (typeof VALID_KIND)[number])
      : undefined;

  const payments = await prisma.payment.findMany({
    where: {
      clerkOrganizationId: orgId,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(kindFilter ? { kind: kindFilter } : {}),
      // Hide payment rows that never completed a charge — a failed inline
      // Square charge leaves a REQUIRES_ACTION row behind. Successful, failed
      // (settled) and refunded rows all carry a squarePaymentId.
      NOT: { status: 'REQUIRES_ACTION', squarePaymentId: null },
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
