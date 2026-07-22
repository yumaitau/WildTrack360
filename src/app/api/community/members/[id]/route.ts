import { NextRequest, NextResponse } from 'next/server';
import { requireCommunitySession } from '@/lib/community/api';
import { getBlockedProfileIds } from '@/lib/community/blocks';
import { communityAuthorDto, communityAuthorSelect } from '@/lib/community/dto';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCommunitySession({ profile: true });
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const cursor = searchParams.get('cursor');

  // Community is shared across organisations, so a member profile is readable
  // cross-org. Only PUBLISHED posts are exposed — pending/held/removed drafts
  // stay private to their author. Email and userId are never selected.
  const profile = await prisma.communityProfile.findUnique({
    where: { id },
    select: communityAuthorSelect,
  });
  if (!profile) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  // If the viewer has blocked this member, keep the profile shell viewable but
  // surface none of their posts.
  const blockedIds = await getBlockedProfileIds(auth.session.profile!.id);
  if (blockedIds.includes(id)) {
    return NextResponse.json({
      member: communityAuthorDto(profile),
      items: [],
      nextCursor: null,
      blocked: true,
    });
  }

  const rows = await prisma.communityPost.findMany({
    where: { authorId: id, status: 'PUBLISHED' },
    orderBy: [{ isPinned: 'desc' }, { lastActivityAt: 'desc' }, { id: 'desc' }],
    take: 21,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      isPinned: true,
      acceptedCommentId: true,
      lastActivityAt: true,
      category: { select: { id: true, slug: true, name: true } },
      _count: {
        select: {
          comments: { where: { status: 'PUBLISHED' } },
          reactions: true,
        },
      },
    },
  });

  const hasMore = rows.length > 20;
  const items = rows.slice(0, 20).map((post) => ({
    id: post.id,
    type: post.type,
    title: post.title,
    body: post.body,
    category: post.category,
    isPinned: post.isPinned,
    acceptedCommentId: post.acceptedCommentId,
    commentCount: post._count.comments,
    reactionCount: post._count.reactions,
    lastActivityAt: post.lastActivityAt.toISOString(),
  }));

  return NextResponse.json({
    member: communityAuthorDto(profile),
    items,
    nextCursor: hasMore ? rows[19].id : null,
  });
}
