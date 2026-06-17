import 'zod-openapi/extend';
import { z } from 'zod';
import type { ZodOpenApiResponsesObject } from 'zod-openapi';

/** Uniform error envelope used across all 4xx/5xx responses. */
export const ErrorResponse = z
  .object({ error: z.string() })
  .openapi({ ref: 'ErrorResponse', description: 'Error response envelope' });

/** All status codes the API surfaces. */
export type ErrorStatusCode = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502 | 503;

const ERROR_DESCRIPTIONS: Record<ErrorStatusCode, string> = {
  400: 'Bad request - invalid input',
  401: 'Unauthorized - missing or invalid session',
  403: 'Forbidden - insufficient role or permission',
  404: 'Not found',
  409: 'Conflict - duplicate or constraint violation',
  422: 'Unprocessable entity - validation failed',
  429: 'Too many requests - rate limited',
  500: 'Internal server error',
  502: 'Bad gateway - upstream service error',
  503: 'Service unavailable',
};

/**
 * Build a responses object for the given error status codes.
 * Usage: errorResponses(400, 401, 403, 500)
 */
export function errorResponses(...codes: ErrorStatusCode[]): ZodOpenApiResponsesObject {
  const result: ZodOpenApiResponsesObject = {};
  for (const code of codes) {
    result[String(code) as `${4 | 5}${string}`] = {
      description: ERROR_DESCRIPTIONS[code],
      content: { 'application/json': { schema: ErrorResponse } },
    };
  }
  return result;
}

/** 200 OK with a JSON body schema. */
export function ok200(schema: z.ZodTypeAny, description = 'Success'): ZodOpenApiResponsesObject {
  return {
    '200': {
      description,
      content: { 'application/json': { schema } },
    },
  };
}

/** 201 Created with a JSON body schema. */
export function created201(schema: z.ZodTypeAny, description = 'Created'): ZodOpenApiResponsesObject {
  return {
    '201': {
      description,
      content: { 'application/json': { schema } },
    },
  };
}

/** 200 OK with CSV content type (for export endpoints). */
export function csv200(description = 'CSV export'): ZodOpenApiResponsesObject {
  return {
    '200': {
      description,
      content: {
        'text/csv': {
          schema: z.string().openapi({ description: 'CSV file content' }),
        },
      },
    },
  };
}

/** 307 Temporary Redirect (NextResponse.redirect default). */
export function redirect307(description = 'Temporary redirect'): ZodOpenApiResponsesObject {
  return {
    '307': {
      description,
    },
  };
}

/** Merge multiple ZodOpenApiResponsesObject maps into one. */
export function mergeResponses(
  ...maps: ZodOpenApiResponsesObject[]
): ZodOpenApiResponsesObject {
  return Object.assign({}, ...maps);
}
