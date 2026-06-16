import { auth } from '@/lib/clerk-server';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/rbac';
import { SquareSettingsAdmin } from './square-settings-admin';

export default async function SquareSettingsPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');

  try {
    await requirePermission(userId, orgId, 'settings:manage');
  } catch {
    redirect('/');
  }

  return <SquareSettingsAdmin />;
}
