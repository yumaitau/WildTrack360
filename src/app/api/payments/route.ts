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
      // Hide the pending "subscription-anchor" Payment rows that exist only
      // to serve as a Stripe idempotency key during MEMBERSHIP_RECURRING
      // checkout. They never become chargeable in their own right; the actual
      // payments arrive later via invoice.payment_succeeded with their own
      // stripe_invoice_id. Showing them in the ledger as "Requires action"
      // forever would just be noise.
      NOT: {
        kind: 'MEMBERSHIP_RECURRING',
        status: 'REQUIRES_ACTION',
        stripeInvoiceId: null,
      },
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
