import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getOrgMember, getUserRole } from '@/lib/rbac';
import { route } from '@/lib/openapi/route';
import { getMyRoleContract } from '../openapi';

export const GET = route(getMyRoleContract, async () => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const member = await getOrgMember(userId, orgId);
    const role = await getUserRole(userId, orgId);
    return { data: { userId, orgId, role, orgMember: member } };
  } catch (error) {
    console.error('Error fetching user role:', error);
    return NextResponse.json({ error: 'Failed to fetch role' }, { status: 500 });
  }
});
