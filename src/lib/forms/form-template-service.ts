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

  // Only spend the (potentially large) Member scan when we actually need it:
  // an existing template, at least one persisted select / multiselect field,
  // and at least one option being dropped on this PATCH. New templates,
  // label-only edits, and adds skip the scan entirely.
  const previousById = new Map(previousFields.map((f) => [f.id, f]));
  const candidateOptionRemovals = nextFields.some((next) => {
    if (next.type !== 'select' && next.type !== 'multiselect') return false;
    const prev = previousById.get(next.id);
    if (!prev || (prev.type !== 'select' && prev.type !== 'multiselect')) return false;
    const nextOptions = new Set((next as { options: string[] }).options);
    return (prev as { options: string[] }).options.some((opt) => !nextOptions.has(opt));
  });

  const usedOptionsByFieldId =
    entityType === 'MEMBER' && existing && candidateOptionRemovals
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

  const used = new Map<string, Set<string>>();
  for (const field of selectFields) {
    used.set(field.id, new Set());
  }

  // Cursor-paginate so a large org's members can't OOM the API container.
  // We only need the customFieldsJson column; payload per row is small.
  const PAGE_SIZE = 500;
  let cursor: string | undefined;
  while (true) {
    const page = await prisma.member.findMany({
      where: { clerkOrganizationId: orgId },
      select: { id: true, customFieldsJson: true },
      orderBy: { id: 'asc' },
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (page.length === 0) break;
    for (const member of page) {
      const values = (member.customFieldsJson ?? {}) as Record<string, unknown>;
      if (!values || typeof values !== 'object') continue;
      for (const field of selectFields) {
        const v = values[field.id];
        const bucket = used.get(field.id);
        if (!bucket) continue;
        if (typeof v === 'string') bucket.add(v);
        else if (Array.isArray(v))
          for (const item of v) if (typeof item === 'string') bucket.add(item);
      }
    }
    if (page.length < PAGE_SIZE) break;
    cursor = page[page.length - 1].id;
  }
  return used;
}
