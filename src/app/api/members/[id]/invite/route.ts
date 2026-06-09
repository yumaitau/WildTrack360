import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { invitePortalMember } from '@/lib/portal-invite';

// Send (or re-send) a member-portal invitation for an existing member. The
// member receives an application-level Clerk invite and can activate their
// /portal login; they are never added to the Clerk organization.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try {
    await requirePermission(userId, orgId, 'member:manage');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const result = await invitePortalMember(id, orgId);
  if (result.sent) return NextResponse.json({ ok: true });

  const messages: Record<string, { status: number; error: string }> = {
    'not-found': { status: 404, error: 'Member not found' },
    'already-active': { status: 400, error: 'This member already has portal access' },
    'payment-required': {
      status: 400,
      error: 'Members can only be invited after they purchase a membership',
    },
    error: { status: 400, error: 'Invitation failed — please try again' },
  };
  const m = messages[result.reason ?? 'error'] ?? messages.error;
  return NextResponse.json({ error: m.error }, { status: m.status });
}
