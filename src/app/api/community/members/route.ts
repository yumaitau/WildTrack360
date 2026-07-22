import { NextRequest, NextResponse } from 'next/server';
import { requireCommunitySession } from '@/lib/community/api';
import { getBlockRelatedProfileIds } from '@/lib/community/blocks';
import { communityAuthorDto, communityAuthorSelect } from '@/lib/community/dto';
import { prisma } from '@/lib/prisma';

// Typeahead for @mentions. Community is cross-org, so members are searchable
// across organisations; only ACTIVE profiles are offered (MUTED/BANNED/LEFT
// can't be mentioned) and the caller is excluded (no self-mention).
export async function GET(request: NextRequest) {
  const auth = await requireCommunitySession({ profile: true });
  if ('error' in auth) return auth.error;

  const q = (request.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length === 0) return NextResponse.json({ members: [] });

  // Exclude the caller and anyone either party has blocked (either direction) so
  // a block hides the member from mention typeahead too.
  const related = await getBlockRelatedProfileIds(auth.session.profile!.id);
  const rows = await prisma.communityProfile.findMany({
    where: {
      status: 'ACTIVE',
      id: { notIn: [auth.session.profile!.id, ...related] },
      displayName: { contains: q, mode: 'insensitive' },
    },
    orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
    take: 8,
    select: communityAuthorSelect,
  });

  return NextResponse.json({ members: rows.map(communityAuthorDto) });
}
