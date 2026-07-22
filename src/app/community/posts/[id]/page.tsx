import { redirect } from 'next/navigation';
import { CommunityPostDetail } from './post-detail';
import { getCommunitySession } from '@/lib/community/access';

export const metadata = { title: 'Community conversation · WildTrack360' };

export default async function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCommunitySession();
  if (!session?.access.canRead) redirect('/dashboard');
  if (!session.profile || !session.hasAcceptedGuidelines) redirect('/community/onboarding');
  const { id } = await params;
  return <CommunityPostDetail postId={id} canWrite={session.access.canWrite} />;
}
