import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { isForbiddenError, requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { grantMembership } from '@/lib/membership-grants';
import { sanitizePlainText } from '@/lib/sanitize';

// POST /api/membership-grants — grant a gifted / complimentary membership to a
// member without taking a payment.
export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try {
    await requirePermission(userId, orgId, 'membership:configure');
  } catch (error) {
    if (isForbiddenError(error)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    throw error;
  }

  try {
    const body = (await request.json()) as {
      memberId?: string;
      tierId?: string;
      giftedBy?: string;
    };
    if (!body.memberId || !body.tierId) {
      return NextResponse.json({ error: 'memberId and tierId are required' }, { status: 400 });
    }
    const result = await grantMembership(orgId, {
      memberId: body.memberId,
      tierId: body.tierId,
      giftedBy: body.giftedBy ? sanitizePlainText(String(body.giftedBy)) : null,
    });
    logAudit({
      userId,
      orgId,
      action: 'CREATE',
      entity: 'Membership',
      entityId: result.membershipId,
      metadata: { gifted: true, memberId: result.memberId, tier: result.tierName },
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : null;
    if (
      message === 'Tier not found' ||
      message === 'Member not found' ||
      message === 'memberId and tierId are required'
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to grant membership' }, { status: 500 });
  }
}
