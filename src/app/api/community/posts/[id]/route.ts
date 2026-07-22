import { NextRequest, NextResponse } from 'next/server';
import { readJson, requireCommunitySession, validationError } from '@/lib/community/api';
import { getBlockedProfileIds } from '@/lib/community/blocks';
import { communityAuthorDto, communityAuthorSelect } from '@/lib/community/dto';
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
import { communityPostUpdateSchema } from '@/lib/community/validation';
import { prisma } from '@/lib/prisma';

function reactionSummary(
  reactions: { type: string; profileId: string }[],
  viewerProfileId: string
) {
  return Object.entries(
    reactions.reduce<Record<string, number>>((counts, reaction) => {
      counts[reaction.type] = (counts[reaction.type] ?? 0) + 1;
      return counts;
    }, {})
  ).map(([type, count]) => ({
    type,
    count,
    reacted: reactions.some(
      (reaction) => reaction.type === type && reaction.profileId === viewerProfileId
    ),
  }));
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCommunitySession({ profile: true });
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const viewerId = auth.session.profile!.id;
  const blockedIds = await getBlockedProfileIds(viewerId);
  const post = await prisma.communityPost.findFirst({
    where: {
      id,
      // A blocked author's post is hidden from the viewer (404).
      ...(blockedIds.length ? { authorId: { notIn: blockedIds } } : {}),
      OR: [
        { status: 'PUBLISHED' },
        { authorId: viewerId, status: { in: ['DRAFT', 'PENDING', 'HELD', 'REMOVED'] } },
      ],
    },
    include: {
      author: { select: communityAuthorSelect },
      category: { select: { id: true, slug: true, name: true } },
      reactions: { select: { type: true, profileId: true } },
      follows: { where: { profileId: viewerId }, select: { id: true } },
      bookmarks: { where: { profileId: viewerId }, select: { id: true } },
      comments: {
        where: {
          ...(blockedIds.length ? { authorId: { notIn: blockedIds } } : {}),
          OR: [
            { status: 'PUBLISHED' },
            { authorId: viewerId, status: { in: ['PENDING', 'HELD'] } },
          ],
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: {
          author: { select: communityAuthorSelect },
          reactions: { select: { type: true, profileId: true } },
        },
      },
    },
  });
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  return NextResponse.json({
    id: post.id,
    type: post.type,
    title: post.title ?? post.draftTitle,
    body: post.body ?? post.draftBody,
    status: post.status,
    isOwner: post.authorId === auth.session.profile!.id,
    isModerator: auth.session.profile!.isModerator,
    isPinned: post.isPinned,
    isLocked: post.isLocked,
    author: communityAuthorDto(post.author),
    category: post.category,
    isFollowing: post.follows.length > 0,
    isBookmarked: post.bookmarks.length > 0,
    acceptedCommentId: post.acceptedCommentId,
    mentions: readStoredMentions(post.mentions),
    createdAt: post.createdAt.toISOString(),
    comments: post.comments.map((comment) => ({
      id: comment.id,
      parentId: comment.parentId,
      body: comment.body ?? comment.draftBody,
      status: comment.status,
      isOwner: comment.authorId === auth.session.profile!.id,
      author: communityAuthorDto(comment.author),
      mentions: readStoredMentions(comment.mentions),
      reactions: reactionSummary(comment.reactions, auth.session.profile!.id),
      createdAt: comment.createdAt.toISOString(),
    })),
    reactions: reactionSummary(post.reactions, auth.session.profile!.id),
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCommunitySession({ write: true, profile: true });
  if ('error' in auth) return auth.error;
  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = communityPostUpdateSchema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);
  const { id } = await params;
  const post = await prisma.communityPost.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  // REMOVED and DELETED are terminal. Editing must not silently re-moderate and
  // republish content a moderator took down (or the author deleted) — that path
  // would let an AI PUBLISH verdict overturn a human REMOVE. Appeals are the
  // route back from REMOVED.
  if (post.status === 'REMOVED' || post.status === 'DELETED') {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }
  // A DRAFT is author-only staging. Editing it saves the draft and stays DRAFT —
  // it never moderates or publishes (that's POST /publish). Non-owners can't even
  // see it, so treat them as 404 rather than 403.
  if (post.status === 'DRAFT') {
    if (post.authorId !== auth.session.profile!.id) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    const hasContentEdit =
      parsed.data.title !== undefined ||
      parsed.data.body !== undefined ||
      parsed.data.categoryId !== undefined;
    if (!hasContentEdit) {
      return NextResponse.json({ error: 'No changes supplied' }, { status: 400 });
    }
    if (parsed.data.categoryId) {
      const category = await prisma.communityCategory.findFirst({
        where: { id: parsed.data.categoryId, isActive: true },
        select: { id: true },
      });
      if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    const nextTitle = parsed.data.title ?? post.draftTitle;
    const nextBody = parsed.data.body ?? post.draftBody;
    const mentions = await resolveCommunityMentions(prisma, {
      body: nextBody,
      submitted: parsed.data.mentions,
      authorProfileId: auth.session.profile!.id,
    });
    await prisma.communityPost.update({
      where: { id },
      data: {
        draftTitle: nextTitle,
        draftBody: nextBody,
        categoryId: parsed.data.categoryId,
        mentions,
      },
    });
    return NextResponse.json({ id, status: 'DRAFT' });
  }
  const isModerator = auth.session.profile!.isModerator;
  const isOwner = post.authorId === auth.session.profile!.id;
  if (!isOwner && !isModerator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // isPinned/isLocked are moderator-only metadata: applied without re-moderation
  // and silently ignored for non-moderators (owners editing their own post).
  const moderatorMetadata = isModerator
    ? {
        ...(parsed.data.isPinned !== undefined ? { isPinned: parsed.data.isPinned } : {}),
        ...(parsed.data.isLocked !== undefined ? { isLocked: parsed.data.isLocked } : {}),
      }
    : {};
  const hasContentEdit =
    parsed.data.title !== undefined ||
    parsed.data.body !== undefined ||
    parsed.data.categoryId !== undefined;

  // A pin/lock-only request from a moderator never re-moderates — it just writes
  // the metadata and returns.
  if (!hasContentEdit) {
    if (Object.keys(moderatorMetadata).length === 0) {
      return NextResponse.json({ error: 'No changes supplied' }, { status: 400 });
    }
    await prisma.communityPost.update({ where: { id }, data: moderatorMetadata });
    return NextResponse.json({ id, ...moderatorMetadata });
  }

  if (parsed.data.categoryId) {
    const category = await prisma.communityCategory.findFirst({
      where: { id: parsed.data.categoryId, isActive: true },
    });
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }
  const rate = await takeCommunityRateLimit(auth.session.profile!.id, 'edit');
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Edit limit reached' }, { status: 429 });
  }
  const nextTitle = parsed.data.title ?? post.draftTitle;
  const nextBody = parsed.data.body ?? post.draftBody;
  const mentions = await resolveCommunityMentions(prisma, {
    body: nextBody,
    submitted: parsed.data.mentions,
    authorProfileId: auth.session.profile!.id,
  });
  const job = await prisma.$transaction(async (tx) => {
    await tx.communityPost.update({
      where: { id },
      data: {
        draftTitle: nextTitle,
        draftBody: nextBody,
        categoryId: parsed.data.categoryId,
        // Rewrite the stored set so removed mentions clear; [] on none.
        mentions,
        ...moderatorMetadata,
        ...(post.title ? {} : { status: 'PENDING' as const }),
      },
    });
    return enqueueCommunityModeration(tx, {
      targetType: 'POST',
      targetId: id,
      title: nextTitle,
      body: nextBody,
    });
  });
  const moderation = await processCommunityModerationJob(job.id);
  // Only newly-added mentions ping — the (recipient, content) dedupe suppresses
  // anyone already notified when the post first went live.
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCommunitySession({ write: true, profile: true });
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const post = await prisma.communityPost.findUnique({ where: { id }, select: { authorId: true } });
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  const isOwner = post.authorId === auth.session.profile!.id;
  if (!isOwner && !auth.session.profile!.isModerator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Author self-delete → DELETED (content cleared). A moderator removing someone
  // else's post → REMOVED (content kept so it stays appeal-able).
  await prisma.communityPost.update({
    where: { id },
    data: isOwner
      ? { status: 'DELETED', deletedAt: new Date(), title: null, body: null }
      : { status: 'REMOVED', deletedAt: new Date() },
  });
  return new NextResponse(null, { status: 204 });
}
