import 'server-only';

import { prisma } from '@/lib/prisma';
import type { CommunityFeedbackStatus, CommunityRequestedFeature } from '@prisma/client';

const FEEDBACK_STATUSES: CommunityFeedbackStatus[] = [
  'NEW',
  'REVIEWED',
  'PLANNED',
  'SHIPPED',
  'DECLINED',
];

export interface CommunityMetrics {
  product: {
    enabledOrganisations: number;
    activeProfiles: number;
    posts: number;
    questions: number;
    answeredQuestions: number;
    comments: number;
    chatMessages: number;
    reactions: number;
  };
  moderation: {
    queueDepth: number;
    failedJobs: number;
    openReports: number;
    openAppeals: number;
    oldestPendingAgeHours: number;
  };
  feedback: {
    total: number;
    byStatus: Record<CommunityFeedbackStatus, number>;
    topRequestedFeatures: Array<{ feature: CommunityRequestedFeature; count: number }>;
  };
}

export async function computeCommunityMetrics(): Promise<CommunityMetrics> {
  const now = Date.now();

  const [
    enabledOrganisations,
    activeProfiles,
    posts,
    questions,
    answeredQuestions,
    comments,
    chatMessages,
    reactions,
    queueDepth,
    failedJobs,
    openReports,
    openAppeals,
    oldestPending,
    feedbackTotal,
    feedbackByStatus,
    featureRows,
  ] = await Promise.all([
    prisma.orgFeatureFlag.count({ where: { feature: 'COMMUNITY_BOARD', enabled: true } }),
    prisma.communityProfile.count({ where: { status: 'ACTIVE' } }),
    prisma.communityPost.count({ where: { status: 'PUBLISHED' } }),
    prisma.communityPost.count({ where: { status: 'PUBLISHED', type: 'QUESTION' } }),
    prisma.communityPost.count({
      where: { status: 'PUBLISHED', type: 'QUESTION', acceptedCommentId: { not: null } },
    }),
    prisma.communityComment.count({ where: { status: 'PUBLISHED' } }),
    prisma.communityChatMessage.count({ where: { status: 'PUBLISHED' } }),
    prisma.communityReaction.count(),
    prisma.communityModerationJob.count({ where: { status: 'NEEDS_REVIEW' } }),
    prisma.communityModerationJob.count({ where: { status: 'FAILED' } }),
    prisma.communityReport.count({ where: { status: { in: ['OPEN', 'REVIEWING'] } } }),
    prisma.communityAppeal.count({ where: { status: { in: ['OPEN', 'REVIEWING'] } } }),
    prisma.communityModerationJob.aggregate({
      where: { status: 'NEEDS_REVIEW' },
      _min: { createdAt: true },
    }),
    prisma.communityBetaFeedback.count(),
    prisma.communityBetaFeedback.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.communityBetaFeedback.findMany({ select: { requestedFeatures: true } }),
  ]);

  const oldestCreatedAt = oldestPending._min.createdAt;
  const oldestPendingAgeHours = oldestCreatedAt
    ? Math.max(0, (now - oldestCreatedAt.getTime()) / 3_600_000)
    : 0;

  const byStatus = FEEDBACK_STATUSES.reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<CommunityFeedbackStatus, number>
  );
  for (const row of feedbackByStatus) {
    byStatus[row.status] = row._count._all;
  }

  const featureCounts = new Map<CommunityRequestedFeature, number>();
  for (const row of featureRows) {
    for (const feature of row.requestedFeatures) {
      featureCounts.set(feature, (featureCounts.get(feature) ?? 0) + 1);
    }
  }
  const topRequestedFeatures = Array.from(featureCounts.entries())
    .map(([feature, count]) => ({ feature, count }))
    .sort((a, b) => b.count - a.count);

  return {
    product: {
      enabledOrganisations,
      activeProfiles,
      posts,
      questions,
      answeredQuestions,
      comments,
      chatMessages,
      reactions,
    },
    moderation: {
      queueDepth,
      failedJobs,
      openReports,
      openAppeals,
      oldestPendingAgeHours,
    },
    feedback: {
      total: feedbackTotal,
      byStatus,
      topRequestedFeatures,
    },
  };
}
