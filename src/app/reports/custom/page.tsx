import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserRole, hasPermission } from '@/lib/rbac';
import { CustomQueryWorkbench } from '@/components/ql/custom-query-workbench';

// Custom reports are organisation-wide aggregates, gated on report:view_org.
export default async function CustomReportsPage() {
  const { userId, orgId } = await auth();

  if (!userId) redirect('/landing');
  if (!orgId) redirect('/');

  const role = await getUserRole(userId, orgId);
  if (!hasPermission(role, 'report:view_org')) {
    redirect('/unauthorized');
  }

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <CustomQueryWorkbench />
    </main>
  );
}
