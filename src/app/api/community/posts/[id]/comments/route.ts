import { NextRequest, NextResponse } from 'next/server';
import { readJson, requireCommunitySession, validationError } from '@/lib/community/api';
import { resolveCommunityMentions, notifyCommunityMentions } from '@/lib/community/mentions';
import {
  enqueueCommunityModeration,
  processCommunityModerationJob,
} from '@/lib/community/moderation/jobs';
import { createCommunityNotification } from '@/lib/community/notify';
import { takeCommunityRateLimit } from '@/lib/community/rate-limit';
import { communityCommentSchema } from '@/lib/community/validation';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCommunitySession({ write: true, profile: true });
  if ('error' in auth) return auth.error;
  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = communityCommentSchema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);
  const { id: postId } = await params;
  const post = await prisma.communityPost.findFirst({
    where: { id: postId, status: 'PUBLISHED', isLocked: false },
    select: { id: true, authorId: true },
  });
  if (!post) return NextResponse.json({ error: 'Post is unavailable or locked' }, { status: 404 });

  let parentAuthorId: string | null = null;
  if (parsed.data.parentId) {
    const parent = await prisma.communityComment.findFirst({
      where: { id: parsed.data.parentId, postId, status: 'PUBLISHED' },
      select: { id: true, parentId: true, authorId: true },
    });
    if (!parent) return NextResponse.json({ error: 'Reply target not found' }, { status: 404 });
    if (parent.parentId) {
      return NextResponse.json(
        { error: 'Community replies are limited to one level' },
        { status: 400 }
      );
    }
    parentAuthorId = parent.authorId;
  }

  const rate = await takeCommunityRateLimit(auth.session.profile!.id, 'comment');
  if (!rate.allowed) return NextResponse.json({ error: 'Comment limit reached' }, { status: 429 });

  const mentions = await resolveCommunityMentions(prisma, {
    body: parsed.data.body,
    submitted: parsed.data.mentions,
    authorProfileId: auth.session.profile!.id,
  });

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.communityComment.findUnique({
      where: {
        authorId_clientMutationId: {
          authorId: auth.session.profile!.id,
          clientMutationId: parsed.data.clientMutationId,
        },
      },
      select: { id: true },
    });
    if (existing) return { comment: existing, jobId: null as string | null };
    const comment = await tx.communityComment.create({
      data: {
        postId,
        authorId: auth.session.profile!.id,
        parentId: parsed.data.parentId ?? null,
        draftBody: parsed.data.body,
        mentions: mentions.length ? mentions : undefined,
        clientMutationId: parsed.data.clientMutationId,
      },
      select: { id: true },
    });
    const job = await enqueueCommunityModeration(tx, {
      targetType: 'COMMENT',
      targetId: comment.id,
      body: parsed.data.body,
    });
    return { comment, jobId: job.id };
  });

  const moderation = result.jobId ? await processCommunityModerationJob(result.jobId) : null;
  const saved = await prisma.communityComment.findUniqueOrThrow({
    where: { id: result.comment.id },
    select: { id: true, status: true },
  });
  if (saved.status === 'PUBLISHED' && result.jobId) {
    const directRecipient = parentAuthorId ?? post.authorId;
    // Everyone following the post hears about new activity, except the author
    // of this comment and the person already getting the direct REPLY.
    const followers = await prisma.communityFollow.findMany({
      where: { postId, profileId: { notIn: [auth.session.profile!.id, directRecipient] } },
      select: { profileId: true },
    });
    await prisma.$transaction(async (tx) => {
      await tx.communityPost.update({
        where: { id: postId },
        data: { lastActivityAt: new Date() },
      });
      if (directRecipient !== auth.session.profile!.id) {
        await createCommunityNotification(tx, {
          recipientId: directRecipient,
          type: 'REPLY',
          dedupeKey: `reply:${saved.id}`,
          title: parentAuthorId
            ? 'Someone replied to your comment'
            : 'Someone replied to your post',
          actorId: auth.session.profile!.id,
          targetType: 'POST',
          targetId: postId,
        });
      }
      for (const follower of followers) {
        await createCommunityNotification(tx, {
          recipientId: follower.profileId,
          type: 'FOLLOWED_POST_ACTIVITY',
          dedupeKey: `followed:${saved.id}:${follower.profileId}`,
          title: 'New activity in a discussion you follow',
          actorId: auth.session.profile!.id,
          targetType: 'POST',
          targetId: postId,
        });
      }
      // The direct REPLY recipient already got a ping for this comment; don't
      // also send them a mention. Everyone else mentioned links back to the post.
      await notifyCommunityMentions(tx, {
        mentions,
        actorId: auth.session.profile!.id,
        actorName: auth.session.profile!.displayName,
        contentId: saved.id,
        targetType: 'POST',
        targetId: postId,
        excludeIds: [directRecipient],
      });
    });
  }
  return NextResponse.json(
    { ...saved, moderation: moderation?.recommendation ?? 'EXISTING' },
    { status: result.jobId ? 201 : 200 }
  );
}
