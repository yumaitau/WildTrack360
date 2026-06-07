import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { isFeatureEnabled } from '@/lib/features';

export default async function PaymentsAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');
  if (!(await isFeatureEnabled(orgId, 'MEMBERSHIP_PLATFORM'))) redirect('/admin');
  return <>{children}</>;
}
