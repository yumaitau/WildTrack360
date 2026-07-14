import { NextResponse } from 'next/server';
import { getForm, listVersions } from '@/lib/forms/custom-form-service';
import { route } from '@/lib/openapi/route';
import { listCustomFormVersionsContract } from '../../openapi';
import { requireFormAccess } from '../../access';

export const GET = route(listCustomFormVersionsContract, async ({ params }) => {
  const access = await requireFormAccess('form:manage');
  if ('response' in access) return access.response;

  const form = await getForm(access.orgId, params.id);
  if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

  const versions = await listVersions(access.orgId, params.id);
  return { data: { versions } };
});
