import 'server-only';

import type { Prisma } from '@prisma/client';
import { buildStoredMentions, selectMentionRecipients, type StoredMention } from './mention-core';
import { createCommunityNotification } from './notify';
import type { CommunityMentionRef } from './validation';

export { mentionAppearsInBody, readStoredMentions, type StoredMention } from './mention-core';

/**
 * Turn the composer's claimed mentions into a trustworthy, storable list. The
 * client is never believed: every id must resolve to an ACTIVE community
 * profile, the profile's *real* displayName must appear as "@DisplayName" in the
 * body, self-mentions are dropped, and the list is deduped and capped. The
 * returned name is always the canonical stored displayName, not the client's.
 */
export async function resolveCommunityMentions(
  db: Prisma.TransactionClient,
  opts: { body: string; submitted: CommunityMentionRef[] | undefined; authorProfileId: string }
): Promise<StoredMention[]> {
  const ids = [...new Set((opts.submitted ?? []).map((m) => m.id))]
    .filter((id) => id !== opts.authorProfileId)
    .slice(0, 20);
  if (ids.length === 0) return [];
  const profiles = await db.communityProfile.findMany({
    where: { id: { in: ids }, status: 'ACTIVE' },
    select: { id: true, displayName: true },
  });
  return buildStoredMentions(profiles, { body: opts.body, authorProfileId: opts.authorProfileId });
}

/**
 * Notify each mentioned member that live content now references them. Mirrors the
 * inline REPLY producer: fires only once content is PUBLISHED, honours the
 * notifyMentions preference (via createCommunityNotification), and dedupes per
 * (recipient, content) so an edit that keeps the same mention won't re-ping.
 */
export async function notifyCommunityMentions(
  tx: Prisma.TransactionClient,
  opts: {
    mentions: StoredMention[];
    actorId: string;
    actorName: string;
    contentId: string;
    targetType: 'POST' | 'COMMENT' | 'CHAT_MESSAGE';
    targetId: string;
    excludeIds?: string[];
  }
): Promise<void> {
  const recipients = selectMentionRecipients(opts.mentions, {
    actorId: opts.actorId,
    excludeIds: opts.excludeIds,
  });
  for (const recipient of recipients) {
    await createCommunityNotification(tx, {
      recipientId: recipient.id,
      type: 'MENTION',
      dedupeKey: `mention:${opts.contentId}:${recipient.id}`,
      title: `${opts.actorName} mentioned you`,
      actorId: opts.actorId,
      targetType: opts.targetType,
      targetId: opts.targetId,
    });
  }
}
