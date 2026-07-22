import { z } from 'zod';

const clientMutationId = z
  .string()
  .min(8)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const compactText = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine((value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value), {
      message: 'Control characters are not allowed',
    });

export const communityProfileSchema = z.object({
  displayName: compactText(2, 60),
  showOrganisationBadge: z.boolean().default(false),
  region: compactText(2, 80).nullable().optional(),
  acceptGuidelines: z.literal(true),
});

// Structured @mention the composer attaches: a community profile id plus the
// display name it was shown as. Both are re-verified server-side against the
// live profile before anything is stored or notified — the client's claim is
// never trusted (see resolveCommunityMentions).
export const communityMentionRefSchema = z.object({
  id: z.string().min(1).max(100),
  name: compactText(2, 60),
});
export type CommunityMentionRef = z.infer<typeof communityMentionRefSchema>;
export const communityMentionsSchema = z.array(communityMentionRefSchema).max(20).optional();

export const communityPostSchema = z.object({
  type: z.enum(['DISCUSSION', 'QUESTION']),
  categoryId: z.string().min(1).max(100),
  title: compactText(6, 160),
  body: compactText(20, 10_000),
  mentions: communityMentionsSchema,
  clientMutationId,
  // Save as an author-only draft instead of submitting for moderation. The
  // publish endpoint later moves it to PENDING.
  asDraft: z.boolean().optional(),
});

export const communityPostUpdateSchema = communityPostSchema
  .pick({ title: true, body: true, categoryId: true, mentions: true })
  .partial()
  // isPinned/isLocked are moderator-only metadata applied without re-moderation;
  // the route enforces the moderator gate and ignores them for non-moderators.
  .extend({
    isPinned: z.boolean().optional(),
    isLocked: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'No changes supplied');

export const communityCommentSchema = z.object({
  body: compactText(2, 4_000),
  mentions: communityMentionsSchema,
  parentId: z.string().min(1).max(100).nullable().optional(),
  clientMutationId,
});

export const communityChatMessageSchema = z.object({
  body: compactText(1, 2_000),
  mentions: communityMentionsSchema,
  parentId: z.string().min(1).max(100).nullable().optional(),
  clientMutationId,
});

export const communityReactionSchema = z.object({
  type: z.enum(['HELPFUL', 'THANKS', 'SUPPORT', 'CELEBRATE']),
});

export const communityReportSchema = z.object({
  targetType: z.enum(['POST', 'COMMENT', 'CHAT_MESSAGE']),
  targetId: z.string().min(1).max(100),
  reason: z.enum([
    'SAFETY',
    'HARASSMENT',
    'SENSITIVE_LOCATION',
    'CULTURAL_INFORMATION',
    'PERSONAL_INFORMATION',
    'SPAM',
    'OTHER',
  ]),
  details: compactText(4, 2_000).nullable().optional(),
});

export const communityFeedbackSchema = z.object({
  type: z.enum(['FEATURE_REQUEST', 'BUG', 'CONFUSING_EXPERIENCE', 'SAFETY_MODERATION', 'OTHER']),
  message: compactText(5, 4_000),
  requestedFeatures: z
    .array(
      z.enum([
        'IMAGES_FILES',
        'REGIONAL_PRIVATE_GROUPS',
        'DIRECT_MESSAGES',
        'EVENTS',
        'BETTER_SEARCH',
        'MOBILE_PUSH',
        'ORGANISATION_PROFILES',
        'OTHER',
      ])
    )
    .max(4)
    .default([]),
  pageContext: z.string().trim().max(300).nullable().optional(),
  contactConsent: z.boolean().default(false),
});

export const communityNotificationPreferenceSchema = z.object({
  emailEnabled: z.boolean(),
  frequency: z.enum(['OFF', 'IMMEDIATE', 'DAILY', 'WEEKLY']),
  timezone: z.string().trim().min(1).max(100),
  digestDay: z.number().int().min(0).max(6),
  digestHour: z.number().int().min(0).max(23),
  notifyReplies: z.boolean(),
  notifyMentions: z.boolean(),
  notifyAcceptedAnswers: z.boolean(),
  notifyFollowedPosts: z.boolean(),
  notifyCategories: z.boolean(),
  notifyChats: z.boolean(),
  notifyReactionSummaries: z.boolean(),
  notifyBetaAnnouncements: z.boolean(),
});
