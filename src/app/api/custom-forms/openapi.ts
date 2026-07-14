import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

// Custom forms domain (ported from WildForm360). The wire shapes intentionally
// mirror WildForm360's mobile API so the iOS/Android clients can be ported
// against the same payloads: forms carry a JSON `schema` definition, and
// submissions sync idempotently via `clientSubmissionId`.

const isoDateTime = () => z.string().openapi({ format: 'date-time' });

const formStatusSchema = z.enum(['draft', 'published', 'archived']).openapi('CustomFormStatus');
const weatherSourceSchema = z.enum(['device', 'manual', 'weather_api']);

const fieldBaseShape = {
  id: z.string(),
  key: z.string(),
  label: z.string(),
  required: z.boolean(),
  archived: z.boolean(),
  helpText: z.string().nullable().optional(),
};

const textFieldSchema = z.object({
  ...fieldBaseShape,
  type: z.literal('text'),
  maxLength: z.number().int().min(1).optional(),
});

const longTextFieldSchema = z.object({
  ...fieldBaseShape,
  type: z.literal('longText'),
  maxLength: z.number().int().min(1).optional(),
});

const numberFieldSchema = z.object({
  ...fieldBaseShape,
  type: z.literal('number'),
  min: z.number().optional(),
  max: z.number().optional(),
  unit: z.string().optional(),
});

const integerFieldSchema = z.object({
  ...fieldBaseShape,
  type: z.literal('integer'),
  min: z.number().optional(),
  max: z.number().optional(),
  unit: z.string().optional(),
});

const countFieldSchema = z.object({
  ...fieldBaseShape,
  type: z.literal('count'),
  min: z.number().int().min(0).optional(),
  max: z.number().int().min(0).optional(),
});

const dateFieldSchema = z.object({ ...fieldBaseShape, type: z.literal('date') });
const datetimeFieldSchema = z.object({ ...fieldBaseShape, type: z.literal('datetime') });
const booleanFieldSchema = z.object({ ...fieldBaseShape, type: z.literal('boolean') });

const selectFieldSchema = z.object({
  ...fieldBaseShape,
  type: z.literal('select'),
  options: z.array(z.string()).min(1).max(50),
});

const multiselectFieldSchema = z.object({
  ...fieldBaseShape,
  type: z.literal('multiselect'),
  options: z.array(z.string()).min(1).max(50),
});

const speciesFieldSchema = z.object({
  ...fieldBaseShape,
  type: z.literal('species'),
  suggestions: z.array(z.string()).max(200),
});

const customFormFieldSchema = z
  .discriminatedUnion('type', [
    textFieldSchema,
    longTextFieldSchema,
    numberFieldSchema,
    integerFieldSchema,
    countFieldSchema,
    dateFieldSchema,
    datetimeFieldSchema,
    booleanFieldSchema,
    selectFieldSchema,
    multiselectFieldSchema,
    speciesFieldSchema,
  ])
  .openapi('CustomFormField');

const customFormDefinitionSchema = z
  .object({
    version: z.literal(1),
    requireLocation: z.boolean(),
    captureDateTime: z.boolean(),
    capturePhotos: z.boolean(),
    captureWeather: z.boolean(),
    fields: z.array(customFormFieldSchema).max(80),
  })
  .openapi('CustomFormDefinition');

const weatherCaptureSchema = z
  .object({
    capturedAt: isoDateTime().nullable().optional(),
    source: weatherSourceSchema.nullable().optional(),
    temperatureCelsius: z.number().nullable().optional(),
    humidityPct: z.number().nullable().optional(),
    windDirection: z.string().nullable().optional(),
    windSpeedKmh: z.number().nullable().optional(),
    windGustKmh: z.number().nullable().optional(),
    rainfallMm: z.number().nullable().optional(),
    summary: z.string().nullable().optional(),
  })
  .openapi('CustomFormWeatherCapture');

const deviceCaptureSchema = z
  .object({
    deviceId: z.string().nullable().optional(),
    platform: z.string().nullable().optional(),
    appVersion: z.string().nullable().optional(),
  })
  .openapi('CustomFormDeviceCapture');

const formSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    status: formStatusSchema,
    currentVersion: z.number().int(),
    schema: customFormDefinitionSchema,
    createdAt: isoDateTime(),
    updatedAt: isoDateTime(),
  })
  .openapi('CustomFormRecord');

const versionSchema = z
  .object({
    id: z.string(),
    formId: z.string(),
    version: z.number().int(),
    createdByUserId: z.string(),
    changeSummary: z.string().nullable(),
    title: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    status: formStatusSchema,
    schema: customFormDefinitionSchema,
    createdAt: isoDateTime(),
  })
  .openapi('CustomFormVersionRecord');

const submissionSchema = z
  .object({
    id: z.string(),
    formId: z.string(),
    formVersionId: z.string().nullable(),
    formVersion: z.number().int(),
    formSchema: customFormDefinitionSchema.nullable(),
    submittedByUserId: z.string(),
    submittedByUserEmail: z.string().optional(),
    clientSubmissionId: z.string().nullable(),
    observedAt: isoDateTime(),
    location: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
        accuracyMeters: z.number().nullable(),
      })
      .nullable(),
    photoUrls: z.array(z.string()),
    weather: weatherCaptureSchema.nullable(),
    values: z.record(z.unknown()),
    notes: z.string().nullable(),
    device: deviceCaptureSchema.nullable(),
    createdAt: isoDateTime(),
    updatedAt: isoDateTime(),
  })
  .openapi('CustomFormSubmissionRecord');

const numericInputSchema = z.union([z.number(), z.string()]);
const timestampInputSchema = z.union([isoDateTime(), z.number()]);

const customFormFieldInputSchema = z.object({
  id: z.string().optional(),
  key: z.string().optional(),
  label: z.string().optional(),
  type: z
    .enum([
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
      'long_text',
      'decimal',
      'whole_number',
      'yes_no',
      'single_choice',
      'multi_choice',
      'multiple_choice',
    ])
    .optional(),
  required: z.boolean().optional(),
  archived: z.boolean().optional(),
  helpText: z.string().nullable().optional(),
  maxLength: numericInputSchema.optional(),
  min: numericInputSchema.optional(),
  max: numericInputSchema.optional(),
  unit: z.string().optional(),
  options: z.array(z.string()).max(50).optional(),
  suggestions: z.array(z.string()).max(200).optional(),
});

const customFormDefinitionInputSchema = z.object({
  version: z.literal(1).optional(),
  requireLocation: z.boolean().optional(),
  captureDateTime: z.boolean().optional(),
  capturePhotos: z.boolean().optional(),
  captureWeather: z.boolean().optional(),
  fields: z.array(customFormFieldInputSchema).max(80).optional(),
});

const formMutationBodySchema = z
  .object({
    title: z.string().optional(),
    name: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().nullable().optional(),
    status: formStatusSchema.optional(),
    schema: customFormDefinitionInputSchema.optional(),
    definition: customFormDefinitionInputSchema.optional(),
    fields: z.array(customFormFieldInputSchema).max(80).optional(),
    requireLocation: z.boolean().optional(),
    captureDateTime: z.boolean().optional(),
    capturePhotos: z.boolean().optional(),
    captureWeather: z.boolean().optional(),
    changeSummary: z.string().nullable().optional(),
  })
  .openapi('CustomFormMutationPayload');

const submissionLocationInputSchema = z.object({
  latitude: numericInputSchema.optional(),
  longitude: numericInputSchema.optional(),
  lat: numericInputSchema.optional(),
  lng: numericInputSchema.optional(),
  accuracyMeters: numericInputSchema.optional(),
  locationAccuracyMeters: numericInputSchema.optional(),
});

const weatherCaptureInputSchema = z.object({
  capturedAt: timestampInputSchema.nullable().optional(),
  source: z.string().nullable().optional(),
  temperatureCelsius: numericInputSchema.nullable().optional(),
  tempCelsius: numericInputSchema.nullable().optional(),
  humidityPct: numericInputSchema.nullable().optional(),
  windDirection: z.string().nullable().optional(),
  windSpeedKmh: numericInputSchema.nullable().optional(),
  windGustKmh: numericInputSchema.nullable().optional(),
  rainfallMm: numericInputSchema.nullable().optional(),
  summary: z.string().nullable().optional(),
});

const submissionBodySchema = z
  .object({
    formId: z.string().min(1),
    clientSubmissionId: z.string().max(160).optional(),
    clientRecordId: z.string().max(160).optional(),
    observedAt: timestampInputSchema.optional(),
    performedAt: timestampInputSchema.optional(),
    recordedAt: timestampInputSchema.optional(),
    location: submissionLocationInputSchema.optional(),
    latitude: numericInputSchema.optional(),
    longitude: numericInputSchema.optional(),
    lat: numericInputSchema.optional(),
    lng: numericInputSchema.optional(),
    accuracyMeters: numericInputSchema.optional(),
    locationAccuracyMeters: numericInputSchema.optional(),
    photoUrls: z.array(z.string()).max(20).optional(),
    photos: z.array(z.string()).max(20).optional(),
    weather: weatherCaptureInputSchema.optional(),
    values: z.record(z.unknown()).optional(),
    notes: z.string().nullable().optional(),
    device: deviceCaptureSchema.optional(),
  })
  .openapi('CustomFormSubmissionPayload');

const batchSubmissionBodySchema = submissionBodySchema
  .extend({
    clientSubmissionId: z.string().min(1).max(160),
  })
  .openapi('CustomFormBatchSubmissionPayload');

const submissionExportSchema = z
  .object({
    exportedAt: isoDateTime(),
    form: z.object({
      id: z.string(),
      title: z.string(),
      slug: z.string(),
      status: formStatusSchema,
      currentVersion: z.number().int(),
      schema: customFormDefinitionSchema,
      versionSchemas: z.array(
        z.object({
          version: z.number().int(),
          schema: customFormDefinitionSchema,
        })
      ),
    }),
    submissions: z.array(submissionSchema),
  })
  .openapi('CustomFormSubmissionsExport');

const submissionResultSchema = z.object({
  clientSubmissionId: z.string().nullable(),
  submissionId: z.string().nullable(),
  status: z.enum(['CREATED', 'DEDUPLICATED', 'REJECTED']),
  errorCode: z.string().nullable(),
  message: z.string(),
  issues: z.array(z.unknown()).optional(),
});

export const listCustomFormsContract = defineContract({
  method: 'get',
  path: '/api/custom-forms',
  summary: 'List custom forms (published only for submitters, all for managers)',
  tags: ['Custom Forms'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Custom forms', schema: z.object({ forms: z.array(formSchema) }) },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Feature not enabled' },
  },
  successStatus: 200,
});

export const createCustomFormContract = defineContract({
  method: 'post',
  path: '/api/custom-forms',
  summary: 'Create a custom form',
  tags: ['Custom Forms'],
  security: 'clerkSession',
  request: { body: formMutationBodySchema, bodyRequired: true },
  responses: {
    201: { description: 'Created form', schema: formSchema },
    400: { description: 'Validation failed' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Feature not enabled' },
    409: { description: 'Slug conflict' },
  },
  successStatus: 201,
});

export const getCustomFormContract = defineContract({
  method: 'get',
  path: '/api/custom-forms/{id}',
  summary: 'Get a custom form',
  tags: ['Custom Forms'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Custom form', schema: formSchema },
    401: { description: 'Unauthorized' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const updateCustomFormContract = defineContract({
  method: 'patch',
  path: '/api/custom-forms/{id}',
  summary: 'Update a custom form (creates a new version snapshot)',
  tags: ['Custom Forms'],
  security: 'clerkSession',
  request: {
    params: z.object({ id: z.string() }),
    body: formMutationBodySchema,
    bodyRequired: true,
  },
  responses: {
    200: { description: 'Updated form', schema: formSchema },
    400: { description: 'Validation failed' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
    409: { description: 'Slug or concurrent update conflict' },
  },
  successStatus: 200,
});

export const deleteCustomFormContract = defineContract({
  method: 'delete',
  path: '/api/custom-forms/{id}',
  summary: 'Delete a custom form and its submissions',
  tags: ['Custom Forms'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Deleted', schema: z.object({ success: z.boolean() }) },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const listCustomFormVersionsContract = defineContract({
  method: 'get',
  path: '/api/custom-forms/{id}/versions',
  summary: 'List version history for a custom form',
  tags: ['Custom Forms'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Versions', schema: z.object({ versions: z.array(versionSchema) }) },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const getCustomFormVersionContract = defineContract({
  method: 'get',
  path: '/api/custom-forms/{id}/versions/{versionId}',
  summary: 'Get a specific version snapshot of a custom form',
  tags: ['Custom Forms'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string(), versionId: z.string() }) },
  responses: {
    200: { description: 'Version snapshot', schema: versionSchema },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const rollbackCustomFormVersionContract = defineContract({
  method: 'post',
  path: '/api/custom-forms/{id}/versions/{versionId}/rollback',
  summary: 'Roll a form back by creating a new version from an old snapshot',
  tags: ['Custom Forms'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string(), versionId: z.string() }) },
  responses: {
    200: { description: 'Form after rollback', schema: formSchema },
    400: { description: 'Validation failed' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
    409: { description: 'Concurrent update conflict' },
  },
  successStatus: 200,
});

export const exportCustomFormSubmissionsContract = defineContract({
  method: 'get',
  path: '/api/custom-forms/{id}/submissions/export',
  summary: 'Export submissions for a form as CSV or JSON',
  tags: ['Custom Forms'],
  security: 'clerkSession',
  request: {
    params: z.object({ id: z.string() }),
    query: z.object({
      format: z.enum(['csv', 'json']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Submissions export',
      contents: {
        'text/csv': z.string(),
        'application/json': submissionExportSchema,
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const listCustomFormSubmissionsContract = defineContract({
  method: 'get',
  path: '/api/custom-forms/submissions',
  summary: 'List custom form submissions',
  tags: ['Custom Forms'],
  security: 'clerkSession',
  request: {
    query: z.object({
      formId: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Submissions',
      schema: z.object({ submissions: z.array(submissionSchema) }),
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Feature not enabled' },
  },
  successStatus: 200,
});

export const createCustomFormSubmissionContract = defineContract({
  method: 'post',
  path: '/api/custom-forms/submissions',
  summary: 'Submit a custom form response (idempotent via clientSubmissionId)',
  tags: ['Custom Forms'],
  security: 'clerkSession',
  request: { body: submissionBodySchema, bodyRequired: true },
  responses: {
    200: { description: 'Deduplicated (already synced)', schema: submissionResultSchema },
    201: { description: 'Submission created', schema: submissionResultSchema },
    400: { description: 'Validation failed', schema: submissionResultSchema },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
  successStatus: 201,
});

export const batchCreateCustomFormSubmissionsContract = defineContract({
  method: 'post',
  path: '/api/custom-forms/submissions/batch',
  summary: 'Sync up to 50 offline submissions in one request',
  tags: ['Custom Forms'],
  security: 'clerkSession',
  request: {
    body: z.object({ submissions: z.array(batchSubmissionBodySchema).min(1).max(50) }),
    bodyRequired: true,
  },
  responses: {
    200: {
      description: 'Per-record results in input order',
      schema: z.object({ results: z.array(submissionResultSchema) }),
    },
    400: { description: 'Invalid request body or submissions must contain 1-50 records' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Feature not enabled' },
  },
  successStatus: 200,
});
