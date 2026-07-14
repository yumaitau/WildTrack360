import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/clerk-server';
import { getUserRole, hasPermission } from '@/lib/rbac';
import { isFeatureEnabled } from '@/lib/features';
import { FormsListClient } from './forms-list-client';

export default async function FormsPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/');
  if (!(await isFeatureEnabled(orgId, 'CUSTOM_FORMS'))) notFound();

  const role = await getUserRole(userId, orgId);

  return (
    <Suspense>
      <FormsListClient
        canManage={hasPermission(role, 'form:manage')}
        canViewSubmissions={hasPermission(role, 'form:view_submissions')}
      />
    </Suspense>
  );
}
