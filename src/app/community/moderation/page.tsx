import { redirect } from 'next/navigation';
import { CommunityModerationQueue } from './queue-client';
import { getCommunitySession } from '@/lib/community/access';

export const metadata = { title: 'Community moderation · WildTrack360' };

export default async function CommunityModerationPage() {
  const session = await getCommunitySession();
  if (!session?.profile || !session.hasAcceptedGuidelines) redirect('/community');
  if (!session.profile.isModerator && !session.isPlatformAdmin) redirect('/community');
  return <CommunityModerationQueue />;
}
