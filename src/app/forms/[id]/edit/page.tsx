import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/clerk-server';
import { getUserRole, hasPermission } from '@/lib/rbac';
import { isFeatureEnabled } from '@/lib/features';
import { CustomFormBuilder } from '@/components/forms/custom-form-builder';

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/');
  if (!(await isFeatureEnabled(orgId, 'CUSTOM_FORMS'))) notFound();

  const role = await getUserRole(userId, orgId);
  if (!hasPermission(role, 'form:manage')) redirect('/forms');

  return (
    <Suspense>
      <CustomFormBuilder formId={id} />
    </Suspense>
  );
}
