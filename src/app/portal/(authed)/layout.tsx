import { auth } from '@/lib/clerk-server';
import { redirect } from 'next/navigation';
import { getPortalMember } from '@/lib/portal';
import { isFeatureEnabled } from '@/lib/features';
import { PortalShell } from './portal-shell';

export default async function AuthedPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/portal/sign-in');

  const session = await getPortalMember(userId);
  if (!session) redirect('/portal/no-membership');

  // Member belongs to a wildlife org that hasn't been opted in yet → close
  // the portal door. We do this after Member resolution so the message in
  // /portal/no-membership stays accurate: "your wildlife org has not enabled
  // the portal yet" is reported instead of leaking a generic 404.
  if (!(await isFeatureEnabled(session.member.clerkOrganizationId, 'MEMBERSHIP_PLATFORM'))) {
    redirect('/portal/no-membership');
  }

  return (
    <PortalShell memberName={`${session.member.firstName} ${session.member.lastName}`}>
      {children}
    </PortalShell>
  );
}
