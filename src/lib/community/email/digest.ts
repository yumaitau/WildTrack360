import type { CommunityNotificationType, CommunityTargetType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getEmailConfig } from './config';

// Only titles/counts and authenticated deep links ever leave the platform —
// never post/comment/chat bodies, flagged content, or locations.
export interface DigestItem {
  title: string;
  href: string;
}

export interface DigestSection {
  type: CommunityNotificationType;
  count: number;
  items: DigestItem[];
}

export interface DigestResult {
  itemCount: number;
  sections: DigestSection[];
}

export interface NotificationInput {
  id: string;
  type: CommunityNotificationType;
  targetType: CommunityTargetType | null;
  targetId: string | null;
  title: string;
  createdAt: Date;
}

export interface DeliverableNotification {
  notification: NotificationInput;
  href: string;
}

// How far back an unread notification can be and still ride a digest. Wide
// enough to cover a weekly roll-up; unread-only + per-day dedupe keeps repeats
// bounded.
export const DIGEST_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

const SECTION_ORDER: CommunityNotificationType[] = [
  'ACCEPTED_ANSWER',
  'REPLY',
  'FOLLOWED_POST_ACTIVITY',
  'REACTION_SUMMARY',
  'MODERATION_DECISION',
  'REPORT_OUTCOME',
  'APPEAL_OUTCOME',
  'BETA_ANNOUNCEMENT',
];

function resolveAppUrl(explicit?: string): string {
  return explicit ?? getEmailConfig()?.appUrl ?? 'http://localhost:3000';
}

function abs(appUrl: string, path: string): string {
  return `${appUrl.replace(/\/$/, '')}${path}`;
}

// Resolves each notification to a safe deep link, dropping any whose target
// content has been removed or deleted (join by id — targetId is a plain string,
// not an FK). Notifications with no target (e.g. beta announcements) survive
// with a generic community link.
export async function resolveDeliverableNotifications(
  notifications: NotificationInput[],
  appUrl?: string
): Promise<DeliverableNotification[]> {
  const base = resolveAppUrl(appUrl);

  const postIds = new Set<string>();
  const commentIds = new Set<string>();
  const messageIds = new Set<string>();
  for (const n of notifications) {
    if (!n.targetId) continue;
    if (n.targetType === 'POST') postIds.add(n.targetId);
    else if (n.targetType === 'COMMENT') commentIds.add(n.targetId);
    else if (n.targetType === 'CHAT_MESSAGE') messageIds.add(n.targetId);
  }

  const [posts, comments, messages] = await Promise.all([
    postIds.size
      ? prisma.communityPost.findMany({
          where: { id: { in: [...postIds] } },
          select: { id: true, status: true, deletedAt: true },
        })
      : Promise.resolve([]),
    commentIds.size
      ? prisma.communityComment.findMany({
          where: { id: { in: [...commentIds] } },
          select: { id: true, postId: true, status: true, deletedAt: true },
        })
      : Promise.resolve([]),
    messageIds.size
      ? prisma.communityChatMessage.findMany({
          where: { id: { in: [...messageIds] } },
          select: { id: true, roomId: true, status: true, deletedAt: true },
        })
      : Promise.resolve([]),
  ]);

  const postMap = new Map(posts.map((p) => [p.id, p]));
  const commentMap = new Map(comments.map((c) => [c.id, c]));
  const messageMap = new Map(messages.map((m) => [m.id, m]));

  const isGone = (status: string, deletedAt: Date | null) =>
    deletedAt != null || status === 'REMOVED' || status === 'DELETED';

  const out: DeliverableNotification[] = [];
  for (const n of notifications) {
    if (!n.targetType || !n.targetId) {
      out.push({ notification: n, href: abs(base, '/community/notifications') });
      continue;
    }
    if (n.targetType === 'POST') {
      const p = postMap.get(n.targetId);
      if (!p || isGone(p.status, p.deletedAt)) continue;
      out.push({ notification: n, href: abs(base, `/community/posts/${p.id}`) });
    } else if (n.targetType === 'COMMENT') {
      const c = commentMap.get(n.targetId);
      if (!c || isGone(c.status, c.deletedAt)) continue;
      out.push({
        notification: n,
        href: abs(base, `/community/posts/${c.postId}#comment-${c.id}`),
      });
    } else if (n.targetType === 'CHAT_MESSAGE') {
      const m = messageMap.get(n.targetId);
      if (!m || isGone(m.status, m.deletedAt)) continue;
      out.push({
        notification: n,
        href: abs(base, `/community/chat/${m.roomId}#message-${m.id}`),
      });
    }
  }
  return out;
}

// Builds a per-profile digest of UNREAD notifications, grouped by type, using
// safe titles + deep links only.
export async function buildDigestForProfile(
  profileId: string,
  opts: { now?: Date; appUrl?: string } = {}
): Promise<DigestResult> {
  const now = opts.now ?? new Date();
  const cutoff = new Date(now.getTime() - DIGEST_LOOKBACK_MS);

  const notifications = await prisma.communityNotification.findMany({
    where: { recipientId: profileId, readAt: null, createdAt: { gte: cutoff } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      targetType: true,
      targetId: true,
      title: true,
      createdAt: true,
    },
  });

  const deliverable = await resolveDeliverableNotifications(notifications, opts.appUrl);

  const byType = new Map<CommunityNotificationType, DigestItem[]>();
  for (const { notification, href } of deliverable) {
    const list = byType.get(notification.type) ?? [];
    list.push({ title: notification.title, href });
    byType.set(notification.type, list);
  }

  const sections: DigestSection[] = [];
  const seen = new Set<CommunityNotificationType>();
  for (const type of SECTION_ORDER) {
    const items = byType.get(type);
    if (items && items.length) {
      sections.push({ type, count: items.length, items });
      seen.add(type);
    }
  }
  // Any type not in the known order still gets a section.
  for (const [type, items] of byType) {
    if (seen.has(type) || !items.length) continue;
    sections.push({ type, count: items.length, items });
  }

  const itemCount = sections.reduce((sum, s) => sum + s.count, 0);
  return { itemCount, sections };
}
