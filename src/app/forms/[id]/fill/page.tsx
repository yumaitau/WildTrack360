import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/clerk-server';
import { isFeatureEnabled } from '@/lib/features';
import { CustomFormFill } from '@/components/forms/custom-form-fill';

export default async function FillFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/');
  if (!(await isFeatureEnabled(orgId, 'CUSTOM_FORMS'))) notFound();

  return (
    <Suspense>
      <CustomFormFill formId={id} />
    </Suspense>
  );
}
