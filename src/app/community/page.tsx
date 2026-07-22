import { redirect } from 'next/navigation';
import { CommunityBoard } from '@/components/community/community-board';
import { CommunitySearch } from '@/components/community/community-search';
import { getCommunitySession } from '@/lib/community/access';
import { getCommunityChatRooms, getCommunityFeed } from '@/lib/community/feed';

export const metadata = { title: 'Community (Beta) · WildTrack360' };

export default async function CommunityPage() {
  const session = await getCommunitySession();
  if (!session?.access.canRead) redirect('/dashboard');
  if (!session.profile || !session.hasAcceptedGuidelines) redirect('/community/onboarding');

  const [feed, rooms] = await Promise.all([
    getCommunityFeed(session.profile.id, { view: 'latest' }),
    getCommunityChatRooms(),
  ]);

  return (
    <>
      <CommunitySearch />
      <CommunityBoard initialFeed={feed} initialRooms={rooms} />
    </>
  );
}
