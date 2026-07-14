import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getUserRole, hasPermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { deleteForm, getForm, serializeForm, updateForm } from '@/lib/forms/custom-form-service';
import { route } from '@/lib/openapi/route';
import {
  deleteCustomFormContract,
  getCustomFormContract,
  updateCustomFormContract,
} from '../openapi';

export const GET = route(getCustomFormContract, async ({ params }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gated = await gateFeature(orgId, 'CUSTOM_FORMS');
  if (gated) return gated;

  const role = await getUserRole(userId, orgId);
  if (!hasPermission(role, 'form:submit')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const form = await getForm(orgId, params.id);
  // Submitters only see published forms; hide drafts/archived as 404.
  if (!form || (!hasPermission(role, 'form:manage') && form.status !== 'PUBLISHED')) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  }

  return { data: serializeForm(form) };
});

export const PATCH = route(updateCustomFormContract, async ({ params, body }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gated = await gateFeature(orgId, 'CUSTOM_FORMS');
  if (gated) return gated;

  const role = await getUserRole(userId, orgId);
  if (!hasPermission(role, 'form:manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await updateForm(orgId, userId, params.id, body);
  if (!result) return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  if (!result.form) {
    if (result.conflict) return NextResponse.json({ error: result.conflict }, { status: 409 });
    return NextResponse.json({ error: 'Validation failed', issues: result.issues }, { status: 400 });
  }

  logAudit({
    userId,
    orgId,
    action: 'UPDATE',
    entity: 'CustomForm',
    entityId: result.form.id,
    metadata: { version: result.form.currentVersion, status: result.form.status },
  });
  return { data: result.form };
});

export const DELETE = route(deleteCustomFormContract, async ({ params }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gated = await gateFeature(orgId, 'CUSTOM_FORMS');
  if (gated) return gated;

  const role = await getUserRole(userId, orgId);
  if (!hasPermission(role, 'form:manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const deleted = await deleteForm(orgId, params.id);
  if (!deleted) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

  logAudit({ userId, orgId, action: 'DELETE', entity: 'CustomForm', entityId: params.id });
  return { data: { success: true } };
});
