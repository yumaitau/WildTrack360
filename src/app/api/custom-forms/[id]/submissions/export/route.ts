import { NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit';
import { getForm, listSubmissions, serializeForm } from '@/lib/forms/custom-form-service';
import { exportSubmissionsCsv, exportSubmissionsJson } from '@/lib/forms/custom-form-exports';
import { route } from '@/lib/openapi/route';
import { exportCustomFormSubmissionsContract } from '../../../openapi';
import { requireFormAccess } from '../../../access';

export const GET = route(exportCustomFormSubmissionsContract, async ({ params, query }) => {
  const access = await requireFormAccess('form:view_submissions');
  if ('response' in access) return access.response;

  const formRow = await getForm(access.orgId, params.id);
  if (!formRow) return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  const form = serializeForm(formRow);

  const from = query.from ? new Date(query.from) : undefined;
  const to = query.to ? new Date(query.to) : undefined;
  const submissions = await listSubmissions(access.orgId, {
    formId: form.id,
    from: from && !Number.isNaN(from.valueOf()) ? from : undefined,
    to: to && !Number.isNaN(to.valueOf()) ? to : undefined,
    limit: 500,
  });

  logAudit({
    userId: access.userId,
    orgId: access.orgId,
    action: 'EXPORT',
    entity: 'CustomFormSubmission',
    metadata: { formId: form.id, count: submissions.length, format: query.format ?? 'csv' },
  });

  const filenameBase = `${form.slug}-submissions-${new Date().toISOString().slice(0, 10)}`;

  if (query.format === 'json') {
    return new NextResponse(JSON.stringify(exportSubmissionsJson({ form, submissions }), null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filenameBase}.json"`,
      },
    });
  }

  return new NextResponse(exportSubmissionsCsv({ form, submissions }), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filenameBase}.csv"`,
    },
  });
});
