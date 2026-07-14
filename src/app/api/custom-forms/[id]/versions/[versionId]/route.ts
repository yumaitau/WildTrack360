import { NextResponse } from 'next/server';
import { getVersion } from '@/lib/forms/custom-form-service';
import { route } from '@/lib/openapi/route';
import { getCustomFormVersionContract } from '../../../openapi';
import { requireFormAccess } from '../../../access';

export const GET = route(getCustomFormVersionContract, async ({ params }) => {
  const access = await requireFormAccess('form:manage');
  if ('response' in access) return access.response;

  const version = await getVersion(access.orgId, params.id, params.versionId);
  if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 });

  return { data: version };
});
