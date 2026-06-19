import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getPortalMember } from '@/lib/portal';
import { gateFeature } from '@/lib/features';
import { listMemberMessages } from '@/lib/member-messages';
import { route } from '@/lib/openapi/route';
import { getMessagesContract } from './openapi';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parseLimit(value: string | undefined): number {
  if (!value) return DEFAULT_LIMIT;
  if (!/^\d{1,3}$/.test(value)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(value, 10)));
}

export const GET = route(getMessagesContract, async ({ query }) => {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getPortalMember(userId);
  if (!session) return NextResponse.json({ error: 'No membership found' }, { status: 404 });
  const gated = await gateFeature(session.member.clerkOrganizationId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;

  const limit = parseLimit(query.limit);
  const rows = await listMemberMessages(session.member.id, limit + 1, query.cursor ?? null);
  const hasMore = rows.length > limit;
  const messages = rows.slice(0, limit);

  return {
    data: {
      messages: messages.map((m) => ({
        id: m.id,
        subject: m.subject,
        body: m.body,
        sentByName: m.sentByName,
        readAt: m.readAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? (messages[messages.length - 1]?.id ?? null) : null,
    },
  };
});
