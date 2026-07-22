import 'server-only';

import type { CommunityNotificationType, CommunityTargetType, Prisma } from '@prisma/client';

// Notification types a member can silence from the settings "Activity choices".
// Account/content-action outcomes (moderation, report, appeal) are deliberately
// NOT here — they are always delivered. A type absent from this map is always
// created.
const PREFERENCE_FIELD = {
  REPLY: 'notifyReplies',
  MENTION: 'notifyMentions',
  ACCEPTED_ANSWER: 'notifyAcceptedAnswers',
  FOLLOWED_POST_ACTIVITY: 'notifyFollowedPosts',
  REACTION_SUMMARY: 'notifyReactionSummaries',
  BETA_ANNOUNCEMENT: 'notifyBetaAnnouncements',
} as const satisfies Partial<Record<CommunityNotificationType, string>>;

type GatedType = keyof typeof PREFERENCE_FIELD;

function preferenceField(type: CommunityNotificationType) {
  return (PREFERENCE_FIELD as Record<string, string>)[type] as
    (typeof PREFERENCE_FIELD)[GatedType] | undefined;
}

/**
 * Create an in-app community notification, honouring the recipient's per-type
 * preference. Suppressing creation also keeps it out of email digests, which
 * select from the notification rows. Idempotent via (recipientId, dedupeKey).
 */
export async function createCommunityNotification(
  tx: Prisma.TransactionClient,
  input: {
    recipientId: string;
    type: CommunityNotificationType;
    dedupeKey: string;
    title: string;
    actorId?: string | null;
    targetType?: CommunityTargetType | null;
    targetId?: string | null;
  }
): Promise<void> {
  const field = preferenceField(input.type);
  if (field) {
    const pref = await tx.communityNotificationPreference.findUnique({
      where: { profileId: input.recipientId },
      select: {
        notifyReplies: true,
        notifyMentions: true,
        notifyAcceptedAnswers: true,
        notifyFollowedPosts: true,
        notifyReactionSummaries: true,
        notifyBetaAnnouncements: true,
      },
    });
    // No preference row → schema defaults apply (gated types the producers use
    // default on), so only an explicit `false` opts the member out.
    if (pref && pref[field] === false) return;
  }

  await tx.communityNotification.upsert({
    where: {
      recipientId_dedupeKey: { recipientId: input.recipientId, dedupeKey: input.dedupeKey },
    },
    create: {
      recipientId: input.recipientId,
      actorId: input.actorId ?? null,
      type: input.type,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      title: input.title,
      dedupeKey: input.dedupeKey,
    },
    update: {},
  });
}
