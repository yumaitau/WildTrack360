import 'server-only';

import type { CommunityTargetType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assessCommunityContent, communityModerationModelId } from './assessment';
import { COMMUNITY_MODERATION_POLICY_VERSION, communityContentHash } from './policy';

type TransactionClient = Prisma.TransactionClient;

export async function enqueueCommunityModeration(
  tx: TransactionClient,
  input: {
    targetType: CommunityTargetType;
    targetId: string;
    title?: string | null;
    body: string;
  }
) {
  return tx.communityModerationJob.create({
    data: {
      targetType: input.targetType,
      targetId: input.targetId,
      title: input.title ?? null,
      body: input.body,
      contentHash: communityContentHash(input.title ?? null, input.body),
      policyVersion: COMMUNITY_MODERATION_POLICY_VERSION,
      modelId: communityModerationModelId,
    },
  });
}

async function currentDraftMatches(
  tx: TransactionClient,
  targetType: CommunityTargetType,
  targetId: string,
  expectedHash: string
) {
  if (targetType === 'POST') {
    const target = await tx.communityPost.findUnique({
      where: { id: targetId },
      select: { draftTitle: true, draftBody: true },
    });
    return Boolean(
      target && communityContentHash(target.draftTitle, target.draftBody) === expectedHash
    );
  }
  if (targetType === 'COMMENT') {
    const target = await tx.communityComment.findUnique({
      where: { id: targetId },
      select: { draftBody: true },
    });
    return Boolean(target && communityContentHash(null, target.draftBody) === expectedHash);
  }
  const target = await tx.communityChatMessage.findUnique({
    where: { id: targetId },
    select: { draftBody: true },
  });
  return Boolean(target && communityContentHash(null, target.draftBody) === expectedHash);
}

async function applyAssessment(
  tx: TransactionClient,
  job: {
    id: string;
    targetType: CommunityTargetType;
    targetId: string;
    title: string | null;
    body: string;
    contentHash: string;
    policyVersion: string;
    modelId: string;
  },
  assessment: Awaited<ReturnType<typeof assessCommunityContent>>
) {
  const matches = await currentDraftMatches(tx, job.targetType, job.targetId, job.contentHash);
  if (!matches) {
    await tx.communityModerationJob.update({
      where: { id: job.id },
      data: { status: 'FAILED', errorCode: 'superseded_revision', leaseExpiresAt: null },
    });
    return;
  }

  await tx.communityModerationEvent.create({
    data: {
      jobId: job.id,
      recommendation: assessment.recommendation,
      categories: assessment.categories,
      reasonCode: assessment.reasonCode,
      severity: assessment.severity,
      policyVersion: job.policyVersion,
      modelId: job.modelId,
      contentHash: job.contentHash,
    },
  });

  const published = assessment.recommendation === 'PUBLISH';
  let recipientId: string | null = null;
  if (job.targetType === 'POST') {
    const existing = await tx.communityPost.findUnique({
      where: { id: job.targetId },
      select: { title: true, authorId: true },
    });
    recipientId = existing?.authorId ?? null;
    await tx.communityPost.update({
      where: { id: job.targetId },
      data: published
        ? { title: job.title, body: job.body, status: 'PUBLISHED' }
        : existing?.title
          ? {}
          : { status: 'HELD' },
    });
  } else if (job.targetType === 'COMMENT') {
    const existing = await tx.communityComment.findUnique({
      where: { id: job.targetId },
      select: { body: true, authorId: true },
    });
    recipientId = existing?.authorId ?? null;
    await tx.communityComment.update({
      where: { id: job.targetId },
      data: published
        ? { body: job.body, status: 'PUBLISHED' }
        : existing?.body
          ? {}
          : { status: 'HELD' },
    });
  } else {
    const existing = await tx.communityChatMessage.findUnique({
      where: { id: job.targetId },
      select: { body: true, authorId: true },
    });
    recipientId = existing?.authorId ?? null;
    await tx.communityChatMessage.update({
      where: { id: job.targetId },
      data: published
        ? { body: job.body, status: 'PUBLISHED' }
        : existing?.body
          ? {}
          : { status: 'HELD' },
    });
  }

  await tx.communityModerationJob.update({
    where: { id: job.id },
    data: {
      status: published ? 'SUCCEEDED' : 'NEEDS_REVIEW',
      leaseExpiresAt: null,
      errorCode: null,
    },
  });
  if (!published && recipientId) {
    await tx.communityNotification.upsert({
      where: {
        recipientId_dedupeKey: {
          recipientId,
          dedupeKey: `moderation:${job.id}:automated`,
        },
      },
      create: {
        recipientId,
        type: 'MODERATION_DECISION',
        targetType: job.targetType,
        targetId: job.targetId,
        title: 'Your Community contribution is awaiting review',
        dedupeKey: `moderation:${job.id}:automated`,
      },
      update: {},
    });
  }
}

async function routeJobToHumanReview(
  job: {
    id: string;
    targetType: CommunityTargetType;
    targetId: string;
    policyVersion: string;
    contentHash: string;
  },
  reasonCode: string
) {
  await prisma.$transaction(async (tx) => {
    let recipientId: string | null = null;
    if (job.targetType === 'POST') {
      const existing = await tx.communityPost.findUnique({
        where: { id: job.targetId },
        select: { title: true, authorId: true },
      });
      recipientId = existing?.authorId ?? null;
      if (existing && !existing.title) {
        await tx.communityPost.update({ where: { id: job.targetId }, data: { status: 'HELD' } });
      }
    } else if (job.targetType === 'COMMENT') {
      const existing = await tx.communityComment.findUnique({
        where: { id: job.targetId },
        select: { body: true, authorId: true },
      });
      recipientId = existing?.authorId ?? null;
      if (existing && !existing.body) {
        await tx.communityComment.update({ where: { id: job.targetId }, data: { status: 'HELD' } });
      }
    } else {
      const existing = await tx.communityChatMessage.findUnique({
        where: { id: job.targetId },
        select: { body: true, authorId: true },
      });
      recipientId = existing?.authorId ?? null;
      if (existing && !existing.body) {
        await tx.communityChatMessage.update({
          where: { id: job.targetId },
          data: { status: 'HELD' },
        });
      }
    }
    await tx.communityModerationEvent.create({
      data: {
        jobId: job.id,
        recommendation: 'REVIEW',
        categories: ['moderation_unavailable'],
        reasonCode,
        severity: 'MEDIUM',
        policyVersion: job.policyVersion,
        modelId: 'system',
        contentHash: job.contentHash,
      },
    });
    await tx.communityModerationJob.update({
      where: { id: job.id },
      data: { status: 'NEEDS_REVIEW', leaseExpiresAt: null, errorCode: reasonCode },
    });
    if (recipientId) {
      await tx.communityNotification.upsert({
        where: {
          recipientId_dedupeKey: {
            recipientId,
            dedupeKey: `moderation:${job.id}:automated`,
          },
        },
        create: {
          recipientId,
          type: 'MODERATION_DECISION',
          targetType: job.targetType,
          targetId: job.targetId,
          title: 'Your Community contribution is awaiting review',
          dedupeKey: `moderation:${job.id}:automated`,
        },
        update: {},
      });
    }
  });
}

export async function processCommunityModerationJob(jobId: string) {
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + 60_000);
  const claimed = await prisma.communityModerationJob.updateMany({
    where: {
      id: jobId,
      // RUNNING is included so a job whose worker crashed mid-flight (lease
      // expired) is reclaimable — otherwise it strands in RUNNING forever,
      // invisible to both the feed and the moderator queue.
      status: { in: ['QUEUED', 'FAILED', 'RUNNING'] },
      attempts: { lt: 5 },
      nextRunAt: { lte: now },
      OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lt: now } }],
    },
    data: { status: 'RUNNING', leaseExpiresAt, attempts: { increment: 1 } },
  });
  if (claimed.count !== 1) return { processed: false as const };

  const job = await prisma.communityModerationJob.findUniqueOrThrow({ where: { id: jobId } });
  try {
    const assessment = await assessCommunityContent({ title: job.title, body: job.body });
    await prisma.$transaction((tx) => applyAssessment(tx, job, assessment));
    return { processed: true as const, recommendation: assessment.recommendation };
  } catch (error) {
    const attempts = job.attempts;
    // Never store provider messages because they can contain submitted UGC.
    const errorCode =
      error instanceof Error && error.message === 'community_guardrail_not_configured'
        ? 'guardrail_not_configured'
        : 'moderation_provider_error';
    // A moderation outage must never strand content in PENDING, where neither
    // the author's feed nor the moderation queue can surface it. A missing
    // guardrail never self-heals, and transient errors that exhaust their
    // retries have nowhere left to go — both fall through to human review so a
    // moderator always sees the content instead of it vanishing.
    if (errorCode === 'guardrail_not_configured' || attempts >= 5) {
      await routeJobToHumanReview(job, errorCode);
      return { processed: true as const, recommendation: 'REVIEW' as const };
    }
    await prisma.communityModerationJob.update({
      where: { id: job.id },
      data: {
        status: 'QUEUED',
        nextRunAt: new Date(Date.now() + Math.min(30 * 60_000, 2 ** attempts * 30_000)),
        leaseExpiresAt: null,
        errorCode,
      },
    });
    return { processed: true as const, recommendation: 'PENDING' as const };
  }
}

export async function processQueuedCommunityModerationJobs(limit = 10) {
  const now = new Date();
  const jobs = await prisma.communityModerationJob.findMany({
    where: {
      attempts: { lt: 5 },
      nextRunAt: { lte: now },
      OR: [
        { status: { in: ['QUEUED', 'FAILED'] } },
        // Sweep up crashed RUNNING jobs whose lease has expired.
        { status: 'RUNNING', leaseExpiresAt: { lt: now } },
      ],
    },
    orderBy: { nextRunAt: 'asc' },
    take: Math.max(1, Math.min(limit, 25)),
    select: { id: true },
  });
  const results = [];
  for (const job of jobs) results.push(await processCommunityModerationJob(job.id));
  return results;
}
