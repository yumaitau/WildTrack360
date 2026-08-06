import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getOrgRoster } from '@/lib/org-directory';
import { requirePermission, isForbiddenError } from '@/lib/rbac';
import { route } from '@/lib/openapi/route';
import { listMembersContract } from '../openapi';

// Server-side membership roster (issue #56): people-management reads members
// through this endpoint instead of Clerk's client-side organization object,
// so the roster source (Clerk vs DB) is decided by ORG_SOURCE in one place.
export const GET = route(listMembersContract, async () => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await requirePermission(userId, orgId, 'user:manage');

    const roster = await getOrgRoster(orgId);
    return {
      data: roster
        .filter((member) => !member.pending)
        .map((member) => ({
          userId: member.userId,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          imageUrl: member.imageUrl,
          joinedAt: member.joinedAt ? member.joinedAt.toISOString() : null,
        })),
    };
  } catch (error) {
    if (isForbiddenError(error)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error listing organisation members:', error);
    return NextResponse.json({ error: 'Failed to list members' }, { status: 500 });
  }
});
