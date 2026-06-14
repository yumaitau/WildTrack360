import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getPortalMember } from '@/lib/portal';
import { gateFeature } from '@/lib/features';
import { markMessageRead } from '@/lib/member-messages';

// POST /api/portal/messages/[id]/read — mark one of the member's own messages
// as read. Scoped to the member so one member can't touch another's messages.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getPortalMember(userId);
  if (!session) return NextResponse.json({ error: 'No membership found' }, { status: 404 });
  const gated = await gateFeature(session.member.clerkOrganizationId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;

  const updated = await markMessageRead(id, session.member.id);
  return NextResponse.json({ ok: updated });
}
