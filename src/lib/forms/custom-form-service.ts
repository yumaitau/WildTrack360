'server-only';

import { Prisma, type CustomForm, type CustomFormSubmission } from '@prisma/client';
import { prisma } from '../prisma';
import {
  normalizeCustomFormPayload,
  normalizeSubmissionPayload,
  parseCustomFormDefinition,
  type CustomFormStatusValue,
  type ValidationIssue,
} from './custom-forms';

// Prisma stores the status as an uppercase enum; the domain model (and the
// wire format shared with WildForm360's mobile clients) uses lowercase.
const DB_STATUS: Record<CustomFormStatusValue, 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'> = {
  draft: 'DRAFT',
  published: 'PUBLISHED',
  archived: 'ARCHIVED',
};

const DOMAIN_STATUS: Record<string, CustomFormStatusValue> = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

export function serializeForm(row: CustomForm) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    status: DOMAIN_STATUS[row.status],
    currentVersion: row.currentVersion,
    schema: parseCustomFormDefinition(row.definitionJson),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type SerializedCustomForm = ReturnType<typeof serializeForm>;

type SubmissionWithVersion = CustomFormSubmission & {
  formVersion?: { definitionJson: unknown } | null;
};

export function serializeSubmission(row: SubmissionWithVersion) {
  return {
    id: row.id,
    formId: row.formId,
    formVersionId: row.formVersionId,
    formVersion: row.formVersionNumber,
    formSchema: row.formVersion ? parseCustomFormDefinition(row.formVersion.definitionJson) : null,
    submittedByUserId: row.submittedByUserId,
    clientSubmissionId: row.clientSubmissionId,
    observedAt: row.observedAt.toISOString(),
    location:
      row.latitude == null || row.longitude == null
        ? null
        : {
            latitude: row.latitude,
            longitude: row.longitude,
            accuracyMeters: row.locationAccuracyMeters,
          },
    photoUrls: (row.photoUrls as string[]) ?? [],
    weather: row.weatherJson,
    values: row.valuesJson as Record<string, unknown>,
    notes: row.notes,
    device: row.deviceJson,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type SerializedSubmission = ReturnType<typeof serializeSubmission>;

export type FormMutationResult =
  | { form: SerializedCustomForm; issues?: undefined; conflict?: undefined }
  | { form?: undefined; issues: ValidationIssue[]; conflict?: undefined }
  | { form?: undefined; issues?: undefined; conflict: string };

export async function listForms(orgId: string, options: { publishedOnly?: boolean } = {}) {
  const rows = await prisma.customForm.findMany({
    where: {
      clerkOrganizationId: orgId,
      ...(options.publishedOnly ? { status: 'PUBLISHED' } : {}),
    },
    orderBy: { updatedAt: 'desc' },
  });
  return rows.map(serializeForm);
}

export async function getForm(orgId: string, id: string) {
  const row = await prisma.customForm.findFirst({
    where: { id, clerkOrganizationId: orgId },
  });
  return row;
}

export async function createForm(
  orgId: string,
  userId: string,
  input: unknown
): Promise<FormMutationResult> {
  const result = normalizeCustomFormPayload(input);
  if (!result.data) return { issues: result.issues };
  const form = result.data;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.customForm.create({
        data: {
          clerkOrganizationId: orgId,
          createdByUserId: userId,
          title: form.title,
          slug: form.slug,
          description: form.description,
          status: DB_STATUS[form.status],
          currentVersion: 1,
          definitionJson: form.definition as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.customFormVersion.create({
        data: {
          formId: row.id,
          clerkOrganizationId: orgId,
          version: 1,
          createdByUserId: userId,
          changeSummary: 'Initial version',
          title: row.title,
          slug: row.slug,
          description: row.description,
          status: row.status,
          definitionJson: row.definitionJson as Prisma.InputJsonValue,
        },
      });
      return row;
    });
    return { form: serializeForm(created) };
  } catch (error) {
    if (isSlugUniqueViolation(error)) {
      return { conflict: 'A form with this slug already exists.' };
    }
    throw error;
  }
}

export async function updateForm(
  orgId: string,
  userId: string,
  id: string,
  input: unknown
): Promise<FormMutationResult | null> {
  const existing = await getForm(orgId, id);
  if (!existing) return null;

  const result = normalizeCustomFormPayload(input, {
    title: existing.title,
    slug: existing.slug,
    description: existing.description,
    status: DOMAIN_STATUS[existing.status],
    definition: parseCustomFormDefinition(existing.definitionJson),
  });
  if (!result.data) return { issues: result.issues };
  const form = result.data;

  const changeSummary = changeSummaryFrom(input);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const nextVersion = existing.currentVersion + 1;
      const row = await tx.customForm.update({
        where: { id: existing.id },
        data: {
          title: form.title,
          slug: form.slug,
          description: form.description,
          status: DB_STATUS[form.status],
          currentVersion: nextVersion,
          definitionJson: form.definition as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.customFormVersion.create({
        data: {
          formId: row.id,
          clerkOrganizationId: orgId,
          version: nextVersion,
          createdByUserId: userId,
          changeSummary: changeSummary ?? `Updated form to v${nextVersion}`,
          title: row.title,
          slug: row.slug,
          description: row.description,
          status: row.status,
          definitionJson: row.definitionJson as Prisma.InputJsonValue,
        },
      });
      return row;
    });
    return { form: serializeForm(updated) };
  } catch (error) {
    if (isSlugUniqueViolation(error)) {
      return { conflict: 'A form with this slug already exists.' };
    }
    if (isFormVersionUniqueViolation(error)) {
      return { conflict: 'This form was updated by someone else. Reload and try again.' };
    }
    throw error;
  }
}

export async function deleteForm(orgId: string, id: string): Promise<boolean> {
  const result = await prisma.customForm.deleteMany({
    where: { id, clerkOrganizationId: orgId },
  });
  return result.count > 0;
}

export function serializeVersion(row: {
  id: string;
  formId: string;
  version: number;
  createdByUserId: string;
  changeSummary: string | null;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  definitionJson: unknown;
  createdAt: Date;
}) {
  return {
    id: row.id,
    formId: row.formId,
    version: row.version,
    createdByUserId: row.createdByUserId,
    changeSummary: row.changeSummary,
    title: row.title,
    slug: row.slug,
    description: row.description,
    status: DOMAIN_STATUS[row.status],
    schema: parseCustomFormDefinition(row.definitionJson),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listVersions(orgId: string, formId: string) {
  const rows = await prisma.customFormVersion.findMany({
    where: { formId, clerkOrganizationId: orgId },
    orderBy: { version: 'desc' },
  });
  return rows.map(serializeVersion);
}

export async function getVersion(orgId: string, formId: string, versionId: string) {
  const row = await prisma.customFormVersion.findFirst({
    where: { id: versionId, formId, clerkOrganizationId: orgId },
  });
  return row ? serializeVersion(row) : null;
}

// Rollback never rewrites history: it creates a NEW version whose content is
// copied from the chosen snapshot, so submissions keep pointing at the exact
// schema they were captured under.
export async function rollbackToVersion(
  orgId: string,
  userId: string,
  formId: string,
  versionId: string
): Promise<FormMutationResult | null> {
  const [existing, snapshot] = await Promise.all([
    getForm(orgId, formId),
    prisma.customFormVersion.findFirst({
      where: { id: versionId, formId, clerkOrganizationId: orgId },
    }),
  ]);
  if (!existing || !snapshot) return null;

  return updateForm(orgId, userId, formId, {
    title: snapshot.title,
    slug: snapshot.slug,
    description: snapshot.description,
    status: DOMAIN_STATUS[existing.status],
    schema: parseCustomFormDefinition(snapshot.definitionJson),
    changeSummary: `Rolled back to v${snapshot.version}`,
  });
}

// ─── Submissions ─────────────────────────────────────────────────────────────

export type SubmissionResult = {
  clientSubmissionId: string | null;
  submissionId: string | null;
  status: 'CREATED' | 'DEDUPLICATED' | 'REJECTED';
  errorCode: string | null;
  message: string;
  issues?: unknown[];
};

export async function applySubmission({
  input,
  orgId,
  userId,
  requireClientSubmissionId = false,
}: {
  input: unknown;
  orgId: string;
  userId: string;
  requireClientSubmissionId?: boolean;
}): Promise<SubmissionResult> {
  if (!isRecord(input)) {
    return rejected(null, 'INVALID_PAYLOAD', 'Submission must be an object.');
  }

  const formId = typeof input.formId === 'string' ? input.formId : '';
  if (!formId) {
    return rejected(clientSubmissionIdFrom(input), 'FORM_ID_REQUIRED', 'formId is required.');
  }

  const existingByClientId = await findExistingClientSubmission(
    orgId,
    userId,
    clientSubmissionIdFrom(input)
  );
  if (existingByClientId) {
    return deduplicated(clientSubmissionIdFrom(input), existingByClientId.id);
  }

  const form = await getForm(orgId, formId);
  if (!form) {
    return rejected(clientSubmissionIdFrom(input), 'FORM_NOT_FOUND', 'Form not found.');
  }

  if (form.status !== 'PUBLISHED') {
    return rejected(
      clientSubmissionIdFrom(input),
      'FORM_NOT_PUBLISHED',
      'Form is not accepting submissions.'
    );
  }

  const definition = parseCustomFormDefinition(form.definitionJson);
  const normalized = normalizeSubmissionPayload(input, definition, {
    requireClientSubmissionId,
    photoKeyPrefix: `orgs/${orgId}/animal-photos/`,
  });
  if (!normalized.data) {
    return rejected(
      clientSubmissionIdFrom(input),
      'VALIDATION_FAILED',
      'Validation failed.',
      normalized.issues
    );
  }

  try {
    const version = await prisma.customFormVersion.findUnique({
      where: { formId_version: { formId: form.id, version: form.currentVersion } },
    });

    const created = await prisma.customFormSubmission.create({
      data: {
        clerkOrganizationId: orgId,
        formId: form.id,
        formVersionId: version?.id ?? null,
        formVersionNumber: form.currentVersion,
        submittedByUserId: userId,
        clientSubmissionId: normalized.data.clientSubmissionId,
        observedAt: normalized.data.observedAt,
        latitude: normalized.data.latitude,
        longitude: normalized.data.longitude,
        locationAccuracyMeters: normalized.data.locationAccuracyMeters,
        photoUrls: normalized.data.photoUrls,
        weatherJson: (normalized.data.weather ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        valuesJson: normalized.data.values as Prisma.InputJsonValue,
        notes: normalized.data.notes,
        deviceJson: (normalized.data.device ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });

    return {
      clientSubmissionId: normalized.data.clientSubmissionId,
      submissionId: created.id,
      status: 'CREATED',
      errorCode: null,
      message: 'Submission created.',
    };
  } catch (error) {
    // A concurrent retry of the same offline sync can race the dedup check
    // above; the unique index is the source of truth.
    if (isUniqueViolation(error)) {
      const duplicate = await findExistingClientSubmission(
        orgId,
        userId,
        normalized.data.clientSubmissionId
      );
      if (duplicate) {
        return deduplicated(normalized.data.clientSubmissionId, duplicate.id);
      }
    }
    throw error;
  }
}

export async function listSubmissions(
  orgId: string,
  filters: {
    formId?: string;
    submittedByUserId?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  } = {}
) {
  const rows = await prisma.customFormSubmission.findMany({
    where: {
      clerkOrganizationId: orgId,
      ...(filters.formId ? { formId: filters.formId } : {}),
      ...(filters.submittedByUserId ? { submittedByUserId: filters.submittedByUserId } : {}),
      ...(filters.from || filters.to
        ? {
            observedAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    },
    include: {
      formVersion: {
        select: { definitionJson: true },
      },
    },
    orderBy: { observedAt: 'desc' },
    take: Math.min(filters.limit ?? 200, 500),
  });
  return rows.map(serializeSubmission);
}

function isUniqueViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function uniqueViolationTarget(error: unknown): string[] {
  if (!isUniqueViolation(error)) return [];
  const target = error.meta?.target;
  if (Array.isArray(target)) return target.map(String);
  return typeof target === 'string' ? [target] : [];
}

function isSlugUniqueViolation(error: unknown): boolean {
  const target = uniqueViolationTarget(error).map((part) => part.toLowerCase());
  return target.some((part) => part.includes('slug'));
}

function isFormVersionUniqueViolation(error: unknown): boolean {
  const target = uniqueViolationTarget(error).map((part) => part.toLowerCase());
  return (
    target.some((part) => part.includes('version')) &&
    target.some(
      (part) =>
        part.includes('formid') || part.includes('form_id') || part.includes('custom_form_versions')
    )
  );
}

async function findExistingClientSubmission(
  orgId: string,
  userId: string,
  clientSubmissionId: string | null
) {
  if (!clientSubmissionId) return null;
  return prisma.customFormSubmission.findFirst({
    where: {
      clerkOrganizationId: orgId,
      submittedByUserId: userId,
      clientSubmissionId,
    },
    select: { id: true },
  });
}

function deduplicated(clientSubmissionId: string | null, submissionId: string): SubmissionResult {
  return {
    clientSubmissionId,
    submissionId,
    status: 'DEDUPLICATED',
    errorCode: null,
    message: 'Submission already exists.',
  };
}

function rejected(
  clientSubmissionId: string | null,
  errorCode: string,
  message: string,
  issues?: unknown[]
): SubmissionResult {
  return { clientSubmissionId, submissionId: null, status: 'REJECTED', errorCode, message, issues };
}

function clientSubmissionIdFrom(input: Record<string, unknown>): string | null {
  const value = input.clientSubmissionId ?? input.clientRecordId;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function changeSummaryFrom(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const summary = value.changeSummary;
  return typeof summary === 'string' && summary.trim() ? summary.trim().slice(0, 500) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
