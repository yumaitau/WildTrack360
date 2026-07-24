import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getOrgSeatUsage } from '@/lib/org-seat';
import { isForbiddenError, requirePermission } from '@/lib/rbac';
import { route } from '@/lib/openapi/route';
import { getOrgSeatContract } from '../openapi';

export const GET = route(getOrgSeatContract, async () => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await requirePermission(userId, orgId, 'user:manage');
    return { data: await getOrgSeatUsage(orgId) };
  } catch (error) {
    if (isForbiddenError(error)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error reading organisation seat allocation:', error);
    return NextResponse.json({ error: 'Failed to read seat allocation' }, { status: 500 });
  }
});
