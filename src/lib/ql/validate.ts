// Semantic validation for the safe query language.
//
// Validation is the security boundary: it confirms every source, field, filter,
// and metric the parsed AST references is explicitly allowlisted in sources.ts.
// Anything not described there (including the tenant scoping column) is rejected
// here, before any database read is attempted.

import type { QueryAST, ValidationResult } from './types';
import { SOURCES, getSource, getField } from './sources';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime());
}

export function validateQuery(ast: QueryAST): ValidationResult {
  const errors: string[] = [];

  const source = getSource(ast.source);
  if (!source) {
    return {
      ok: false,
      errors: [`Unknown source "${ast.source}". Allowed sources: ${Object.keys(SOURCES).join(', ')}.`],
    };
  }

  // ── group by ──
  if (ast.groupBy !== undefined) {
    const def = getField(ast.source, ast.groupBy);
    if (!def) {
      errors.push(`Unknown field "${ast.groupBy}" for source "${ast.source}".`);
    } else if (!def.groupable) {
      errors.push(`Field "${ast.groupBy}" cannot be used in "group by".`);
    }
  }

  // ── filters ──
  for (const filter of ast.filters) {
    const def = getField(ast.source, filter.field);
    if (!def) {
      errors.push(`Unknown field "${filter.field}" for source "${ast.source}".`);
      continue;
    }
    if (!def.filterable) {
      errors.push(`Field "${filter.field}" cannot be used in "where".`);
      continue;
    }
    if ((filter.op === '=' || filter.op === '!=') && filter.values.length !== 1) {
      errors.push(`Operator "${filter.op}" on "${filter.field}" expects a single value.`);
    }
    if (def.enumValues) {
      for (const value of filter.values) {
        if (!def.enumValues.includes(value)) {
          errors.push(
            `Invalid value "${value}" for "${filter.field}". Allowed: ${def.enumValues.join(', ')}.`
          );
        }
      }
    }
  }

  // ── metric ──
  if (ast.metric.kind === 'sum' || ast.metric.kind === 'avg') {
    const def = getField(ast.source, ast.metric.field);
    if (!def) {
      errors.push(`Unknown field "${ast.metric.field}" for source "${ast.source}".`);
    } else if (!def.summable) {
      errors.push(`Field "${ast.metric.field}" is not numeric and cannot be used with "${ast.metric.kind}".`);
    }
  }

  // ── date bounds ──
  if (ast.since !== undefined && !isValidDate(ast.since)) {
    errors.push(`Invalid "since" date "${ast.since}". Use YYYY-MM-DD.`);
  }
  if (ast.until !== undefined && !isValidDate(ast.until)) {
    errors.push(`Invalid "until" date "${ast.until}". Use YYYY-MM-DD.`);
  }
  if (
    ast.since !== undefined &&
    ast.until !== undefined &&
    isValidDate(ast.since) &&
    isValidDate(ast.until) &&
    ast.since > ast.until
  ) {
    errors.push('"since" must not be after "until".');
  }

  return { ok: errors.length === 0, errors };
}
