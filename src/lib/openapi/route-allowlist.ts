export type AllowlistMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface AllowlistEntry {
  path: string;
  method: AllowlistMethod;
}

// (path, method) pairs not yet migrated to the OpenAPI contract convention.
// The coverage gate (scripts/openapi-coverage.ts) requires every route method to
// be either contracted OR listed here. Regenerate with `npm run openapi:check -- --init`
// so this stays exactly the set of uncontracted routes; it drains to empty as
// Phase 1+ domains are migrated.
export const ROUTE_ALLOWLIST: AllowlistEntry[] = [

];
