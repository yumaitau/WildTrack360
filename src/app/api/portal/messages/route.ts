import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getPortalMember } from '@/lib/portal';
import { gateFeature } from '@/lib/features';
import { listMemberMessages } from '@/lib/member-messages';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getPortalMember(userId);
  if (!session) return NextResponse.json({ error: 'No membership found' }, { status: 404 });
  const gated = await gateFeature(session.member.clerkOrganizationId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;

  const messages = await listMemberMessages(session.member.id);
  return NextResponse.json(
    messages.map((m) => ({
      id: m.id,
      subject: m.subject,
      body: m.body,
      sentByName: m.sentByName,
      readAt: m.readAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
    }))
  );
}
