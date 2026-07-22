import 'server-only';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
// Community has no attachments (an explicit non-goal), so the media-key scan
// below always yields an empty set. The scrub machinery is kept intact so a
// future attachment field is purged automatically; deleteR2Object is a no-op
// until an object store is wired in.
async function deleteR2Object(_key: string): Promise<void> {
  /* no attachments in the Community beta */
}

const FILE_URL_PREFIX = '/api/files/';

// Days a member's CommunityProfile must have sat untouched while their User is
// deactivated before the reconciliation cron purges it — a grace window so a
// briefly-suspended member isn't erased. (User has no updatedAt, so the
// profile's own updatedAt is the freshness proxy.)
export const COMMUNITY_PURGE_GRACE_DAYS = 30;

// Every model that carries a foreign key to CommunityProfile, and how the purge
// clears it. `delete` = a Restrict FK we must deleteMany BEFORE the profile row;
// `cascade`/`setnull` = resolves automatically when the profile is deleted. If
// you add a model referencing CommunityProfile, add it here — the guard test in
// tests/community-purge.test.ts fails until this list matches the schema.
export const COMMUNITY_PROFILE_REFERENCES = {
  communityComment: 'delete',
  communityChatMessage: 'delete',
  communityPost: 'delete',
  communityReport: 'delete',
  communityBetaFeedback: 'delete',
  communityAppeal: 'delete',
  communityReaction: 'cascade',
  communityFollow: 'cascade',
  communityNotificationPreference: 'cascade',
  communityRateLimitBucket: 'cascade',
  communitySubscription: 'cascade',
  communityEmailDelivery: 'cascade',
  communityNotification: 'cascade+setnull',
  communitySanction: 'cascade+setnull',
  communityModerationEvent: 'setnull',
  communityBlock: 'cascade',
  communityBookmark: 'cascade',
} as const;

export type CommunityPurgeReason = 'clerk_deleted' | 'reconciliation' | 'admin_erasure';

export interface CommunityPurgeCounts {
  posts: number;
  comments: number;
  chatMessages: number;
  reports: number;
  feedback: number;
  appeals: number;
  mediaKeys: number;
}

export interface CommunityPurgeResult {
  purged: boolean;
  profileId: string;
  reason: CommunityPurgeReason;
  counts: CommunityPurgeCounts;
}

type ScannableRow = Record<string, unknown>;

// Collect R2 object keys from a departing member's content — same value-walking
// rule as the full-org export (lib/full-export.collectFileKeys): match whole
// string values under the org's `/api/files/{orgId}/` prefix, so a future
// attachment field is scrubbed automatically once it exists. Inlined (not
// imported) to keep the purge/cron path free of the export's ExcelJS import.
export function collectCommunityMediaKeys(rows: ScannableRow[], orgId: string): string[] {
  const keys = new Set<string>();
  const expectedPrefix = `${FILE_URL_PREFIX}${orgId}/`;
  const consider = (value: unknown) => {
    if (typeof value !== 'string') return;
    if (!value.startsWith(expectedPrefix)) return;
    keys.add(value.slice(FILE_URL_PREFIX.length));
  };
  for (const row of rows) {
    for (const value of Object.values(row)) {
      if (Array.isArray(value)) for (const item of value) consider(item);
      else consider(value);
    }
  }
  return Array.from(keys);
}

/**
 * Hard-delete every row a member authored/owns, in FK-safe order, and return
 * the counts plus the R2 keys to scrub. Runs inside a caller-supplied
 * transaction client. Does NOT touch R2 (that's a post-commit side effect) and
 * does NOT delete the User — callers own that.
 */
export async function runCommunityProfilePurge(
  tx: Prisma.TransactionClient,
  profileId: string,
  orgId: string
): Promise<CommunityPurgeCounts & { mediaKeyList: string[] }> {
  // Snapshot authored content for the media scan before it's deleted.
  const [posts, comments, chatMessages] = await Promise.all([
    tx.communityPost.findMany({
      where: { authorId: profileId },
      select: {
        id: true,
        title: true,
        body: true,
        draftTitle: true,
        draftBody: true,
      },
    }),
    tx.communityComment.findMany({
      where: { authorId: profileId },
      select: { id: true, body: true, draftBody: true },
    }),
    tx.communityChatMessage.findMany({
      where: { authorId: profileId },
      select: { id: true, body: true, draftBody: true },
    }),
  ]);

  const mediaKeyList = collectCommunityMediaKeys([...posts, ...comments, ...chatMessages], orgId);

  // Delete Restrict-blocked children first, dependency-safe. Deleting the
  // member's comments/chat first re-parents any replies by others via the
  // existing parentId SetNull; deleting their posts then cascades whatever
  // comments/reactions/follows remain on those posts.
  await tx.communityComment.deleteMany({ where: { authorId: profileId } });
  await tx.communityChatMessage.deleteMany({ where: { authorId: profileId } });
  await tx.communityPost.deleteMany({ where: { authorId: profileId } });
  const reports = await tx.communityReport.deleteMany({
    where: { reporterId: profileId },
  });
  const feedback = await tx.communityBetaFeedback.deleteMany({
    where: { profileId },
  });
  const appeals = await tx.communityAppeal.deleteMany({
    where: { appellantId: profileId },
  });

  // Deleting the profile cascades reactions, follows, notification prefs, rate
  // buckets, subscriptions, email deliveries, notifications (as recipient) and
  // sanctions (as target); and SetNulls notifications (as actor), moderation
  // events (actor) and sanctions (issued-by) so no row keeps referencing them.
  await tx.communityProfile.delete({ where: { id: profileId } });

  return {
    posts: posts.length,
    comments: comments.length,
    chatMessages: chatMessages.length,
    reports: reports.count,
    feedback: feedback.count,
    appeals: appeals.count,
    mediaKeys: mediaKeyList.length,
    mediaKeyList,
  };
}

/**
 * Purge one departed member by CommunityProfile id. Idempotent: a missing
 * profile returns `{ purged: false }`. Hard-deletes their content + all
 * referencing rows in a transaction, then scrubs their R2 media post-commit.
 */
export async function purgeDepartedCommunityMember(
  profileId: string,
  opts: { reason?: CommunityPurgeReason } = {}
): Promise<CommunityPurgeResult> {
  const reason = opts.reason ?? 'admin_erasure';
  const empty: CommunityPurgeCounts = {
    posts: 0,
    comments: 0,
    chatMessages: 0,
    reports: 0,
    feedback: 0,
    appeals: 0,
    mediaKeys: 0,
  };

  const profile = await prisma.communityProfile.findUnique({
    where: { id: profileId },
    select: { id: true, homeClerkOrganizationId: true },
  });
  if (!profile) {
    return { purged: false, profileId, reason, counts: empty };
  }

  const result = await prisma.$transaction((tx) =>
    runCommunityProfilePurge(tx, profileId, profile.homeClerkOrganizationId)
  );

  // R2 deletes are external side effects — after the DB commit so a rolled-back
  // transaction never orphans a delete. Best-effort; a failed key is logged,
  // not fatal (the DB rows are already gone).
  for (const key of result.mediaKeyList) {
    try {
      await deleteR2Object(key);
    } catch (err) {
      console.error(`[community-purge] Failed to delete R2 object ${key}:`, err);
    }
  }

  const counts: CommunityPurgeCounts = {
    posts: result.posts,
    comments: result.comments,
    chatMessages: result.chatMessages,
    reports: result.reports,
    feedback: result.feedback,
    appeals: result.appeals,
    mediaKeys: result.mediaKeys,
  };
  console.log(
    `[community-purge] Purged profile ${profileId} (${reason}): ` +
      `${counts.posts} posts, ${counts.comments} comments, ` +
      `${counts.chatMessages} chat, ${counts.reports} reports, ` +
      `${counts.feedback} feedback, ${counts.appeals} appeals, ` +
      `${counts.mediaKeys} media`
  );

  return { purged: true, profileId, reason, counts };
}

/**
 * Purge a departed member by the platform User id (their community profile is
 * looked up via the unique userId). No-op when the user never had a profile.
 */
export async function purgeCommunityMemberByUserId(
  userId: string,
  opts: { reason?: CommunityPurgeReason } = {}
): Promise<CommunityPurgeResult | null> {
  const profile = await prisma.communityProfile.findUnique({
    where: { clerkUserId: userId },
    select: { id: true },
  });
  if (!profile) return null;
  return purgeDepartedCommunityMember(profile.id, opts);
}

/**
 * Reconciliation safety net (daily cron). Finds community profiles whose owning
 * User has been deactivated and whose profile has sat untouched past the grace
 * window, and purges each. Idempotent — a second run finds nothing.
 */
export async function reconcileDepartedCommunityMembers(opts: {
  now: Date;
  graceDays?: number;
  limit?: number;
}): Promise<{ scanned: number; purged: CommunityPurgeResult[] }> {
  const graceDays = opts.graceDays ?? COMMUNITY_PURGE_GRACE_DAYS;
  const cutoff = new Date(opts.now.getTime() - graceDays * 24 * 60 * 60 * 1000);

  const candidates = await prisma.communityProfile.findMany({
    where: {
      updatedAt: { lt: cutoff },
      // No local user table: reconcile profiles marked as departed (status LEFT)
      // rather than joining to an operational User.isActive flag.
      status: 'LEFT',
    },
    select: { id: true },
    take: Math.max(1, Math.min(opts.limit ?? 100, 500)),
  });

  const purged: CommunityPurgeResult[] = [];
  for (const c of candidates) {
    purged.push(await purgeDepartedCommunityMember(c.id, { reason: 'reconciliation' }));
  }
  return { scanned: candidates.length, purged };
}
