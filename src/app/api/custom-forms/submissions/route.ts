import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getUserRole, hasPermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { applySubmission, listSubmissions } from '@/lib/forms/custom-form-service';
import { route } from '@/lib/openapi/route';
import {
  createCustomFormSubmissionContract,
  listCustomFormSubmissionsContract,
} from '../openapi';

export const GET = route(listCustomFormSubmissionsContract, async ({ query }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gated = await gateFeature(orgId, 'CUSTOM_FORMS');
  if (gated) return gated;

  const role = await getUserRole(userId, orgId);
  const canViewAll = hasPermission(role, 'form:view_submissions');
  if (!canViewAll && !hasPermission(role, 'form:submit')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const from = query.from ? new Date(query.from) : undefined;
  const to = query.to ? new Date(query.to) : undefined;
  const limit = query.limit ? Number(query.limit) : undefined;

  const submissions = await listSubmissions(orgId, {
    formId: query.formId,
    from: from && !Number.isNaN(from.valueOf()) ? from : undefined,
    to: to && !Number.isNaN(to.valueOf()) ? to : undefined,
    limit: limit && Number.isFinite(limit) ? limit : undefined,
    // Carers only see their own submissions.
    submittedByUserId: canViewAll ? undefined : userId,
  });
  return { data: { submissions } };
});

export const POST = route(createCustomFormSubmissionContract, async ({ body }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gated = await gateFeature(orgId, 'CUSTOM_FORMS');
  if (gated) return gated;

  const role = await getUserRole(userId, orgId);
  if (!hasPermission(role, 'form:submit')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await applySubmission({ input: body, orgId, userId });

  if (result.status === 'REJECTED') {
    const status = result.errorCode === 'FORM_NOT_FOUND' ? 404 : 400;
    return NextResponse.json(result, { status });
  }

  if (result.status === 'CREATED') {
    logAudit({
      userId,
      orgId,
      action: 'SUBMIT',
      entity: 'CustomFormSubmission',
      entityId: result.submissionId ?? undefined,
    });
  }

  return { data: result, status: result.status === 'CREATED' ? 201 : 200 };
});
