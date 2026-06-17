import { z } from 'zod';
import type { ZodOpenApiPathsObject } from 'zod-openapi';
import { errorResponses, ok200, created201 } from '../responses';

const SavedReportQuery = z
  .object({
    id: z.string(),
    name: z.string(),
    query: z.string().openapi({ description: 'Safe QL text validated by the custom-query parser.' }),
    visualization: z.enum(['table', 'number', 'bar', 'pie', 'line']),
    showOnDashboard: z.boolean(),
    createdByUserId: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'SavedReportQuery' });

const ReportQueryBody = z
  .object({
    name: z.string(),
    query: z.string(),
    visualization: z.enum(['table', 'number', 'bar', 'pie', 'line']).optional(),
    showOnDashboard: z.boolean().optional(),
  })
  .openapi({ ref: 'ReportQueryBody' });

const PreviewResult = z
  .object({
    columns: z.array(z.string()),
    rows: z.array(z.record(z.unknown())),
    rowCount: z.number().int(),
  })
  .openapi({ ref: 'PreviewResult' });

const DashboardWidget = z
  .object({
    id: z.string(),
    name: z.string(),
    visualization: z.string(),
    result: z.unknown(),
  })
  .openapi({ ref: 'DashboardWidget' });

const WallyResponse = z
  .object({
    reply: z.string(),
    tokensUsed: z.number().int().optional(),
  })
  .openapi({ ref: 'WallyResponse' });

const idParam = z.string().openapi({ param: { name: 'id', in: 'path' }, description: 'Resource ID.' });

export const reportsPaths: ZodOpenApiPathsObject = {

  // --- Carer contacts report ---
  '/api/reports/carer-contacts': {
    get: {
      tags: ['Reports'],
      summary: 'Export carer contact details (CSV or JSON)',
      operationId: 'getCarerContactsReport',
      requestParams: {
        query: z.object({
          format: z.enum(['csv', 'json']).optional().openapi({ description: 'Response format. Defaults to JSON.' }),
        }),
      },
      responses: {
        ...ok200(z.array(z.unknown()).openapi({ description: 'Carer contact rows (JSON default) or CSV when format=csv.' })),
        ...errorResponses(400, 401, 403),
      },
    },
  },

  // --- Map report ---
  '/api/reports/map': {
    get: {
      tags: ['Reports'],
      summary: 'Get geo-coordinates of active animals for the map view',
      operationId: 'getMapReport',
      responses: {
        ...ok200(z.array(z.unknown()).openapi({ description: 'Animal map entries with lat/lng.' })),
        ...errorResponses(400, 401, 500),
      },
    },
  },

  // --- Saved report queries ---
  '/api/report-queries': {
    get: {
      tags: ['Report Queries'],
      summary: 'List saved custom report queries for the organisation',
      operationId: 'listReportQueries',
      responses: {
        ...ok200(z.array(SavedReportQuery)),
        ...errorResponses(400, 401, 403, 500),
      },
    },
    post: {
      tags: ['Report Queries'],
      summary: 'Create a saved custom report query',
      operationId: 'createReportQuery',
      requestBody: {
        content: { 'application/json': { schema: ReportQueryBody } },
      },
      responses: {
        ...created201(SavedReportQuery),
        ...errorResponses(400, 401, 403, 500),
      },
    },
  },

  '/api/report-queries/{id}': {
    patch: {
      tags: ['Report Queries'],
      summary: 'Update a saved report query',
      operationId: 'updateReportQuery',
      requestParams: { path: z.object({ id: idParam }) },
      requestBody: {
        content: { 'application/json': { schema: ReportQueryBody.partial() } },
      },
      responses: {
        ...ok200(SavedReportQuery),
        ...errorResponses(400, 401, 403, 404, 500),
      },
    },
    delete: {
      tags: ['Report Queries'],
      summary: 'Delete a saved report query',
      operationId: 'deleteReportQuery',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(z.object({ ok: z.boolean() })),
        ...errorResponses(400, 401, 403, 404, 500),
      },
    },
  },

  '/api/report-queries/dashboard': {
    get: {
      tags: ['Report Queries'],
      summary: 'Run all dashboard-pinned report queries and return their results',
      operationId: 'getDashboardReports',
      responses: {
        ...ok200(z.array(DashboardWidget)),
        ...errorResponses(400, 401, 403, 500),
      },
    },
  },

  '/api/report-queries/preview': {
    post: {
      tags: ['Report Queries'],
      summary: 'Preview the result of a custom report query without saving it',
      operationId: 'previewReportQuery',
      requestBody: {
        content: {
          'application/json': {
            schema: z.object({ query: z.string() }),
          },
        },
      },
      responses: {
        ...ok200(PreviewResult),
        ...errorResponses(400, 401, 403, 500),
      },
    },
  },

  // --- Weather ---
  '/api/weather': {
    get: {
      tags: ['Weather'],
      summary: 'Get current weather for a coordinate pair via Google Weather API',
      operationId: 'getWeather',
      requestParams: {
        query: z.object({
          lat: z.string().openapi({ description: 'Latitude.' }),
          lng: z.string().openapi({ description: 'Longitude.' }),
        }),
      },
      responses: {
        ...ok200(z.unknown().openapi({ description: 'Google Weather API response mapped to app format.' })),
        ...errorResponses(400, 401, 403, 500, 502),
      },
    },
  },

  // --- Wally (AI assistant) ---
  '/api/wally': {
    post: {
      tags: ['Wally'],
      summary: 'Send a natural-language query to the Wally AI assistant',
      operationId: 'wallyChat',
      requestBody: {
        content: {
          'application/json': {
            schema: z.object({
              message: z.string(),
              conversationId: z.string().optional(),
            }),
          },
        },
      },
      responses: {
        ...ok200(WallyResponse),
        ...errorResponses(400, 401, 429, 500),
      },
    },
  },
};
