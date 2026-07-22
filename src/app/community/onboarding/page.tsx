import { redirect } from 'next/navigation';
import { CommunityOnboarding } from './community-onboarding';
import { getCommunitySession } from '@/lib/community/access';
import { resolveOrganisationName } from '@/lib/community/org-name';
import { currentUser } from '@/lib/clerk-server';

export const metadata = { title: 'Join Community · WildTrack360' };

export default async function CommunityOnboardingPage() {
  const session = await getCommunitySession();
  if (!session?.access.canRead) redirect('/');
  if (!session.access.canWrite) redirect('/community');
  if (session.profile && session.hasAcceptedGuidelines) redirect('/community');

  const clerkUser = await currentUser();
  const defaultName =
    session.profile?.displayName ??
    ([clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ').trim() ||
      clerkUser?.username ||
      '');
  const organisationName = session.homeOrgId
    ? ((await resolveOrganisationName(session.homeOrgId)) ?? 'your organisation')
    : 'your organisation';

  return (
    <CommunityOnboarding
      defaultDisplayName={defaultName}
      defaultShowOrganisationBadge={session.profile?.showOrganisationBadge ?? false}
      defaultRegion={session.profile?.region ?? ''}
      organisationName={organisationName}
    />
  );
}
