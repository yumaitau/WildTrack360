import { NextRequest, NextResponse } from 'next/server';
import { readJson, requireCommunitySession, validationError } from '@/lib/community/api';
import { resolveCommunityMentions, notifyCommunityMentions } from '@/lib/community/mentions';
import {
  enqueueCommunityModeration,
  processCommunityModerationJob,
} from '@/lib/community/moderation/jobs';
import { takeCommunityRateLimit } from '@/lib/community/rate-limit';
import { communityCommentSchema } from '@/lib/community/validation';
import { prisma } from '@/lib/prisma';

// Body and its @mentions are editable; parentId and clientMutationId are fixed at
// creation, so an edit reuses the create schema's body + mention rules only.
const commentEditSchema = communityCommentSchema.pick({ body: true, mentions: true });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const auth = await requireCommunitySession({ write: true, profile: true });
  if ('error' in auth) return auth.error;
  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = commentEditSchema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);
  const { id: postId, commentId } = await params;

  const comment = await prisma.communityComment.findFirst({
    where: { id: commentId, postId },
    select: { authorId: true, status: true, body: true },
  });
  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  // DELETED and REMOVED are terminal — re-moderating them could let an AI PUBLISH
  // verdict overturn a human REMOVE or resurrect self-deleted text. Appeals are the
  // route back from REMOVED. Mirrors the post PATCH handler.
  if (comment.status === 'DELETED' || comment.status === 'REMOVED') {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  }
  // Moderators do not edit other people's words; only the author may edit text.
  if (comment.authorId !== auth.session.profile!.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rate = await takeCommunityRateLimit(auth.session.profile!.id, 'edit');
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Edit limit reached' }, { status: 429 });
  }

  const mentions = await resolveCommunityMentions(prisma, {
    body: parsed.data.body,
    submitted: parsed.data.mentions,
    authorProfileId: auth.session.profile!.id,
  });

  const job = await prisma.$transaction(async (tx) => {
    await tx.communityComment.update({
      where: { id: commentId },
      data: {
        draftBody: parsed.data.body,
        // Rewrite the stored set so removed mentions clear; [] on none.
        mentions,
        // A never-published comment re-enters PENDING; an already-published one
        // keeps its live body visible while the revision is re-checked.
        ...(comment.body ? {} : { status: 'PENDING' as const }),
      },
    });
    return enqueueCommunityModeration(tx, {
      targetType: 'COMMENT',
      targetId: commentId,
      body: parsed.data.body,
    });
  });
  const moderation = await processCommunityModerationJob(job.id);
  const saved = await prisma.communityComment.findUniqueOrThrow({
    where: { id: commentId },
    select: { id: true, status: true },
  });
  // Newly-added mentions ping (dedupe suppresses anyone already notified).
  if (saved.status === 'PUBLISHED' && mentions.length) {
    await prisma.$transaction((tx) =>
      notifyCommunityMentions(tx, {
        mentions,
        actorId: auth.session.profile!.id,
        actorName: auth.session.profile!.displayName,
        contentId: commentId,
        targetType: 'POST',
        targetId: postId,
      })
    );
  }
  return NextResponse.json({ ...saved, moderation: moderation.recommendation });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const auth = await requireCommunitySession({ write: true, profile: true });
  if ('error' in auth) return auth.error;
  const { id: postId, commentId } = await params;

  const comment = await prisma.communityComment.findFirst({
    where: { id: commentId, postId },
    select: { authorId: true, status: true },
  });
  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

  const isOwner = comment.authorId === auth.session.profile!.id;
  if (!isOwner && !auth.session.profile!.isModerator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (comment.status === 'DELETED' || comment.status === 'REMOVED') {
    return new NextResponse(null, { status: 204 });
  }

  await prisma.$transaction(async (tx) => {
    // Author self-delete → DELETED; a moderator removing someone else's → REMOVED.
    await tx.communityComment.update({
      where: { id: commentId },
      data: { status: isOwner ? 'DELETED' : 'REMOVED', deletedAt: new Date() },
    });
    // If this was a question's accepted answer, drop the pointer so it stops
    // showing "Answered" with the answer gone.
    await tx.communityPost.updateMany({
      where: { acceptedCommentId: commentId },
      data: { acceptedCommentId: null },
    });
  });
  return new NextResponse(null, { status: 204 });
}
