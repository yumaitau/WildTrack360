import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getPortalMember } from '@/lib/portal';
import { gateFeature } from '@/lib/features';
import { markMessageRead } from '@/lib/member-messages';
import { route } from '@/lib/openapi/route';
import { markMessageReadContract } from './openapi';

export const POST = route(markMessageReadContract, async ({ params }) => {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getPortalMember(userId);
  if (!session) return NextResponse.json({ error: 'No membership found' }, { status: 404 });
  const gated = await gateFeature(session.member.clerkOrganizationId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;

  const updated = await markMessageRead(params.id, session.member.id);
  return { data: { ok: updated } };
});
