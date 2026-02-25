import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { requireMinimumRole } from '@/lib/rbac';

export default async function ComplianceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');

  try {
    await requireMinimumRole(userId, orgId, 'COORDINATOR');
  } catch {
    redirect('/');
  }

  return <>{children}</>;
}
