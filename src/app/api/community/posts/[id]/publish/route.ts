import { NextResponse } from 'next/server';
import { requireCommunitySession } from '@/lib/community/api';
import {
  readStoredMentions,
  resolveCommunityMentions,
  notifyCommunityMentions,
} from '@/lib/community/mentions';
import {
  enqueueCommunityModeration,
  processCommunityModerationJob,
} from '@/lib/community/moderation/jobs';
import { takeCommunityRateLimit } from '@/lib/community/rate-limit';
import { prisma } from '@/lib/prisma';

// Publish an author-only draft: move DRAFT → PENDING and run it through the same
// pre-publication moderation as a fresh submit. Owner-only; a non-owner gets 404
// (a draft is invisible to them, so its existence must not leak).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCommunitySession({ write: true, profile: true });
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const post = await prisma.communityPost.findUnique({ where: { id } });
  if (!post || post.authorId !== auth.session.profile!.id) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }
  if (post.status !== 'DRAFT') {
    return NextResponse.json({ error: 'Only drafts can be published' }, { status: 400 });
  }

  const rate = await takeCommunityRateLimit(auth.session.profile!.id, 'post');
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Post limit reached. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
    );
  }

  const mentions = await resolveCommunityMentions(prisma, {
    body: post.draftBody,
    submitted: readStoredMentions(post.mentions),
    authorProfileId: auth.session.profile!.id,
  });

  const job = await prisma.$transaction(async (tx) => {
    await tx.communityPost.update({
      where: { id },
      data: { status: 'PENDING', mentions },
    });
    return enqueueCommunityModeration(tx, {
      targetType: 'POST',
      targetId: id,
      title: post.draftTitle,
      body: post.draftBody,
    });
  });
  const moderation = await processCommunityModerationJob(job.id);

  if (moderation.recommendation === 'PUBLISH' && mentions.length) {
    await prisma.$transaction((tx) =>
      notifyCommunityMentions(tx, {
        mentions,
        actorId: auth.session.profile!.id,
        actorName: auth.session.profile!.displayName,
        contentId: id,
        targetType: 'POST',
        targetId: id,
      })
    );
  }
  return NextResponse.json({ id, moderation: moderation.recommendation });
}
