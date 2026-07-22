import { redirect } from 'next/navigation';
import { CommunityNotificationSettings } from './settings-client';
import { getCommunitySession } from '@/lib/community/access';

export const metadata = { title: 'Community notifications · WildTrack360' };

export default async function CommunityNotificationSettingsPage() {
  const session = await getCommunitySession();
  if (!session?.access.canRead) redirect('/dashboard');
  if (!session.profile || !session.hasAcceptedGuidelines) redirect('/community/onboarding');
  return <CommunityNotificationSettings canWrite={session.access.canWrite} />;
}
