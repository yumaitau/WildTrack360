import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getUserRole, hasPermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { applySubmission } from '@/lib/forms/custom-form-service';
import { route } from '@/lib/openapi/route';
import { batchCreateCustomFormSubmissionsContract } from '../../openapi';

// Offline sync endpoint: mobile clients queue submissions locally and replay
// them here. Records are processed sequentially in input order so per-record
// results line up, and each must carry a clientSubmissionId for idempotency.
export const POST = route(batchCreateCustomFormSubmissionsContract, async ({ body }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gated = await gateFeature(orgId, 'CUSTOM_FORMS');
  if (gated) return gated;

  const role = await getUserRole(userId, orgId);
  if (!hasPermission(role, 'form:submit')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const results = [];
  let createdCount = 0;
  for (const submission of body.submissions) {
    const result = await applySubmission({
      input: submission,
      orgId,
      userId,
      requireClientSubmissionId: true,
    });
    if (result.status === 'CREATED') createdCount += 1;
    results.push(result);
  }

  if (createdCount > 0) {
    logAudit({
      userId,
      orgId,
      action: 'SUBMIT',
      entity: 'CustomFormSubmission',
      metadata: { batch: true, created: createdCount, total: body.submissions.length },
    });
  }

  return { data: { results } };
});
