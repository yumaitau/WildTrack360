import { redirect } from 'next/navigation';
import { CommunityMemberProfile } from './member-client';
import { getCommunitySession } from '@/lib/community/access';

export const metadata = { title: 'Community member · WildTrack360' };

export default async function CommunityMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCommunitySession();
  if (!session?.access.canRead) redirect('/dashboard');
  if (!session.profile || !session.hasAcceptedGuidelines) redirect('/community/onboarding');
  const { id } = await params;
  return <CommunityMemberProfile memberId={id} />;
}
