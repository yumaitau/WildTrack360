import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readJson, requireCommunitySession, validationError } from '@/lib/community/api';
import { communityContentHash } from '@/lib/community/moderation/policy';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  action: z.enum(['PUBLISH', 'HOLD', 'REMOVE']),
  reasonCode: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9_]+$/),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCommunitySession({ write: true, profile: true });
  if ('error' in auth) return auth.error;
  if (!auth.session.profile!.isModerator && !auth.session.isPlatformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);
  const { id } = await params;
  const job = await prisma.communityModerationJob.findUnique({ where: { id } });
  if (!job || job.status !== 'NEEDS_REVIEW') {
    return NextResponse.json({ error: 'Moderation case is no longer open' }, { status: 409 });
  }

  const applied = await prisma.$transaction(async (tx) => {
    const claim = await tx.communityModerationJob.updateMany({
      where: { id: job.id, status: 'NEEDS_REVIEW' },
      data: { status: 'RUNNING' },
    });
    if (claim.count !== 1) return false;

    let matches = false;
    let recipientId: string | null = null;
    if (job.targetType === 'POST') {
      const target = await tx.communityPost.findUnique({ where: { id: job.targetId } });
      matches = Boolean(
        target && communityContentHash(target.draftTitle, target.draftBody) === job.contentHash
      );
      if (matches && target) {
        recipientId = target.authorId;
        await tx.communityPost.update({
          where: { id: target.id },
          data:
            parsed.data.action === 'PUBLISH'
              ? { title: job.title, body: job.body, status: 'PUBLISHED' }
              : parsed.data.action === 'REMOVE'
                ? { status: 'REMOVED' }
                : target.title
                  ? {}
                  : { status: 'HELD' },
        });
      }
    } else if (job.targetType === 'COMMENT') {
      const target = await tx.communityComment.findUnique({ where: { id: job.targetId } });
      matches = Boolean(target && communityContentHash(null, target.draftBody) === job.contentHash);
      if (matches && target) {
        recipientId = target.authorId;
        await tx.communityComment.update({
          where: { id: target.id },
          data:
            parsed.data.action === 'PUBLISH'
              ? { body: job.body, status: 'PUBLISHED' }
              : parsed.data.action === 'REMOVE'
                ? { status: 'REMOVED' }
                : target.body
                  ? {}
                  : { status: 'HELD' },
        });
        if (parsed.data.action === 'REMOVE') {
          await tx.communityPost.updateMany({
            where: { acceptedCommentId: target.id },
            data: { acceptedCommentId: null },
          });
        }
      }
    } else {
      const target = await tx.communityChatMessage.findUnique({ where: { id: job.targetId } });
      matches = Boolean(target && communityContentHash(null, target.draftBody) === job.contentHash);
      if (matches && target) {
        recipientId = target.authorId;
        await tx.communityChatMessage.update({
          where: { id: target.id },
          data:
            parsed.data.action === 'PUBLISH'
              ? { body: job.body, status: 'PUBLISHED' }
              : parsed.data.action === 'REMOVE'
                ? { status: 'REMOVED' }
                : target.body
                  ? {}
                  : { status: 'HELD' },
        });
      }
    }
    if (!matches) {
      await tx.communityModerationJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', errorCode: 'superseded_revision' },
      });
      return false;
    }
    await tx.communityModerationEvent.create({
      data: {
        jobId: job.id,
        actorProfileId: auth.session.profile!.id,
        recommendation: parsed.data.action === 'PUBLISH' ? 'PUBLISH' : 'HOLD',
        severity: parsed.data.action === 'PUBLISH' ? 'LOW' : 'HIGH',
        categories: ['human_review'],
        reasonCode: parsed.data.reasonCode,
        policyVersion: job.policyVersion,
        modelId: 'human',
        contentHash: job.contentHash,
      },
    });
    if (recipientId && recipientId !== auth.session.profile!.id) {
      await tx.communityNotification.upsert({
        where: {
          recipientId_dedupeKey: {
            recipientId,
            dedupeKey: `moderation:${job.id}:human`,
          },
        },
        create: {
          recipientId,
          actorId: auth.session.profile!.id,
          type: 'MODERATION_DECISION',
          targetType: job.targetType,
          targetId: job.targetId,
          title:
            parsed.data.action === 'PUBLISH'
              ? 'Your Community contribution was approved'
              : 'A moderator reviewed your Community contribution',
          dedupeKey: `moderation:${job.id}:human`,
        },
        update: {},
      });
    }
    await tx.communityModerationJob.update({
      where: { id: job.id },
      data: {
        status: 'SUCCEEDED',
        errorCode:
          parsed.data.action === 'PUBLISH' ? null : `human_${parsed.data.action.toLowerCase()}`,
      },
    });
    // Retries/edits can leave duplicate jobs for the same target in the queue.
    // This decision covers the content, so close the siblings — otherwise a
    // moderator could act on a stale same-hash sibling and re-apply a decision
    // (e.g. REMOVE after this PUBLISH).
    await tx.communityModerationJob.updateMany({
      where: {
        targetType: job.targetType,
        targetId: job.targetId,
        status: 'NEEDS_REVIEW',
        id: { not: job.id },
      },
      data: { status: 'SUCCEEDED', errorCode: 'resolved_by_sibling', leaseExpiresAt: null },
    });
    return true;
  });
  if (!applied)
    return NextResponse.json({ error: 'A newer edit replaced this revision' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
