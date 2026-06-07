import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { getActiveTemplate, upsertTemplate } from '@/lib/forms/form-template-service';
import { FormFieldsArraySchema } from '@/lib/forms/form-templates';
import type { FormEntityType } from '@prisma/client';

const VALID_TYPES: FormEntityType[] = ['MEMBER'];

function parseEntityType(raw: string): FormEntityType | null {
  const upper = raw.toUpperCase();
  return (VALID_TYPES as string[]).includes(upper) ? (upper as FormEntityType) : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entityType: string }> }
) {
  const { entityType: raw } = await params;
  const entityType = parseEntityType(raw);
  if (!entityType) return NextResponse.json({ error: 'Unknown entity type' }, { status: 404 });

  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try {
    await requirePermission(userId, orgId, 'member:view_all');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const template = await getActiveTemplate(orgId, entityType);
  return NextResponse.json(template ?? { entityType, name: null, fields: [] });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ entityType: string }> }
) {
  const { entityType: raw } = await params;
  const entityType = parseEntityType(raw);
  if (!entityType) return NextResponse.json({ error: 'Unknown entity type' }, { status: 404 });

  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try {
    await requirePermission(userId, orgId, 'membership:configure');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    if (typeof body.name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const fieldsParse = FormFieldsArraySchema.safeParse(body.fields);
    if (!fieldsParse.success) {
      return NextResponse.json(
        { error: 'Invalid fields', issues: fieldsParse.error.issues },
        { status: 400 }
      );
    }

    const result = await upsertTemplate(orgId, entityType, {
      name: body.name,
      fields: fieldsParse.data,
    });

    if (result.errors) {
      return NextResponse.json({ error: result.errors.join('; '), issues: result.errors }, { status: 400 });
    }

    logAudit({
      userId,
      orgId,
      action: 'UPDATE',
      entity: 'FormTemplate',
      entityId: result.template?.id,
      metadata: { entityType, fieldCount: result.template?.fields.length },
    });
    return NextResponse.json(result.template);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
