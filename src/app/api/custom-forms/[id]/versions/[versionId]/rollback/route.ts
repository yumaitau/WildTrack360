import { NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit';
import { rollbackToVersion } from '@/lib/forms/custom-form-service';
import { route } from '@/lib/openapi/route';
import { rollbackCustomFormVersionContract } from '../../../../openapi';
import { requireFormAccess } from '../../../../access';

export const POST = route(rollbackCustomFormVersionContract, async ({ params }) => {
  const access = await requireFormAccess('form:manage');
  if ('response' in access) return access.response;

  const result = await rollbackToVersion(access.orgId, access.userId, params.id, params.versionId);
  if (!result) return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  if (!result.form) {
    if (result.conflict) return NextResponse.json({ error: result.conflict }, { status: 409 });
    return NextResponse.json(
      { error: 'Validation failed', issues: result.issues },
      { status: 400 }
    );
  }

  logAudit({
    userId: access.userId,
    orgId: access.orgId,
    action: 'UPDATE',
    entity: 'CustomForm',
    entityId: params.id,
    metadata: { rollbackToVersionId: params.versionId, newVersion: result.form.currentVersion },
  });
  return { data: result.form };
});
