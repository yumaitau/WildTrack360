import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/rbac';
import { canUseCustomReports } from '@/lib/ql/access';
import { CustomQueryWorkbench } from '@/components/ql/custom-query-workbench';

// Custom reports are organisation-wide aggregates, limited to ADMIN and
// COORDINATOR_ALL (the roles with org-wide visibility).
export default async function CustomReportsPage() {
  const { userId, orgId } = await auth();

  if (!userId) redirect('/landing');
  if (!orgId) redirect('/');

  const role = await getUserRole(userId, orgId);
  if (!canUseCustomReports(role)) {
    redirect('/unauthorized');
  }

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <CustomQueryWorkbench />
    </main>
  );
}
