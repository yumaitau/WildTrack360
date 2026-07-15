// Custom forms domain model, ported from WildForm360's dynamic-forms module.
// Shared by the web builder/fill UI and the API layer (and consumed by the
// mobile apps via /api/custom-forms), so validation lives here once and both
// client and server run the same rules.

export const customFieldTypes = [
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
  'species',
] as const;

export type CustomFieldType = (typeof customFieldTypes)[number];

export type CustomFormStatusValue = 'draft' | 'published' | 'archived';

export type CustomFormFieldBase = {
  id: string;
  key: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  archived: boolean;
  helpText?: string | null;
};

export type CustomFormField =
  | (CustomFormFieldBase & { type: 'text'; maxLength?: number })
  | (CustomFormFieldBase & { type: 'longText'; maxLength?: number })
  | (CustomFormFieldBase & { type: 'number'; min?: number; max?: number; unit?: string })
  | (CustomFormFieldBase & { type: 'integer'; min?: number; max?: number; unit?: string })
  | (CustomFormFieldBase & { type: 'count'; min?: number; max?: number })
  | (CustomFormFieldBase & { type: 'date' })
  | (CustomFormFieldBase & { type: 'datetime' })
  | (CustomFormFieldBase & { type: 'boolean' })
  | (CustomFormFieldBase & { type: 'select'; options: string[] })
  | (CustomFormFieldBase & { type: 'multiselect'; options: string[] })
  | (CustomFormFieldBase & { type: 'species'; suggestions: string[] });

export type CustomFormDefinition = {
  version: 1;
  requireLocation: boolean;
  captureDateTime: boolean;
  capturePhotos: boolean;
  captureWeather: boolean;
  fields: CustomFormField[];
};

export type WeatherCapture = {
  capturedAt?: string | null;
  source?: 'device' | 'manual' | 'weather_api' | null;
  temperatureCelsius?: number | null;
  humidityPct?: number | null;
  windDirection?: string | null;
  windSpeedKmh?: number | null;
  windGustKmh?: number | null;
  rainfallMm?: number | null;
  summary?: string | null;
};

export type DeviceCapture = {
  deviceId?: string | null;
  platform?: string | null;
  appVersion?: string | null;
};

export type CustomSubmissionValue = string | number | boolean | string[] | null;

export type NormalizedCustomForm = {
  title: string;
  slug: string;
  description: string | null;
  status: CustomFormStatusValue;
  definition: CustomFormDefinition;
};

export type NormalizedSubmission = {
  clientSubmissionId: string | null;
  observedAt: Date;
  latitude: number | null;
  longitude: number | null;
  locationAccuracyMeters: number | null;
  photoUrls: string[];
  weather: WeatherCapture | null;
  values: Record<string, CustomSubmissionValue>;
  notes: string | null;
  device: DeviceCapture | null;
};

export type ValidationIssue = {
  path: string;
  message: string;
};

const CHOICE_VALUE_MAX_LENGTH = 120;

export const customFieldTypeLabels: Record<CustomFieldType, string> = {
  text: 'Short text',
  longText: 'Long text',
  number: 'Decimal number',
  integer: 'Whole number',
  count: 'Count',
  date: 'Date',
  datetime: 'Date and time',
  boolean: 'Yes or no',
  select: 'Single choice',
  multiselect: 'Multiple choice',
  species: 'Species',
};

export function slugify(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'form'
  );
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

export function parseCustomFormDefinition(value: unknown): CustomFormDefinition {
  return normalizeDefinition(value).definition;
}

export function normalizeCustomFormPayload(
  input: unknown,
  existing?: NormalizedCustomForm
): { data: NormalizedCustomForm | null; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  if (!isRecord(input)) {
    return { data: null, issues: [{ path: '$', message: 'Payload must be a JSON object.' }] };
  }

  const title = cleanString(input.title ?? input.name ?? existing?.title, 120);
  if (!title) {
    issues.push({ path: 'title', message: 'Title is required.' });
  }

  const rawSlug = cleanString(input.slug ?? existing?.slug ?? title, 80);
  const slug = slugify(rawSlug ?? title ?? 'form');
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) {
    issues.push({ path: 'slug', message: 'Slug must use lowercase letters, digits, or dashes.' });
  }

  const descriptionInput = Object.prototype.hasOwnProperty.call(input, 'description')
    ? input.description
    : (existing?.description ?? null);
  const description = cleanString(descriptionInput, 2000) ?? null;
  const status = normalizeStatus(input.status, existing?.status ?? 'draft');

  const definitionPatch = isRecord(input.schema)
    ? input.schema
    : isRecord(input.definition)
      ? input.definition
      : input;

  const hasDefinitionPatch =
    'schema' in input ||
    'definition' in input ||
    'fields' in input ||
    'requireLocation' in input ||
    'captureDateTime' in input ||
    'capturePhotos' in input ||
    'captureWeather' in input;

  const definitionResult =
    hasDefinitionPatch || !existing
      ? normalizeDefinition(definitionPatch, existing?.definition)
      : { definition: existing.definition, issues: [] };

  issues.push(...definitionResult.issues);

  if (issues.length > 0 || !title) {
    return { data: null, issues };
  }

  return {
    data: { title, slug, description, status, definition: definitionResult.definition },
    issues: [],
  };
}

export function normalizeSubmissionPayload(
  input: unknown,
  definition: CustomFormDefinition,
  options: { requireClientSubmissionId?: boolean; photoKeyPrefix?: string } = {}
): { data: NormalizedSubmission | null; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  if (!isRecord(input)) {
    return { data: null, issues: [{ path: '$', message: 'Payload must be a JSON object.' }] };
  }

  const clientSubmissionId = normalizeClientSubmissionId(input, issues);

  if (options.requireClientSubmissionId && !clientSubmissionId) {
    issues.push({
      path: 'clientSubmissionId',
      message: 'clientSubmissionId is required for mobile sync.',
    });
  }

  const timestamp = firstNonEmptyTimestamp(input);
  const observedAt = timestamp ? parseDate(timestamp.value) : null;
  if (timestamp && !observedAt) {
    issues.push({ path: timestamp.path, message: 'Observed date must be valid.' });
  }

  const location = isRecord(input.location) ? input.location : input;
  const latitude = parseNumber(location.latitude ?? location.lat);
  const longitude = parseNumber(location.longitude ?? location.lng);
  const locationAccuracyMeters = parseNumber(
    location.accuracyMeters ?? location.locationAccuracyMeters
  );

  if (definition.requireLocation && latitude == null) {
    issues.push({ path: 'location.latitude', message: 'Latitude is required.' });
  }

  if (definition.requireLocation && longitude == null) {
    issues.push({ path: 'location.longitude', message: 'Longitude is required.' });
  }

  if (latitude != null && (latitude < -90 || latitude > 90)) {
    issues.push({ path: 'location.latitude', message: 'Latitude is out of range.' });
  }

  if (longitude != null && (longitude < -180 || longitude > 180)) {
    issues.push({ path: 'location.longitude', message: 'Longitude is out of range.' });
  }

  const photoUrls = definition.capturePhotos
    ? parsePhotoUrlArray(
        input.photoUrls ?? input.photos,
        20,
        'photoUrls',
        issues,
        options.photoKeyPrefix
      )
    : [];

  const weather = definition.captureWeather ? normalizeWeather(input.weather, issues) : null;

  const submittedValues = isRecord(input.values) ? input.values : {};
  const values = normalizeFieldValues(definition.fields, submittedValues, issues);

  const notes = cleanString(input.notes ?? null, 5000) ?? null;
  const device = normalizeDevice(input.device);

  if (issues.length > 0) {
    return { data: null, issues };
  }

  return {
    data: {
      clientSubmissionId,
      observedAt: observedAt ?? new Date(),
      latitude,
      longitude,
      locationAccuracyMeters,
      photoUrls,
      weather,
      values,
      notes,
      device,
    },
    issues: [],
  };
}

function normalizeDefinition(
  value: unknown,
  existing?: CustomFormDefinition
): { definition: CustomFormDefinition; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const input = isRecord(value) ? value : {};

  const hasFields = Object.prototype.hasOwnProperty.call(input, 'fields');
  const rawFields = hasFields ? input.fields : (existing?.fields ?? []);

  const definition: CustomFormDefinition = {
    version: 1,
    requireLocation: boolValue(input.requireLocation, existing?.requireLocation ?? true),
    captureDateTime: boolValue(input.captureDateTime, existing?.captureDateTime ?? true),
    capturePhotos: boolValue(input.capturePhotos, existing?.capturePhotos ?? true),
    captureWeather: boolValue(input.captureWeather, existing?.captureWeather ?? true),
    fields: normalizeFields(rawFields, issues),
  };

  return { definition, issues };
}

function normalizeFields(value: unknown, issues: ValidationIssue[]): CustomFormField[] {
  if (!Array.isArray(value)) {
    issues.push({ path: 'fields', message: 'Fields must be an array.' });
    return [];
  }

  if (value.length > 80) {
    issues.push({ path: 'fields', message: 'A form can have at most 80 fields.' });
  }

  const fields: CustomFormField[] = [];
  const ids = new Set<string>();
  const keys = new Set<string>();

  value.slice(0, 80).forEach((rawField, index) => {
    const path = `fields.${index}`;

    if (!isRecord(rawField)) {
      issues.push({ path, message: 'Field must be an object.' });
      return;
    }

    const type = coerceFieldType(rawField.type);
    if (!type) {
      issues.push({ path: `${path}.type`, message: 'Unknown field type.' });
      return;
    }

    const label = cleanString(rawField.label, 120);
    if (!label) {
      issues.push({ path: `${path}.label`, message: 'Field label is required.' });
      return;
    }

    const id = cleanString(rawField.id, 80) ?? createFieldId();
    const key = fieldKeyFromLabel(
      cleanString(rawField.key, 60) ?? cleanString(rawField.label, 120) ?? id
    );

    if (ids.has(id)) {
      issues.push({ path: `${path}.id`, message: 'Field ids must be unique.' });
    }

    if (keys.has(key)) {
      issues.push({ path: `${path}.key`, message: 'Field keys must be unique.' });
    }

    ids.add(id);
    keys.add(key);

    const base = {
      id,
      key,
      label,
      type,
      required: boolValue(rawField.required, false),
      archived: boolValue(rawField.archived, false),
      helpText: cleanString(rawField.helpText, 500) ?? null,
    };

    switch (type) {
      case 'text':
      case 'longText': {
        const maxLength = parseInteger(rawField.maxLength);
        if (maxLength != null && maxLength < 1) {
          issues.push({ path: `${path}.maxLength`, message: 'Max length must be at least 1.' });
        }
        fields.push({
          ...base,
          type,
          maxLength: maxLength != null && maxLength >= 1 ? maxLength : undefined,
        });
        break;
      }
      case 'number':
      case 'integer': {
        const min = parseNumber(rawField.min) ?? undefined;
        const max = parseNumber(rawField.max) ?? undefined;
        validateBounds(min, max, `${path}.min`, issues);
        fields.push({
          ...base,
          type,
          min,
          max,
          unit: cleanString(rawField.unit, 20) ?? undefined,
        });
        break;
      }
      case 'count': {
        const min = parsePositiveInteger(rawField.min) ?? 0;
        const max = parsePositiveInteger(rawField.max);
        validateBounds(min, max, `${path}.min`, issues);
        fields.push({
          ...base,
          type,
          min,
          max,
        });
        break;
      }
      case 'select':
      case 'multiselect': {
        const options = parseStringArray(
          rawField.options,
          50,
          `${path}.options`,
          issues,
          CHOICE_VALUE_MAX_LENGTH
        );
        if (options.length === 0) {
          issues.push({
            path: `${path}.options`,
            message: 'Choice fields need at least one option.',
          });
        }
        fields.push({ ...base, type, options });
        break;
      }
      case 'species':
        fields.push({
          ...base,
          type,
          suggestions: parseStringArray(rawField.suggestions, 200, `${path}.suggestions`, issues),
        });
        break;
      case 'date':
      case 'datetime':
      case 'boolean':
        fields.push({ ...base, type });
        break;
    }
  });

  return fields;
}

function normalizeFieldValues(
  fields: CustomFormField[],
  input: Record<string, unknown>,
  issues: ValidationIssue[]
): Record<string, CustomSubmissionValue> {
  const values: Record<string, CustomSubmissionValue> = {};

  for (const field of fields) {
    if (field.archived) {
      continue;
    }

    const rawValue = input[field.id] ?? input[field.key];
    const path = `values.${field.key}`;

    if (isEmptyValue(rawValue)) {
      if (field.required) {
        issues.push({ path, message: `${field.label} is required.` });
      }
      values[field.id] = null;
      continue;
    }

    switch (field.type) {
      case 'text':
      case 'longText':
      case 'species': {
        const maxLength =
          field.type === 'longText'
            ? (field.maxLength ?? 5000)
            : field.type === 'text'
              ? (field.maxLength ?? 500)
              : 120;
        const value = cleanString(rawValue, maxLength);
        if (value == null || value === '') {
          issues.push({ path, message: `${field.label} must be text.` });
        }
        values[field.id] = value;
        break;
      }
      case 'number': {
        const value = parseNumber(rawValue);
        if (
          value == null ||
          (field.min != null && value < field.min) ||
          (field.max != null && value > field.max)
        ) {
          issues.push({ path, message: `${field.label} is out of range.` });
        }
        values[field.id] = value;
        break;
      }
      case 'integer':
      case 'count': {
        const value = parseInteger(rawValue);
        const min = field.type === 'count' ? (field.min ?? 0) : field.min;
        if (
          value == null ||
          (min != null && value < min) ||
          (field.max != null && value > field.max)
        ) {
          issues.push({ path, message: `${field.label} is out of range.` });
        }
        values[field.id] = value;
        break;
      }
      case 'date':
      case 'datetime': {
        const value = parseDate(rawValue);
        if (!value) {
          issues.push({ path, message: `${field.label} must be a valid date.` });
        }
        values[field.id] = value?.toISOString() ?? null;
        break;
      }
      case 'boolean': {
        const value = parseBoolean(rawValue);
        if (value == null) {
          issues.push({ path, message: `${field.label} must be true or false.` });
        }
        values[field.id] = value;
        break;
      }
      case 'select': {
        const value = cleanString(rawValue, CHOICE_VALUE_MAX_LENGTH);
        if (!value || !field.options.includes(value)) {
          issues.push({ path, message: `${field.label} has an invalid option.` });
        }
        values[field.id] = value;
        break;
      }
      case 'multiselect': {
        const selected = parseStringArray(rawValue, 50, path, issues, CHOICE_VALUE_MAX_LENGTH);
        const invalid = selected.filter((item) => !field.options.includes(item));
        if (invalid.length > 0) {
          issues.push({ path, message: `${field.label} has invalid options.` });
        }
        values[field.id] = selected;
        break;
      }
    }
  }

  return values;
}

function normalizeWeather(value: unknown, issues: ValidationIssue[]): WeatherCapture | null {
  if (value == null) {
    return null;
  }

  if (!isRecord(value)) {
    issues.push({ path: 'weather', message: 'Weather must be an object.' });
    return null;
  }

  const capturedAt = parseDate(value.capturedAt);
  const source = cleanString(value.source, 40);
  const allowedSources = ['device', 'manual', 'weather_api'];

  return {
    capturedAt: capturedAt?.toISOString() ?? null,
    source: allowedSources.includes(source ?? '') ? (source as WeatherCapture['source']) : null,
    temperatureCelsius: parseNumber(value.temperatureCelsius ?? value.tempCelsius),
    humidityPct: parseNumber(value.humidityPct),
    windDirection: cleanString(value.windDirection, 20) ?? null,
    windSpeedKmh: parseNumber(value.windSpeedKmh),
    windGustKmh: parseNumber(value.windGustKmh),
    rainfallMm: parseNumber(value.rainfallMm),
    summary: cleanString(value.summary, 240) ?? null,
  };
}

function normalizeDevice(value: unknown): DeviceCapture | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    deviceId: cleanString(value.deviceId, 160) ?? null,
    platform: cleanString(value.platform, 40) ?? null,
    appVersion: cleanString(value.appVersion, 80) ?? null,
  };
}

function coerceFieldType(value: unknown): CustomFieldType | null {
  if (typeof value !== 'string') {
    return null;
  }

  const aliases: Record<string, CustomFieldType> = {
    long_text: 'longText',
    decimal: 'number',
    whole_number: 'integer',
    yes_no: 'boolean',
    single_choice: 'select',
    multi_choice: 'multiselect',
    multiple_choice: 'multiselect',
  };

  const normalized = aliases[value] ?? value;

  return customFieldTypes.includes(normalized as CustomFieldType)
    ? (normalized as CustomFieldType)
    : null;
}

function normalizeStatus(value: unknown, fallback: CustomFormStatusValue): CustomFormStatusValue {
  return value === 'draft' || value === 'published' || value === 'archived' ? value : fallback;
}

function parseStringArray(
  value: unknown,
  maxItems: number,
  path: string,
  issues: ValidationIssue[],
  maxLength = 240
): string[] {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value)) {
    issues.push({ path, message: 'Expected an array of strings.' });
    return [];
  }

  if (value.length > maxItems) {
    issues.push({ path, message: `At most ${maxItems} items are allowed.` });
  }

  return value
    .slice(0, maxItems)
    .map((item) => cleanString(item, maxLength))
    .filter((item): item is string => Boolean(item));
}

// The shared image upload endpoint returns a private S3 key, while older web
// clients may submit HTTPS or app-relative proxy URLs. The caller supplies the
// current org's key prefix so a submission cannot reference another org's
// private object.
function parsePhotoUrlArray(
  value: unknown,
  maxItems: number,
  path: string,
  issues: ValidationIssue[],
  photoKeyPrefix?: string
): string[] {
  const values = parseStringArray(value, maxItems, path, issues);

  return values.filter((item, index) => {
    const valid =
      item.startsWith('https://') ||
      item.startsWith('/') ||
      (photoKeyPrefix != null && item.startsWith(photoKeyPrefix));
    if (!valid) {
      issues.push({
        path: `${path}.${index}`,
        message: 'Photos must be HTTPS URLs or uploaded app photo paths.',
      });
    }
    return valid;
  });
}

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseInteger(value: unknown): number | null {
  const parsed = parseNumber(value);

  return parsed != null && Number.isInteger(parsed) ? parsed : null;
}

function parsePositiveInteger(value: unknown): number | undefined {
  const parsed = parseInteger(value);

  return parsed != null && parsed >= 0 ? parsed : undefined;
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);

    return Number.isNaN(parsed.valueOf()) ? null : parsed;
  }

  return null;
}

function firstNonEmptyTimestamp(
  input: Record<string, unknown>
): { path: 'observedAt' | 'performedAt' | 'recordedAt'; value: unknown } | null {
  for (const path of ['observedAt', 'performedAt', 'recordedAt'] as const) {
    const value = input[path];
    if (value == null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    return { path, value };
  }

  return null;
}

function normalizeClientSubmissionId(
  input: Record<string, unknown>,
  issues: ValidationIssue[]
): string | null {
  const path = input.clientSubmissionId != null ? 'clientSubmissionId' : 'clientRecordId';
  const value = input.clientSubmissionId ?? input.clientRecordId;
  if (typeof value !== 'string') {
    return null;
  }

  if (!value.trim()) {
    return null;
  }

  if (value.length > 160) {
    issues.push({
      path,
      message: 'clientSubmissionId must be at most 160 characters.',
    });
  }

  return value.trim();
}

function validateBounds(
  min: number | undefined,
  max: number | undefined,
  path: string,
  issues: ValidationIssue[]
) {
  if (min != null && max != null && min > max) {
    issues.push({ path, message: 'Minimum cannot be greater than maximum.' });
  }
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true' || value === '1' || value === 1) {
    return true;
  }

  if (value === 'false' || value === '0' || value === 0) {
    return false;
  }

  return null;
}

function boolValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function isEmptyValue(value: unknown): boolean {
  return value == null || value === '' || (Array.isArray(value) && value.length === 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function createFieldId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `field_${Date.now()}`;
}
