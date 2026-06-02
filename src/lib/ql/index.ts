'server-only';

// High-level entry point: parse → validate → execute, tenant-scoped.
//
// This is the only function API routes should call. It guarantees the unsafe
// steps (parsing untrusted text, validating against the allowlist) always run
// before any organisation-scoped database read.

import type { QueryResult } from './types';
import { parseQuery } from './parser';
import { validateQuery } from './validate';
import { executeQuery } from './execute';

export class QueryError extends Error {
  constructor(
    message: string,
    readonly details: string[] = []
  ) {
    super(message);
    this.name = 'QueryError';
  }
}

/**
 * Parse, validate, and run a query against a single organisation's data.
 * Throws QueryError on parse/validation failure (never reaches the database).
 */
export async function runQuery(text: string, orgId: string, now?: Date): Promise<QueryResult> {
  const { ast, error } = parseQuery(text);
  if (!ast) throw new QueryError(error ?? 'Could not parse query.');

  const validation = validateQuery(ast);
  if (!validation.ok) throw new QueryError('Query is not valid.', validation.errors);

  return executeQuery(ast, orgId, { now });
}

export { parseQuery } from './parser';
export { validateQuery } from './validate';
export { SOURCES } from './sources';
export type { QueryResult, QueryAST } from './types';
