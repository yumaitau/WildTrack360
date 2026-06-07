import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/rbac';
import { StripeSettingsAdmin } from './stripe-settings-admin';

export default async function StripeSettingsPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');

  try {
    await requirePermission(userId, orgId, 'settings:manage');
  } catch {
    redirect('/');
  }

  return <StripeSettingsAdmin />;
}
