import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/rbac';
import { MembersAdmin } from './members-admin';

export default async function MembersAdminPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');

  try {
    await requirePermission(userId, orgId, 'member:view_all');
  } catch {
    redirect('/');
  }

  return <MembersAdmin />;
}
