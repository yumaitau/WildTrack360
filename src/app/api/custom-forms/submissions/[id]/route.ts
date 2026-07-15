import { NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit';
import { deleteSubmission } from '@/lib/forms/custom-form-service';
import { hasPermission } from '@/lib/rbac';
import { route } from '@/lib/openapi/route';
import { deleteCustomFormSubmissionContract } from '../../openapi';
import { requireFormAccess } from '../../access';

export const DELETE = route(deleteCustomFormSubmissionContract, async ({ params }) => {
  const access = await requireFormAccess('form:submit');
  if ('response' in access) return access.response;

  const canDeleteAny = hasPermission(access.role, 'form:view_submissions');
  const deleted = await deleteSubmission(access.orgId, params.id, {
    submittedByUserId: canDeleteAny ? undefined : access.userId,
  });
  if (!deleted) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  logAudit({
    userId: access.userId,
    orgId: access.orgId,
    action: 'DELETE',
    entity: 'CustomFormSubmission',
    entityId: deleted.id,
    metadata: { formId: deleted.formId, photoCount: deleted.photoCount },
  });
  return { data: { success: true } };
});
