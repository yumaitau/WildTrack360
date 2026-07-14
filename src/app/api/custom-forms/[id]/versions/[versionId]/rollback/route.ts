import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getUserRole, hasPermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { rollbackToVersion } from '@/lib/forms/custom-form-service';
import { route } from '@/lib/openapi/route';
import { rollbackCustomFormVersionContract } from '../../../../openapi';

export const POST = route(rollbackCustomFormVersionContract, async ({ params }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gated = await gateFeature(orgId, 'CUSTOM_FORMS');
  if (gated) return gated;

  const role = await getUserRole(userId, orgId);
  if (!hasPermission(role, 'form:manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await rollbackToVersion(orgId, userId, params.id, params.versionId);
  if (!result) return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  if (!result.form) {
    if (result.conflict) return NextResponse.json({ error: result.conflict }, { status: 409 });
    return NextResponse.json({ error: 'Validation failed', issues: result.issues }, { status: 400 });
  }

  logAudit({
    userId,
    orgId,
    action: 'UPDATE',
    entity: 'CustomForm',
    entityId: params.id,
    metadata: { rollbackToVersionId: params.versionId, newVersion: result.form.currentVersion },
  });
  return { data: result.form };
});
