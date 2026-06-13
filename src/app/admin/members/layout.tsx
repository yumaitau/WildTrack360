import { auth } from '@/lib/clerk-server';
import { redirect } from 'next/navigation';
import { isFeatureEnabled } from '@/lib/features';

export default async function MembersAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');
  if (!(await isFeatureEnabled(orgId, 'MEMBERSHIP_PLATFORM'))) redirect('/admin');
  return <>{children}</>;
}
