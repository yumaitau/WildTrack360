import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/rbac';

export default async function ComplianceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    redirect('/sign-in');
  }

  const role = await getUserRole(userId, orgId);

  if (role === 'CARER') {
    redirect('/');
  }

  return <>{children}</>;
}
