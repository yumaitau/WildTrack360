import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

const SavedQuerySchema = z.object({}).passthrough().openapi('SavedReportQuery');

const CreateQuerySchema = z
  .object({
    name: z.string().min(1).max(120),
    query: z.string().min(1).max(500),
    visualization: z.string().optional(),
    showOnDashboard: z.boolean().optional(),
  })
  .openapi('SavedQueryCreate');

const PatchQuerySchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    query: z.string().min(1).max(500).optional(),
    visualization: z.string().optional(),
    showOnDashboard: z.boolean().optional(),
  })
  .openapi('SavedQueryPatch');

const DashboardWidgetsSchema = z
  .object({ widgets: z.array(z.object({}).passthrough()) })
  .openapi('DashboardWidgets');

const PreviewBodySchema = z
  .object({
    query: z.string().optional(),
    queries: z.array(z.string()).optional(),
    start: z.string().optional(),
    end: z.string().optional(),
  })
  .openapi('ReportPreviewBody');

const PreviewResultSchema = z
  .object({ results: z.array(z.object({}).passthrough()) })
  .openapi('ReportPreviewResult');

export const listQueriesContract = defineContract({
  method: 'get',
  path: '/api/report-queries',
  summary: 'List saved report queries',
  tags: ['ReportQueries'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Query list', schema: z.array(SavedQuerySchema) },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
  successStatus: 200,
});

export const createQueryContract = defineContract({
  method: 'post',
  path: '/api/report-queries',
  summary: 'Create a saved report query',
  tags: ['ReportQueries'],
  security: 'clerkSession',
  request: { body: CreateQuerySchema },
  responses: {
    201: { description: 'Created query', schema: SavedQuerySchema },
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
  successStatus: 201,
});

export const updateQueryContract = defineContract({
  method: 'patch',
  path: '/api/report-queries/{id}',
  summary: 'Update a saved report query',
  tags: ['ReportQueries'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }).openapi('QueryId'), body: PatchQuerySchema },
  responses: {
    200: { description: 'Updated query', schema: SavedQuerySchema },
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const deleteQueryContract = defineContract({
  method: 'delete',
  path: '/api/report-queries/{id}',
  summary: 'Delete a saved report query',
  tags: ['ReportQueries'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Deleted', schema: z.object({ ok: z.boolean() }).openapi('QueryDeleted') },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const dashboardWidgetsContract = defineContract({
  method: 'get',
  path: '/api/report-queries/dashboard',
  summary: 'Get dashboard widgets (evaluated saved queries)',
  tags: ['ReportQueries'],
  security: 'clerkSession',
  request: {
    query: z.object({ start: z.string().optional(), end: z.string().optional() }),
  },
  responses: {
    200: { description: 'Dashboard widgets', schema: DashboardWidgetsSchema },
    401: { description: 'Unauthorized' },
  },
  successStatus: 200,
});

export const previewReportContract = defineContract({
  method: 'post',
  path: '/api/report-queries/preview',
  summary: 'Preview one or more report queries',
  tags: ['ReportQueries'],
  security: 'clerkSession',
  request: { body: PreviewBodySchema },
  responses: {
    200: { description: 'Preview results', schema: PreviewResultSchema },
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
  successStatus: 200,
});
