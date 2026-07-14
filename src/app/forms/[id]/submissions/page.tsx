import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/clerk-server';
import { getUserRole, hasPermission } from '@/lib/rbac';
import { isFeatureEnabled } from '@/lib/features';
import { CustomFormSubmissions } from '@/components/forms/custom-form-submissions';

export default async function FormSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/');
  if (!(await isFeatureEnabled(orgId, 'CUSTOM_FORMS'))) notFound();

  const role = await getUserRole(userId, orgId);

  return (
    <Suspense>
      <CustomFormSubmissions
        formId={id}
        canViewSubmissions={hasPermission(role, 'form:view_submissions')}
      />
    </Suspense>
  );
}
