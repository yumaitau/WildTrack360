import { redirect } from 'next/navigation';
import { getCommunitySession } from '@/lib/community/access';
import { communityAuthorDto, communityAuthorSelect } from '@/lib/community/dto';
import { prisma } from '@/lib/prisma';
import { CommunityMembersDirectory } from './members-directory';

export const metadata = { title: 'Members · Community (Beta) · WildTrack360' };

export default async function CommunityMembersPage() {
  const session = await getCommunitySession();
  if (!session?.access.canRead) redirect('/dashboard');
  if (!session.profile || !session.hasAcceptedGuidelines) redirect('/community/onboarding');

  // Seed the directory with active members (moderators first) so the page is
  // populated before any search; client search refines via /api/community/members.
  const rows = await prisma.communityProfile.findMany({
    where: { status: 'ACTIVE' },
    orderBy: [{ isModerator: 'desc' }, { displayName: 'asc' }, { id: 'asc' }],
    take: 60,
    select: communityAuthorSelect,
  });

  return <CommunityMembersDirectory initial={rows.map(communityAuthorDto)} />;
}
