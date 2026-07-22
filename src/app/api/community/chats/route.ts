import { NextResponse } from 'next/server';
import { requireCommunitySession } from '@/lib/community/api';
import { getCommunityChatRooms } from '@/lib/community/feed';

export async function GET() {
  const auth = await requireCommunitySession({ profile: true });
  if ('error' in auth) return auth.error;
  return NextResponse.json(await getCommunityChatRooms());
}
