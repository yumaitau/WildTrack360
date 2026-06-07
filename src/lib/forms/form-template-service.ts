'server-only';

import { prisma } from '../prisma';
import type { FormEntityType } from '@prisma/client';
import {
  FormFieldsArraySchema,
  parseFieldsJson,
  reconcileFields,
  type FormField,
} from './form-templates';

export interface SerializedTemplate {
  id: string;
  entityType: FormEntityType;
  name: string;
  version: number;
  fields: FormField[];
  isActive: boolean;
  updatedAt: string;
}

function serialize(row: {
  id: string;
  entityType: FormEntityType;
  name: string;
  version: number;
  fieldsJson: unknown;
  isActive: boolean;
  updatedAt: Date;
}): SerializedTemplate {
  return {
    id: row.id,
    entityType: row.entityType,
    name: row.name,
    version: row.version,
    fields: parseFieldsJson(row.fieldsJson),
    isActive: row.isActive,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getActiveTemplate(
  orgId: string,
  entityType: FormEntityType
): Promise<SerializedTemplate | null> {
  const row = await prisma.formTemplate.findUnique({
    where: { clerkOrganizationId_entityType: { clerkOrganizationId: orgId, entityType } },
  });
  return row ? serialize(row) : null;
}

export interface UpsertResult {
  template?: SerializedTemplate;
  errors?: string[];
}

// Upsert the org's template for an entity. Enforces immutability rules and
// auto-archives removed fields. The first save establishes the locked
// id/key/type triples; subsequent saves preserve them.
export async function upsertTemplate(
  orgId: string,
  entityType: FormEntityType,
  input: { name: string; fields: FormField[] }
): Promise<UpsertResult> {
  const parsedNext = FormFieldsArraySchema.safeParse(input.fields);
  if (!parsedNext.success) {
    return { errors: parsedNext.error.issues.map((i) => i.message) };
  }
  const nextFields = parsedNext.data;

  const existing = await prisma.formTemplate.findUnique({
    where: { clerkOrganizationId_entityType: { clerkOrganizationId: orgId, entityType } },
  });
  const previousFields = existing ? parseFieldsJson(existing.fieldsJson) : [];

  const usedOptionsByFieldId =
    entityType === 'MEMBER' && existing
      ? await collectUsedSelectOptions(orgId, entityType, previousFields)
      : new Map<string, Set<string>>();

  const { fields, errors } = reconcileFields({
    previous: previousFields,
    next: nextFields,
    usedOptionsByFieldId,
  });
  if (errors.length) return { errors };

  const row = await prisma.formTemplate.upsert({
    where: { clerkOrganizationId_entityType: { clerkOrganizationId: orgId, entityType } },
    create: {
      clerkOrganizationId: orgId,
      entityType,
      name: input.name,
      fieldsJson: fields as unknown as object,
      version: 1,
    },
    update: {
      name: input.name,
      fieldsJson: fields as unknown as object,
      version: { increment: 1 },
    },
  });

  return { template: serialize(row) };
}

// Walk Member.customFieldsJson to find which select / multiselect options are
// currently in use, so the template editor can't drop an option that has live
// references. Cheap for now (single table); revisit if multiple entities land.
async function collectUsedSelectOptions(
  orgId: string,
  entityType: FormEntityType,
  fields: FormField[]
): Promise<Map<string, Set<string>>> {
  const selectFields = fields.filter(
    (f): f is FormField & { type: 'select' | 'multiselect'; options: string[] } =>
      f.type === 'select' || f.type === 'multiselect'
  );
  if (selectFields.length === 0 || entityType !== 'MEMBER') return new Map();

  const members = await prisma.member.findMany({
    where: { clerkOrganizationId: orgId },
    select: { customFieldsJson: true },
  });

  const used = new Map<string, Set<string>>();
  for (const field of selectFields) {
    used.set(field.id, new Set());
  }

  for (const member of members) {
    const values = (member.customFieldsJson ?? {}) as Record<string, unknown>;
    if (!values || typeof values !== 'object') continue;
    for (const field of selectFields) {
      const v = values[field.id];
      const bucket = used.get(field.id);
      if (!bucket) continue;
      if (typeof v === 'string') bucket.add(v);
      else if (Array.isArray(v)) for (const item of v) if (typeof item === 'string') bucket.add(item);
    }
  }
  return used;
}
