import { z } from 'zod';

// Ten field types ported from RangerOS, dropping the RangerOS-specific
// "species" autocomplete. Add new types here and to the FormFieldSchema
// discriminated union below.
export const FORM_FIELD_TYPES = [
  'text',
  'longText',
  'number',
  'integer',
  'count',
  'date',
  'datetime',
  'boolean',
  'select',
  'multiselect',
] as const;

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

const FieldBase = z.object({
  id: z.string().min(1),
  key: z
    .string()
    .regex(
      /^[a-z][a-z0-9_]{0,40}$/,
      'Key must start with a lowercase letter, then lowercase / digits / underscore (max 41 chars)'
    ),
  label: z.string().trim().min(1).max(120),
  required: z.boolean().default(false),
  archived: z.boolean().default(false),
  helpText: z.string().max(500).optional().nullable(),
});

export const FormFieldSchema = z.discriminatedUnion('type', [
  FieldBase.extend({
    type: z.literal('text'),
    maxLength: z.number().int().positive().max(1000).optional(),
  }),
  FieldBase.extend({
    type: z.literal('longText'),
    maxLength: z.number().int().positive().max(10000).optional(),
  }),
  FieldBase.extend({
    type: z.literal('number'),
    min: z.number().optional(),
    max: z.number().optional(),
    unit: z.string().max(20).optional(),
  }),
  FieldBase.extend({
    type: z.literal('integer'),
    min: z.number().int().optional(),
    max: z.number().int().optional(),
    unit: z.string().max(20).optional(),
  }),
  FieldBase.extend({
    type: z.literal('count'),
    min: z.number().int().min(0).default(0),
    max: z.number().int().optional(),
  }),
  FieldBase.extend({ type: z.literal('date') }),
  FieldBase.extend({ type: z.literal('datetime') }),
  FieldBase.extend({ type: z.literal('boolean') }),
  FieldBase.extend({
    type: z.literal('select'),
    options: z.array(z.string().min(1).max(80)).min(1).max(50),
  }),
  FieldBase.extend({
    type: z.literal('multiselect'),
    options: z.array(z.string().min(1).max(80)).min(1).max(50),
  }),
]);

export type FormField = z.infer<typeof FormFieldSchema>;

export const FormFieldsArraySchema = z
  .array(FormFieldSchema)
  .refine((arr) => new Set(arr.map((f) => f.id)).size === arr.length, 'Field ids must be unique')
  .refine((arr) => new Set(arr.map((f) => f.key)).size === arr.length, 'Field keys must be unique');

export const FormTemplateInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  fields: FormFieldsArraySchema,
});

export type FormTemplateInput = z.infer<typeof FormTemplateInputSchema>;

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Short text',
  longText: 'Long text',
  number: 'Number (decimal)',
  integer: 'Whole number',
  count: 'Count (≥ 0)',
  date: 'Date',
  datetime: 'Date & time',
  boolean: 'Yes / No',
  select: 'Dropdown (one choice)',
  multiselect: 'Multiselect (many choices)',
};

// Loose-but-safe guard for fieldsJson coming back from Prisma's Json column.
export function parseFieldsJson(value: unknown): FormField[] {
  if (!Array.isArray(value)) return [];
  const result = FormFieldsArraySchema.safeParse(value);
  return result.success ? result.data : [];
}

// Build a runtime Zod schema for the submitted values object from the
// template's field definitions. Identical client + server validation so the
// rules can't drift. Archived fields are dropped — no new values accepted
// against them, but old values stay intact in storage.
export function buildValuesSchema(fields: FormField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    if (field.archived) continue;
    let schema: z.ZodTypeAny;

    switch (field.type) {
      case 'text':
        schema = z.string().trim().max(field.maxLength ?? 500);
        break;
      case 'longText':
        schema = z.string().trim().max(field.maxLength ?? 5000);
        break;
      case 'number':
        schema = z.coerce
          .number()
          .refine(
            (n) =>
              (field.min == null || n >= field.min) && (field.max == null || n <= field.max),
            field.min != null || field.max != null
              ? `Must be ${field.min != null ? `≥ ${field.min}` : ''}${
                  field.min != null && field.max != null ? ' and ' : ''
                }${field.max != null ? `≤ ${field.max}` : ''}`
              : 'Must be a number'
          );
        break;
      case 'integer':
        schema = z.coerce
          .number()
          .int()
          .refine(
            (n) =>
              (field.min == null || n >= field.min) && (field.max == null || n <= field.max),
            'Out of range'
          );
        break;
      case 'count':
        schema = z.coerce
          .number()
          .int()
          .min(field.min ?? 0)
          .refine(
            (n) => field.max == null || n <= field.max,
            field.max != null ? `Must be ≤ ${field.max}` : 'Invalid count'
          );
        break;
      case 'date':
      case 'datetime':
        schema = z.coerce.date();
        break;
      case 'boolean':
        schema = z.boolean();
        break;
      case 'select':
        schema = z.enum(field.options as [string, ...string[]]);
        break;
      case 'multiselect':
        schema = z.array(z.enum(field.options as [string, ...string[]])).default([]);
        break;
    }

    shape[field.id] = field.required ? schema : schema.optional().nullable();
  }

  return z.object(shape);
}

export function fieldKeyFromLabel(label: string): string {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 41) || 'field'
  );
}

export function newFieldId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `f-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

// ─── Immutability rules ─────────────────────────────────────────────────────
// Once a template is saved, field id/key/type are locked forever (CSV exports
// stay stable). Removed fields auto-archive (don't delete). Select/multiselect
// options can only be dropped if no submitted value still references them.

export interface ImmutabilityCheckArgs {
  previous: FormField[];
  next: FormField[];
  usedOptionsByFieldId?: Map<string, Set<string>>;
}

export interface ImmutabilityResult {
  fields: FormField[];
  errors: string[];
}

export function reconcileFields(args: ImmutabilityCheckArgs): ImmutabilityResult {
  const { previous, next, usedOptionsByFieldId } = args;
  const errors: string[] = [];
  const prevById = new Map(previous.map((f) => [f.id, f]));
  const nextById = new Map(next.map((f) => [f.id, f]));

  // Validate next against previous for locked attributes + option removals
  for (const [id, nextField] of nextById) {
    const prev = prevById.get(id);
    if (!prev) continue;
    if (prev.key !== nextField.key) {
      errors.push(`Field key '${prev.key}' is locked after first save`);
    }
    if (prev.type !== nextField.type) {
      errors.push(`Field '${prev.key}' type is locked after first save`);
    }
    if (
      (prev.type === 'select' || prev.type === 'multiselect') &&
      (nextField.type === 'select' || nextField.type === 'multiselect')
    ) {
      const prevOptions = new Set((prev as { options: string[] }).options);
      const nextOptions = new Set((nextField as { options: string[] }).options);
      const used = usedOptionsByFieldId?.get(id) ?? new Set<string>();
      for (const opt of prevOptions) {
        if (!nextOptions.has(opt) && used.has(opt)) {
          errors.push(
            `Option '${opt}' on field '${prev.key}' is in use and cannot be removed`
          );
        }
      }
    }
  }

  // Auto-archive (rather than delete) any previously-persisted fields the
  // admin removed from the payload. Preserves history so old submitted values
  // can still be resolved by field id.
  const reconciled: FormField[] = [...next];
  const nextIds = new Set(next.map((f) => f.id));
  for (const prev of previous) {
    if (!nextIds.has(prev.id)) {
      reconciled.push({ ...prev, archived: true });
    }
  }

  return { fields: reconciled, errors };
}

// Coerce submitted form values back into plain JSON for storage. Dates become
// ISO strings; everything else passes through.
export function serializeValues(
  values: Record<string, unknown> | null | undefined
): Record<string, string | number | boolean | string[] | null> {
  if (!values) return {};
  const out: Record<string, string | number | boolean | string[] | null> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined) {
      out[key] = null;
    } else if (value instanceof Date) {
      out[key] = value.toISOString();
    } else if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      out[key] = value;
    } else if (Array.isArray(value)) {
      const stringItems = value.filter((item): item is string => typeof item === 'string');
      if (stringItems.length === value.length) out[key] = stringItems;
    }
  }
  return out;
}
