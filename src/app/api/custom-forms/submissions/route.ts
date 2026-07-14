import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';
import { applySubmission, listSubmissions } from '@/lib/forms/custom-form-service';
import { route } from '@/lib/openapi/route';
import { createCustomFormSubmissionContract, listCustomFormSubmissionsContract } from '../openapi';
import { requireFormAccess } from '../access';

export const GET = route(listCustomFormSubmissionsContract, async ({ query }) => {
  const access = await requireFormAccess('form:submit');
  if ('response' in access) return access.response;

  const canViewAll = hasPermission(access.role, 'form:view_submissions');

  const from = query.from ? new Date(query.from) : undefined;
  const to = query.to ? new Date(query.to) : undefined;
  const limit = query.limit ? Number(query.limit) : undefined;

  const submissions = await listSubmissions(access.orgId, {
    formId: query.formId,
    from: from && !Number.isNaN(from.valueOf()) ? from : undefined,
    to: to && !Number.isNaN(to.valueOf()) ? to : undefined,
    limit: limit && Number.isFinite(limit) ? limit : undefined,
    // Carers only see their own submissions.
    submittedByUserId: canViewAll ? undefined : access.userId,
  });
  return { data: { submissions } };
});

export const POST = route(createCustomFormSubmissionContract, async ({ body }) => {
  const access = await requireFormAccess('form:submit');
  if ('response' in access) return access.response;

  const result = await applySubmission({
    input: body,
    orgId: access.orgId,
    userId: access.userId,
  });

  if (result.status === 'REJECTED') {
    const status = result.errorCode === 'FORM_NOT_FOUND' ? 404 : 400;
    return NextResponse.json(result, { status });
  }

  if (result.status === 'CREATED') {
    logAudit({
      userId: access.userId,
      orgId: access.orgId,
      action: 'SUBMIT',
      entity: 'CustomFormSubmission',
      entityId: result.submissionId ?? undefined,
    });
  }

  return { data: result, status: result.status === 'CREATED' ? 201 : 200 };
});
