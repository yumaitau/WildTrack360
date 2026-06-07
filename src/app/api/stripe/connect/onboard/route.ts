import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { startOnboarding } from '@/lib/stripe/connect';
import { prisma } from '@/lib/prisma';

export async function POST() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try {
    await requirePermission(userId, orgId, 'settings:manage');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const settings = await prisma.organisationSettings.findUnique({
      where: { clerkOrganisationId: orgId },
    });
    const { url, accountId } = await startOnboarding({
      orgId,
      contactEmail: settings?.contactEmail ?? null,
    });
    logAudit({
      userId,
      orgId,
      action: 'UPDATE',
      entity: 'StripeAccount',
      entityId: accountId,
      metadata: { action: 'start_onboarding' },
    });
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start onboarding';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
