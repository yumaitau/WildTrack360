/**
 * Per-route override map for fully dynamic status codes that the static extractor
 * cannot resolve from handler source literals (invariant #3c).
 *
 * Use this when a route's error status comes from a variable like `error.status`
 * (e.g. via a typed error class) rather than a literal integer.
 *
 * Structure: { openApiPath: { METHOD: number[] } }
 *
 * The report-queries routes use a local handleError(error) helper that returns
 * `status: error.status` where error is ReportAccessError (status: 400 | 401).
 * The extractor only scans the method body, not the helper, so these codes must
 * be recorded here.
 */
export const routeStatusOverrides: Record<string, Record<string, number[]>> = {
  // members/[id]/invite uses a lookup map `m.status` where m comes from a
  // Record<string, { status: number }> keyed by result type (400 | 404).
  '/api/members/{id}/invite': {
    POST: [400, 404],
  },
  '/api/report-queries': {
    GET: [400, 401],
    POST: [400, 401],
  },
  '/api/report-queries/{id}': {
    PATCH: [400, 401],
    DELETE: [400, 401],
  },
  '/api/report-queries/dashboard': {
    GET: [400, 401],
  },
  '/api/report-queries/preview': {
    POST: [400, 401],
  },
};
