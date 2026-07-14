import { logAudit } from '@/lib/audit';
import { applySubmission } from '@/lib/forms/custom-form-service';
import { route } from '@/lib/openapi/route';
import { batchCreateCustomFormSubmissionsContract } from '../../openapi';
import { requireFormAccess } from '../../access';

// Offline sync endpoint: mobile clients queue submissions locally and replay
// them here. Records are processed sequentially in input order so per-record
// results line up, and each must carry a clientSubmissionId for idempotency.
export const POST = route(batchCreateCustomFormSubmissionsContract, async ({ body }) => {
  const access = await requireFormAccess('form:submit');
  if ('response' in access) return access.response;

  const results = [];
  let createdCount = 0;
  for (const submission of body.submissions) {
    const result = await applySubmission({
      input: submission,
      orgId: access.orgId,
      userId: access.userId,
      requireClientSubmissionId: true,
    });
    if (result.status === 'CREATED') createdCount += 1;
    results.push(result);
  }

  if (createdCount > 0) {
    logAudit({
      userId: access.userId,
      orgId: access.orgId,
      action: 'SUBMIT',
      entity: 'CustomFormSubmission',
      metadata: { batch: true, created: createdCount, total: body.submissions.length },
    });
  }

  return { data: { results } };
});
