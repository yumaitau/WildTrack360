import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

// Custom forms domain (ported from WildForm360). The wire shapes intentionally
// mirror WildForm360's mobile API so the iOS/Android clients can be ported
// against the same payloads: forms carry a JSON `schema` definition, and
// submissions sync idempotently via `clientSubmissionId`.

const formSchema = z.object({}).passthrough();
const versionSchema = z.object({}).passthrough();
const submissionSchema = z.object({}).passthrough();

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
  request: { body: z.object({}).passthrough() },
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
  request: { params: z.object({ id: z.string() }), body: z.object({}).passthrough() },
  responses: {
    200: { description: 'Updated form', schema: formSchema },
    400: { description: 'Validation failed' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
    409: { description: 'Slug conflict' },
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
    200: { description: 'Submissions export', content: 'text/csv' },
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
  request: { body: z.object({}).passthrough() },
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
    body: z.object({ submissions: z.array(z.object({}).passthrough()).min(1).max(50) }),
  },
  responses: {
    200: {
      description: 'Per-record results in input order',
      schema: z.object({ results: z.array(submissionResultSchema) }),
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Feature not enabled' },
  },
  successStatus: 200,
});
