import { NextRequest, NextResponse } from 'next/server';
import { requireCommunitySession } from '@/lib/community/api';
import { searchCommunityPosts } from '@/lib/community/search';

export async function GET(request: NextRequest) {
  const auth = await requireCommunitySession();
  if ('error' in auth) return auth.error;

  const q = request.nextUrl.searchParams.get('q') ?? '';
  const cursor = request.nextUrl.searchParams.get('cursor');

  const { results, nextCursor } = await searchCommunityPosts({
    q,
    cursor,
    viewerProfileId: auth.session.profile?.id ?? null,
  });
  return NextResponse.json({ results, nextCursor });
}
