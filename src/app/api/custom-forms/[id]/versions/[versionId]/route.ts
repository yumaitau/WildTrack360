import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getUserRole, hasPermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { getVersion } from '@/lib/forms/custom-form-service';
import { route } from '@/lib/openapi/route';
import { getCustomFormVersionContract } from '../../../openapi';

export const GET = route(getCustomFormVersionContract, async ({ params }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gated = await gateFeature(orgId, 'CUSTOM_FORMS');
  if (gated) return gated;

  const role = await getUserRole(userId, orgId);
  if (!hasPermission(role, 'form:manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const version = await getVersion(orgId, params.id, params.versionId);
  if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 });

  return { data: version };
});
