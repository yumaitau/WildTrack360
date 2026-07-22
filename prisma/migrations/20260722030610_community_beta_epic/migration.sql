-- CreateEnum
CREATE TYPE "CommunityPostType" AS ENUM ('DISCUSSION', 'QUESTION');

-- CreateEnum
CREATE TYPE "CommunityContentStatus" AS ENUM ('PENDING', 'PUBLISHED', 'HELD', 'REMOVED', 'DELETED', 'DRAFT');

-- CreateEnum
CREATE TYPE "CommunityReactionType" AS ENUM ('HELPFUL', 'THANKS', 'SUPPORT', 'CELEBRATE');

-- CreateEnum
CREATE TYPE "CommunityTargetType" AS ENUM ('POST', 'COMMENT', 'CHAT_MESSAGE');

-- CreateEnum
CREATE TYPE "CommunityReportReason" AS ENUM ('SAFETY', 'HARASSMENT', 'SENSITIVE_LOCATION', 'CULTURAL_INFORMATION', 'PERSONAL_INFORMATION', 'SPAM', 'OTHER');

-- CreateEnum
CREATE TYPE "CommunityReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "CommunityAppealStatus" AS ENUM ('OPEN', 'REVIEWING', 'UPHELD', 'OVERTURNED');

-- CreateEnum
CREATE TYPE "CommunityModerationJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'NEEDS_REVIEW', 'FAILED');

-- CreateEnum
CREATE TYPE "CommunityModerationRecommendation" AS ENUM ('PUBLISH', 'REVIEW', 'HOLD');

-- CreateEnum
CREATE TYPE "CommunityModerationSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CommunityFeedbackType" AS ENUM ('FEATURE_REQUEST', 'BUG', 'CONFUSING_EXPERIENCE', 'SAFETY_MODERATION', 'OTHER');

-- CreateEnum
CREATE TYPE "CommunityRequestedFeature" AS ENUM ('IMAGES_FILES', 'REGIONAL_PRIVATE_GROUPS', 'DIRECT_MESSAGES', 'EVENTS', 'BETTER_SEARCH', 'MOBILE_PUSH', 'ORGANISATION_PROFILES', 'OTHER');

-- CreateEnum
CREATE TYPE "CommunityFeedbackStatus" AS ENUM ('NEW', 'REVIEWED', 'PLANNED', 'SHIPPED', 'DECLINED');

-- CreateEnum
CREATE TYPE "CommunityNotificationType" AS ENUM ('REPLY', 'MENTION', 'ACCEPTED_ANSWER', 'REACTION_SUMMARY', 'FOLLOWED_POST_ACTIVITY', 'MODERATION_DECISION', 'REPORT_OUTCOME', 'APPEAL_OUTCOME', 'BETA_ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "CommunityEmailFrequency" AS ENUM ('OFF', 'IMMEDIATE', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "CommunityProfileStatus" AS ENUM ('ACTIVE', 'MUTED', 'BANNED', 'LEFT');

-- CreateEnum
CREATE TYPE "CommunitySanctionType" AS ENUM ('WARNING', 'MUTE', 'BAN');

-- CreateEnum
CREATE TYPE "CommunitySubscriptionTarget" AS ENUM ('POST', 'CATEGORY', 'CHAT_ROOM');

-- CreateEnum
CREATE TYPE "CommunityEmailDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SUPPRESSED');

-- CreateTable
CREATE TABLE "CommunityProfile" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "homeClerkOrganizationId" TEXT NOT NULL,
    "homeOrganisationName" TEXT,
    "displayName" TEXT NOT NULL,
    "showOrganisationBadge" BOOLEAN NOT NULL DEFAULT false,
    "region" TEXT,
    "guidelinesVersion" TEXT,
    "guidelinesAcceptedAt" TIMESTAMP(3),
    "isModerator" BOOLEAN NOT NULL DEFAULT false,
    "status" "CommunityProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "type" "CommunityPostType" NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "draftTitle" TEXT NOT NULL,
    "draftBody" TEXT NOT NULL,
    "status" "CommunityContentStatus" NOT NULL DEFAULT 'PENDING',
    "clientMutationId" TEXT NOT NULL,
    "mentions" JSONB,
    "acceptedCommentId" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT,
    "draftBody" TEXT NOT NULL,
    "status" "CommunityContentStatus" NOT NULL DEFAULT 'PENDING',
    "clientMutationId" TEXT NOT NULL,
    "mentions" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityReaction" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" "CommunityReactionType" NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "chatMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityFollow" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityBookmark" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityChatRoom" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isReadOnly" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "slowModeSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityChatRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityChatMessage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT,
    "draftBody" TEXT NOT NULL,
    "status" "CommunityContentStatus" NOT NULL DEFAULT 'PENDING',
    "clientMutationId" TEXT NOT NULL,
    "mentions" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "CommunityTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" "CommunityReportReason" NOT NULL,
    "details" TEXT,
    "status" "CommunityReportStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityModerationJob" (
    "id" TEXT NOT NULL,
    "targetType" "CommunityTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "status" "CommunityModerationJobStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseExpiresAt" TIMESTAMP(3),
    "policyVersion" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityModerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityModerationEvent" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "actorProfileId" TEXT,
    "recommendation" "CommunityModerationRecommendation" NOT NULL,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reasonCode" TEXT NOT NULL,
    "severity" "CommunityModerationSeverity" NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityModerationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityNotification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "CommunityNotificationType" NOT NULL,
    "targetType" "CommunityTargetType",
    "targetId" TEXT,
    "title" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityNotificationPreference" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "frequency" "CommunityEmailFrequency" NOT NULL DEFAULT 'OFF',
    "timezone" TEXT NOT NULL,
    "digestDay" INTEGER NOT NULL DEFAULT 1,
    "digestHour" INTEGER NOT NULL DEFAULT 8,
    "notifyReplies" BOOLEAN NOT NULL DEFAULT true,
    "notifyMentions" BOOLEAN NOT NULL DEFAULT true,
    "notifyAcceptedAnswers" BOOLEAN NOT NULL DEFAULT true,
    "notifyFollowedPosts" BOOLEAN NOT NULL DEFAULT true,
    "notifyCategories" BOOLEAN NOT NULL DEFAULT false,
    "notifyChats" BOOLEAN NOT NULL DEFAULT false,
    "notifyReactionSummaries" BOOLEAN NOT NULL DEFAULT false,
    "notifyBetaAnnouncements" BOOLEAN NOT NULL DEFAULT true,
    "preferenceVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityBetaFeedback" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" "CommunityFeedbackType" NOT NULL,
    "message" TEXT NOT NULL,
    "requestedFeatures" "CommunityRequestedFeature"[] DEFAULT ARRAY[]::"CommunityRequestedFeature"[],
    "pageContext" TEXT,
    "contactConsent" BOOLEAN NOT NULL DEFAULT false,
    "status" "CommunityFeedbackStatus" NOT NULL DEFAULT 'NEW',
    "triageNote" TEXT,
    "roadmapUrl" TEXT,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityBetaFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityRateLimitBucket" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityRateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityAppeal" (
    "id" TEXT NOT NULL,
    "appellantId" TEXT NOT NULL,
    "targetType" "CommunityTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "status" "CommunityAppealStatus" NOT NULL DEFAULT 'OPEN',
    "reviewerId" TEXT,
    "outcomeReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityAppeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunitySanction" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" "CommunitySanctionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "createdById" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunitySanction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityEmailDelivery" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "preferenceVersion" INTEGER NOT NULL,
    "providerMessageId" TEXT,
    "status" "CommunityEmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "CommunityEmailDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunitySubscription" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "targetType" "CommunitySubscriptionTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "emailFrequency" "CommunityEmailFrequency",
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunitySubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityProfile_clerkUserId_key" ON "CommunityProfile"("clerkUserId");

-- CreateIndex
CREATE INDEX "CommunityProfile_homeClerkOrganizationId_idx" ON "CommunityProfile"("homeClerkOrganizationId");

-- CreateIndex
CREATE INDEX "CommunityBlock_blockedId_idx" ON "CommunityBlock"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityBlock_blockerId_blockedId_key" ON "CommunityBlock"("blockerId", "blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityCategory_slug_key" ON "CommunityCategory"("slug");

-- CreateIndex
CREATE INDEX "CommunityCategory_isActive_sortOrder_idx" ON "CommunityCategory"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPost_acceptedCommentId_key" ON "CommunityPost"("acceptedCommentId");

-- CreateIndex
CREATE INDEX "CommunityPost_status_lastActivityAt_id_idx" ON "CommunityPost"("status", "lastActivityAt" DESC, "id");

-- CreateIndex
CREATE INDEX "CommunityPost_categoryId_type_status_lastActivityAt_idx" ON "CommunityPost"("categoryId", "type", "status", "lastActivityAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPost_authorId_clientMutationId_key" ON "CommunityPost"("authorId", "clientMutationId");

-- CreateIndex
CREATE INDEX "CommunityComment_postId_status_createdAt_id_idx" ON "CommunityComment"("postId", "status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "CommunityComment_parentId_idx" ON "CommunityComment"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityComment_authorId_clientMutationId_key" ON "CommunityComment"("authorId", "clientMutationId");

-- CreateIndex
CREATE INDEX "CommunityReaction_postId_type_idx" ON "CommunityReaction"("postId", "type");

-- CreateIndex
CREATE INDEX "CommunityReaction_commentId_type_idx" ON "CommunityReaction"("commentId", "type");

-- CreateIndex
CREATE INDEX "CommunityReaction_chatMessageId_type_idx" ON "CommunityReaction"("chatMessageId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityReaction_profileId_type_postId_key" ON "CommunityReaction"("profileId", "type", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityReaction_profileId_type_commentId_key" ON "CommunityReaction"("profileId", "type", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityReaction_profileId_type_chatMessageId_key" ON "CommunityReaction"("profileId", "type", "chatMessageId");

-- CreateIndex
CREATE INDEX "CommunityFollow_postId_idx" ON "CommunityFollow"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityFollow_profileId_postId_key" ON "CommunityFollow"("profileId", "postId");

-- CreateIndex
CREATE INDEX "CommunityBookmark_postId_idx" ON "CommunityBookmark"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityBookmark_profileId_postId_key" ON "CommunityBookmark"("profileId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityChatRoom_slug_key" ON "CommunityChatRoom"("slug");

-- CreateIndex
CREATE INDEX "CommunityChatRoom_isArchived_isPinned_name_idx" ON "CommunityChatRoom"("isArchived", "isPinned", "name");

-- CreateIndex
CREATE INDEX "CommunityChatMessage_roomId_status_createdAt_id_idx" ON "CommunityChatMessage"("roomId", "status", "createdAt" DESC, "id");

-- CreateIndex
CREATE INDEX "CommunityChatMessage_parentId_idx" ON "CommunityChatMessage"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityChatMessage_authorId_clientMutationId_key" ON "CommunityChatMessage"("authorId", "clientMutationId");

-- CreateIndex
CREATE INDEX "CommunityReport_status_createdAt_idx" ON "CommunityReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityReport_targetType_targetId_idx" ON "CommunityReport"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityReport_reporterId_targetType_targetId_key" ON "CommunityReport"("reporterId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "CommunityModerationJob_status_nextRunAt_idx" ON "CommunityModerationJob"("status", "nextRunAt");

-- CreateIndex
CREATE INDEX "CommunityModerationJob_targetType_targetId_createdAt_idx" ON "CommunityModerationJob"("targetType", "targetId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CommunityModerationEvent_jobId_createdAt_idx" ON "CommunityModerationEvent"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityModerationEvent_recommendation_createdAt_idx" ON "CommunityModerationEvent"("recommendation", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityNotification_recipientId_readAt_createdAt_idx" ON "CommunityNotification"("recipientId", "readAt", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityNotification_recipientId_dedupeKey_key" ON "CommunityNotification"("recipientId", "dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityNotificationPreference_profileId_key" ON "CommunityNotificationPreference"("profileId");

-- CreateIndex
CREATE INDEX "CommunityBetaFeedback_status_createdAt_idx" ON "CommunityBetaFeedback"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityBetaFeedback_profileId_createdAt_idx" ON "CommunityBetaFeedback"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityRateLimitBucket_windowStart_idx" ON "CommunityRateLimitBucket"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityRateLimitBucket_profileId_action_windowStart_key" ON "CommunityRateLimitBucket"("profileId", "action", "windowStart");

-- CreateIndex
CREATE INDEX "CommunityAppeal_status_createdAt_idx" ON "CommunityAppeal"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityAppeal_appellantId_targetType_targetId_key" ON "CommunityAppeal"("appellantId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "CommunitySanction_profileId_startsAt_idx" ON "CommunitySanction"("profileId", "startsAt" DESC);

-- CreateIndex
CREATE INDEX "CommunitySanction_endsAt_idx" ON "CommunitySanction"("endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityEmailDelivery_dedupeKey_key" ON "CommunityEmailDelivery"("dedupeKey");

-- CreateIndex
CREATE INDEX "CommunityEmailDelivery_recipientId_createdAt_idx" ON "CommunityEmailDelivery"("recipientId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CommunityEmailDelivery_status_createdAt_idx" ON "CommunityEmailDelivery"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CommunitySubscription_targetType_targetId_idx" ON "CommunitySubscription"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunitySubscription_profileId_targetType_targetId_key" ON "CommunitySubscription"("profileId", "targetType", "targetId");

-- RenameForeignKey
ALTER TABLE "carer_interests" RENAME CONSTRAINT "carer_interests_member_id_fkey" TO "carer_interests_member_id_clerk_organization_id_fkey";

-- RenameForeignKey
ALTER TABLE "member_messages" RENAME CONSTRAINT "member_messages_member_id_fkey" TO "member_messages_member_id_clerk_organization_id_fkey";

-- RenameForeignKey
ALTER TABLE "members" RENAME CONSTRAINT "members_primary_member_id_fkey" TO "members_primary_member_id_clerk_organization_id_fkey";

-- RenameForeignKey
ALTER TABLE "membership_notifications" RENAME CONSTRAINT "membership_notifications_member_id_fkey" TO "membership_notifications_member_id_clerk_organization_id_fkey";

-- RenameForeignKey
ALTER TABLE "membership_notifications" RENAME CONSTRAINT "membership_notifications_membership_id_fkey" TO "membership_notifications_membership_id_clerk_organization__fkey";

-- AddForeignKey
ALTER TABLE "CommunityBlock" ADD CONSTRAINT "CommunityBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "CommunityProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityBlock" ADD CONSTRAINT "CommunityBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "CommunityProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "CommunityProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CommunityCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_acceptedCommentId_fkey" FOREIGN KEY ("acceptedCommentId") REFERENCES "CommunityComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "CommunityProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CommunityComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CommunityProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "CommunityComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_chatMessageId_fkey" FOREIGN KEY ("chatMessageId") REFERENCES "CommunityChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityFollow" ADD CONSTRAINT "CommunityFollow_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CommunityProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityFollow" ADD CONSTRAINT "CommunityFollow_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityBookmark" ADD CONSTRAINT "CommunityBookmark_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CommunityProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityBookmark" ADD CONSTRAINT "CommunityBookmark_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityChatRoom" ADD CONSTRAINT "CommunityChatRoom_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CommunityCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityChatMessage" ADD CONSTRAINT "CommunityChatMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "CommunityChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityChatMessage" ADD CONSTRAINT "CommunityChatMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "CommunityProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityChatMessage" ADD CONSTRAINT "CommunityChatMessage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CommunityChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReport" ADD CONSTRAINT "CommunityReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "CommunityProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityModerationEvent" ADD CONSTRAINT "CommunityModerationEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "CommunityModerationJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityModerationEvent" ADD CONSTRAINT "CommunityModerationEvent_actorProfileId_fkey" FOREIGN KEY ("actorProfileId") REFERENCES "CommunityProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityNotification" ADD CONSTRAINT "CommunityNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "CommunityProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityNotification" ADD CONSTRAINT "CommunityNotification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "CommunityProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityNotificationPreference" ADD CONSTRAINT "CommunityNotificationPreference_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CommunityProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityBetaFeedback" ADD CONSTRAINT "CommunityBetaFeedback_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CommunityProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityRateLimitBucket" ADD CONSTRAINT "CommunityRateLimitBucket_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CommunityProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityAppeal" ADD CONSTRAINT "CommunityAppeal_appellantId_fkey" FOREIGN KEY ("appellantId") REFERENCES "CommunityProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunitySanction" ADD CONSTRAINT "CommunitySanction_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CommunityProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunitySanction" ADD CONSTRAINT "CommunitySanction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "CommunityProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityEmailDelivery" ADD CONSTRAINT "CommunityEmailDelivery_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "CommunityProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunitySubscription" ADD CONSTRAINT "CommunitySubscription_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CommunityProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "custom_form_submissions_clerk_organization_id_submitted_by_idx" RENAME TO "custom_form_submissions_clerk_organization_id_submitted_by__idx";

-- RenameIndex
ALTER INDEX "custom_form_submissions_clerk_organization_id_submitted_by_key" RENAME TO "custom_form_submissions_clerk_organization_id_submitted_by__key";
