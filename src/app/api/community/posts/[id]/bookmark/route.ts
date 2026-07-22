import { NextResponse } from 'next/server';
import { requireCommunitySession } from '@/lib/community/api';
import { prisma } from '@/lib/prisma';

export async function PUT(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCommunitySession({ write: true, profile: true });
  if ('error' in auth) return auth.error;
  const { id: postId } = await params;
  const post = await prisma.communityPost.findFirst({
    where: { id: postId, status: 'PUBLISHED' },
  });
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  await prisma.communityBookmark.upsert({
    where: { profileId_postId: { profileId: auth.session.profile!.id, postId } },
    create: { profileId: auth.session.profile!.id, postId },
    update: {},
  });
  return NextResponse.json({ bookmarked: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCommunitySession({ write: true, profile: true });
  if ('error' in auth) return auth.error;
  const { id: postId } = await params;
  await prisma.communityBookmark.deleteMany({
    where: { profileId: auth.session.profile!.id, postId },
  });
  return NextResponse.json({ bookmarked: false });
}
