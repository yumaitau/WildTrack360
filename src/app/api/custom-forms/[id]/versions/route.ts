import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getUserRole, hasPermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { getForm, listVersions } from '@/lib/forms/custom-form-service';
import { route } from '@/lib/openapi/route';
import { listCustomFormVersionsContract } from '../../openapi';

export const GET = route(listCustomFormVersionsContract, async ({ params }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gated = await gateFeature(orgId, 'CUSTOM_FORMS');
  if (gated) return gated;

  const role = await getUserRole(userId, orgId);
  if (!hasPermission(role, 'form:manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const form = await getForm(orgId, params.id);
  if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

  const versions = await listVersions(orgId, params.id);
  return { data: { versions } };
});
