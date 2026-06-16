import { auth } from '@/lib/clerk-server';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/rbac';
import { PaymentsAdmin } from './payments-admin';

export default async function PaymentsAdminPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');

  try {
    await requirePermission(userId, orgId, 'donation:view');
  } catch {
    redirect('/');
  }

  return <PaymentsAdmin />;
}
