import 'server-only';

import { prisma } from '@/lib/prisma';
import { createCommunityNotification } from './notify';

// One row per reaction in the window, carrying the reactor and the author of the
// reacted-to content (post/comment/chat — exactly one is set).
export interface ReactionOwnerRow {
  profileId: string;
  post: { authorId: string } | null;
  comment: { authorId: string } | null;
  chatMessage: { authorId: string } | null;
}

// Tally reactions per content owner, excluding a member reacting to their own
// content. Pure, so the counting is unit-testable without a database.
export function tallyReactionOwners(rows: ReactionOwnerRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const ownerId = r.post?.authorId ?? r.comment?.authorId ?? r.chatMessage?.authorId;
    if (!ownerId || ownerId === r.profileId) continue;
    counts.set(ownerId, (counts.get(ownerId) ?? 0) + 1);
  }
  return counts;
}

export function reactionSummaryTitle(count: number): string {
  return count === 1 ? 'Someone reacted to your content' : `${count} new reactions on your content`;
}

// UTC day bucket for the once-per-day dedupe key.
function dayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Daily batched producer for REACTION_SUMMARY notifications. Rolls up the last
 * 24h of reactions per content owner and emits one notification each — but only
 * for members who explicitly opted in (`notifyReactionSummaries`, default off).
 * Idempotent per owner per UTC day via the dedupe key, so re-running is safe.
 */
export async function produceReactionSummaries(opts: {
  now: Date;
  windowHours?: number;
}): Promise<{ scanned: number; notified: number }> {
  const windowHours = opts.windowHours ?? 24;
  const since = new Date(opts.now.getTime() - windowHours * 60 * 60 * 1000);

  const rows = await prisma.communityReaction.findMany({
    where: { createdAt: { gte: since } },
    select: {
      profileId: true,
      post: { select: { authorId: true } },
      comment: { select: { authorId: true } },
      chatMessage: { select: { authorId: true } },
    },
  });

  const counts = tallyReactionOwners(rows);
  if (counts.size === 0) return { scanned: rows.length, notified: 0 };

  // Opt-in only: reaction summaries default off, so notify solely the owners who
  // turned them on (createCommunityNotification would otherwise create for
  // members with no preference row).
  const optedIn = await prisma.communityNotificationPreference.findMany({
    where: {
      profileId: { in: Array.from(counts.keys()) },
      notifyReactionSummaries: true,
    },
    select: { profileId: true },
  });

  const key = dayKey(opts.now);
  let notified = 0;
  for (const { profileId } of optedIn) {
    const count = counts.get(profileId) ?? 0;
    if (count === 0) continue;
    await prisma.$transaction((tx) =>
      createCommunityNotification(tx, {
        recipientId: profileId,
        type: 'REACTION_SUMMARY',
        dedupeKey: `reaction-summary:${profileId}:${key}`,
        title: reactionSummaryTitle(count),
      })
    );
    notified += 1;
  }

  return { scanned: rows.length, notified };
}
