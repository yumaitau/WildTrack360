import { auth } from '@/lib/clerk-server';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/rbac';
import { FieldsAdmin } from './fields-admin';

export default async function FieldsAdminPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');

  try {
    await requirePermission(userId, orgId, 'membership:configure');
  } catch {
    redirect('/admin/members');
  }

  return <FieldsAdmin />;
}
