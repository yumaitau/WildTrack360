import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getUserRole, hasPermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { createForm, listForms } from '@/lib/forms/custom-form-service';
import { route } from '@/lib/openapi/route';
import { createCustomFormContract, listCustomFormsContract } from './openapi';

export const GET = route(listCustomFormsContract, async () => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gated = await gateFeature(orgId, 'CUSTOM_FORMS');
  if (gated) return gated;

  const role = await getUserRole(userId, orgId);
  if (!hasPermission(role, 'form:submit')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const forms = await listForms(orgId, {
    publishedOnly: !hasPermission(role, 'form:manage'),
  });
  return { data: { forms } };
});

export const POST = route(createCustomFormContract, async ({ body }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gated = await gateFeature(orgId, 'CUSTOM_FORMS');
  if (gated) return gated;

  const role = await getUserRole(userId, orgId);
  if (!hasPermission(role, 'form:manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await createForm(orgId, userId, body);
  if (!result.form) {
    if (result.conflict) return NextResponse.json({ error: result.conflict }, { status: 409 });
    return NextResponse.json({ error: 'Validation failed', issues: result.issues }, { status: 400 });
  }

  logAudit({
    userId,
    orgId,
    action: 'CREATE',
    entity: 'CustomForm',
    entityId: result.form.id,
    metadata: { title: result.form.title, status: result.form.status },
  });
  return { data: result.form, status: 201 };
});
