import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readJson, requireCommunitySession, validationError } from '@/lib/community/api';
import { createCommunityNotification } from '@/lib/community/notify';
import { prisma } from '@/lib/prisma';

const schema = z.object({ commentId: z.string().min(1).max(100).nullable() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCommunitySession({ write: true, profile: true });
  if ('error' in auth) return auth.error;
  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);
  const { id: postId } = await params;
  const post = await prisma.communityPost.findUnique({ where: { id: postId } });
  if (!post || post.type !== 'QUESTION' || post.status !== 'PUBLISHED' || post.isLocked) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 });
  }
  if (post.authorId !== auth.session.profile!.id && !auth.session.profile!.isModerator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const comment = parsed.data.commentId
    ? await prisma.communityComment.findFirst({
        where: { id: parsed.data.commentId, postId, status: 'PUBLISHED' },
      })
    : null;
  if (parsed.data.commentId && !comment) {
    return NextResponse.json({ error: 'Answer not found' }, { status: 404 });
  }
  await prisma.$transaction(async (tx) => {
    await tx.communityPost.update({
      where: { id: postId },
      data: { acceptedCommentId: parsed.data.commentId },
    });
    if (comment && comment.authorId !== auth.session.profile!.id) {
      await createCommunityNotification(tx, {
        recipientId: comment.authorId,
        type: 'ACCEPTED_ANSWER',
        dedupeKey: `accepted:${postId}:${comment.id}`,
        title: 'Your answer was accepted',
        actorId: auth.session.profile!.id,
        targetType: 'POST',
        targetId: postId,
      });
    }
  });
  return NextResponse.json({ acceptedCommentId: parsed.data.commentId });
}
