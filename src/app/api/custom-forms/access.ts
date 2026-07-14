import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { gateFeature } from '@/lib/features';
import { getUserRole, hasPermission, type Permission } from '@/lib/rbac';
import type { OrgRole } from '@prisma/client';

type FormAccess = { response: Response } | { userId: string; orgId: string; role: OrgRole };

export async function requireFormAccess(permission: Permission): Promise<FormAccess> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const gated = await gateFeature(orgId, 'CUSTOM_FORMS');
  if (gated) return { response: gated };

  const role = await getUserRole(userId, orgId);
  if (!hasPermission(role, permission)) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { userId, orgId, role };
}
