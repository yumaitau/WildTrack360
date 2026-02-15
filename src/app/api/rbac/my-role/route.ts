import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getOrgMember, getUserRole } from '@/lib/rbac';

// GET /api/rbac/my-role — get the current user's role and species assignments
export async function GET() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const member = await getOrgMember(userId, orgId);
    const role = await getUserRole(userId, orgId);

    return NextResponse.json({
      userId,
      orgId,
      role,
      orgMember: member,
    });
  } catch (error) {
    console.error('Error fetching user role:', error);
    return NextResponse.json({ error: 'Failed to fetch role' }, { status: 500 });
  }
}
