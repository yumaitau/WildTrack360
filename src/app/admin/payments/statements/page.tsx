import { auth } from '@/lib/clerk-server';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/rbac';
import { isFeatureEnabled } from '@/lib/features';
import { StatementsAdmin } from './statements-admin';

export default async function StatementsAdminPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');

  if (!(await isFeatureEnabled(orgId, 'MEMBERSHIP_PLATFORM'))) redirect('/admin');

  try {
    await requirePermission(userId, orgId, 'donation:view');
  } catch {
    redirect('/');
  }

  return <StatementsAdmin />;
}
