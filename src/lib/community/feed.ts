import 'server-only';

import type { Prisma } from '@prisma/client';
import { communityAuthorDto, communityAuthorSelect } from './dto';
import { getBlockedProfileIds } from './blocks';
import { prisma } from '@/lib/prisma';

export async function getCommunityFeed(
  profileId: string,
  opts: {
    view?: string;
    category?: string | null;
    cursor?: string | null;
    sort?: string;
  }
) {
  const view = opts.view ?? 'latest';
  const category = opts.category ?? null;
  const cursor = opts.cursor ?? null;
  // "new" orders by creation; default "active" bubbles up whatever was last
  // replied to. Both keep pinned posts first and use id as the cursor tiebreaker.
  const orderBy: Prisma.CommunityPostOrderByWithRelationInput[] =
    opts.sort === 'new'
      ? [{ isPinned: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
      : [{ isPinned: 'desc' }, { lastActivityAt: 'desc' }, { id: 'desc' }];

  const where: Prisma.CommunityPostWhereInput = { status: 'PUBLISHED' };
  if (category) where.category = { slug: category };
  if (view === 'questions') where.type = 'QUESTION';
  if (view === 'unanswered') {
    where.type = 'QUESTION';
    where.acceptedCommentId = null;
  }
  if (view === 'following') {
    where.follows = { some: { profileId } };
  }
  if (view === 'saved') {
    where.bookmarks = { some: { profileId } };
  }
  // "Mine" shows the author their own contributions across the moderation
  // lifecycle so a post held for review is never invisible to its author.
  if (view === 'mine') {
    where.status = { in: ['DRAFT', 'PENDING', 'PUBLISHED', 'HELD', 'REMOVED'] };
    where.authorId = profileId;
  } else if (view === 'drafts') {
    // Author-only staging list: their unsubmitted drafts.
    where.status = 'DRAFT';
    where.authorId = profileId;
  } else {
    // Hide blocked members' posts everywhere except the viewer's own "mine".
    const blockedIds = await getBlockedProfileIds(profileId);
    if (blockedIds.length) where.authorId = { notIn: blockedIds };
  }

  const [rows, categories] = await Promise.all([
    prisma.communityPost.findMany({
      where,
      orderBy,
      take: 21,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        author: { select: communityAuthorSelect },
        category: { select: { id: true, slug: true, name: true } },
        reactions: { select: { type: true, profileId: true } },
        follows: {
          where: { profileId },
          select: { id: true },
        },
        bookmarks: {
          where: { profileId },
          select: { id: true },
        },
        _count: { select: { comments: { where: { status: 'PUBLISHED' } }, reactions: true } },
      },
    }),
    prisma.communityCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, slug: true, name: true, description: true },
    }),
  ]);

  const hasMore = rows.length > 20;
  const items = rows.slice(0, 20).map((post) => ({
    id: post.id,
    type: post.type,
    // Held/pending posts keep their content in the draft columns until
    // approved, so fall back to the draft for the author's own "mine" view.
    title: post.title ?? post.draftTitle,
    body: post.body ?? post.draftBody,
    status: post.status,
    author: communityAuthorDto(post.author),
    category: post.category,
    isPinned: post.isPinned,
    isFollowing: post.follows.length > 0,
    isBookmarked: post.bookmarks.length > 0,
    acceptedCommentId: post.acceptedCommentId,
    commentCount: post._count.comments,
    reactionCount: post._count.reactions,
    reactions: Object.entries(
      post.reactions.reduce<Record<string, number>>((counts, reaction) => {
        counts[reaction.type] = (counts[reaction.type] ?? 0) + 1;
        return counts;
      }, {})
    ).map(([type, count]) => ({
      type,
      count,
      reacted: post.reactions.some(
        (reaction) => reaction.type === type && reaction.profileId === profileId
      ),
    })),
    createdAt: post.createdAt.toISOString(),
    lastActivityAt: post.lastActivityAt.toISOString(),
  }));

  return {
    items,
    categories,
    nextCursor: hasMore ? rows[19].id : null,
  };
}

export async function getCommunityChatRooms() {
  const rooms = await prisma.communityChatRoom.findMany({
    where: { isArchived: false },
    orderBy: [{ isPinned: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      isPinned: true,
      isReadOnly: true,
      slowModeSeconds: true,
      _count: { select: { messages: { where: { status: 'PUBLISHED' } } } },
    },
  });
  return rooms.map((room) => ({
    ...room,
    messageCount: room._count.messages,
    _count: undefined,
  }));
}
