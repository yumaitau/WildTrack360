import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@/lib/clerk-server';
import { getUserRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { route } from '@/lib/openapi/route';
import { deleteUserContract } from '../../openapi';

export const DELETE = route(deleteUserContract, async ({ params }) => {
  const { userId: callerUserId, orgId } = await auth();
  const { userId: targetUserId } = params;

  if (!callerUserId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (callerUserId === targetUserId) return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 });

  const role = await getUserRole(callerUserId, orgId);
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const clerk = await clerkClient();
    await prisma.$transaction([
      prisma.animal.updateMany({ where: { carerId: targetUserId }, data: { carerId: null } }),
      prisma.orgMember.deleteMany({ where: { userId: targetUserId } }),
      prisma.carerProfile.deleteMany({ where: { id: targetUserId } }),
    ]);
    await clerk.users.deleteUser(targetUserId);
    return { data: { success: true } };
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
});
