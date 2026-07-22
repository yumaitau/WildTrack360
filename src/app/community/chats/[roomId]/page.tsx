import { redirect } from 'next/navigation';
import { CommunityChatRoom } from './room-client';
import { getCommunitySession } from '@/lib/community/access';

export const metadata = { title: 'Community chat · WildTrack360' };

export default async function CommunityChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const session = await getCommunitySession();
  if (!session?.access.canRead) redirect('/dashboard');
  if (!session.profile || !session.hasAcceptedGuidelines) redirect('/community/onboarding');
  const { roomId } = await params;
  return <CommunityChatRoom roomId={roomId} canWrite={session.access.canWrite} />;
}
