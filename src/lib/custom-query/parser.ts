// ─── Safe custom QL parser ────────────────────────────────────────────────────
//
// Parses a single line of the tiny reporting grammar into a validated AST.
// It NEVER produces SQL. The grammar is fully anchored and deliberately small:
//
//   count from <source>
//   sum <numericField> from <source>
//   [between YYYY-MM-DD and YYYY-MM-DD]
//   [where <field> = <value>]
//   [group by <field>]
//   [trend by <dateBucketField>]
//   [limit N]            (1–2 digits)
//   [chart number|table|bar|pie|line]
//
// Anything not matched by the anchored regex below is rejected. There are no
// joins, boolean expressions, operators other than `=`, subqueries, ordering,
// raw field paths, or mutation verbs.

import {
  CustomQueryAst,
  CustomQueryError,
  CustomQueryVisualization,
} from './types';
import { getCustomQuerySource } from './allowlist';

const QUERY_RE =
  /^(count|sum\s+([A-Za-z][A-Za-z0-9_]*))\s+from\s+([a-z_]+)(?:\s+between\s+(\d{4}-\d{2}-\d{2})\s+and\s+(\d{4}-\d{2}-\d{2}))?(?:\s+where\s+([A-Za-z][A-Za-z0-9_]*)\s*=\s*("[^"]+"|'[^']+'|[^\s]+))?(?:\s+group\s+by\s+([A-Za-z][A-Za-z0-9_]*))?(?:\s+trend\s+by\s+([A-Za-z][A-Za-z0-9_]*))?(?:\s+limit\s+([0-9]{1,2}))?(?:\s+(?:as|chart)\s+(number|table|bar|pie|line))?$/i;

const MAX_LIMIT = 50;

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function inferVisualization(
  explicit: string | undefined,
  hasTrend: boolean,
  hasGroup: boolean
): CustomQueryVisualization {
  if (explicit) return explicit.toLowerCase() as CustomQueryVisualization;
  if (hasTrend) return 'line';
  if (hasGroup) return 'bar';
  return 'number';
}

/**
 * Parse + validate one query line. Throws CustomQueryError with a safe,
 * user-facing message on any problem.
 */
export function parseCustomQuery(input: string): CustomQueryAst {
  const raw = input.trim();
  if (!raw) throw new CustomQueryError('Query is empty.');

  // Collapse internal whitespace runs to single spaces for a forgiving match,
  // but reject newlines / control characters outright.
  if (/[\n\r\t]/.test(raw)) {
    throw new CustomQueryError('A query must be a single line.');
  }
  const normalized = raw.replace(/ {2,}/g, ' ');

  const m = QUERY_RE.exec(normalized);
  if (!m) {
    throw new CustomQueryError(
      'Could not parse query. Expected e.g. "count from incidents group by severity chart bar".'
    );
  }

  const [
    ,
    operationToken,
    sumField,
    sourceName,
    betweenStart,
    betweenEnd,
    whereField,
    whereValueRaw,
    groupBy,
    trendBy,
    limitRaw,
    chart,
  ] = m;

  const operation = operationToken.toLowerCase().startsWith('sum') ? 'sum' : 'count';

  // ── Source must be allowlisted ──
  const source = getCustomQuerySource(sourceName);
  if (!source) {
    throw new CustomQueryError(`Unknown source "${sourceName}".`);
  }

  // ── sum metric must be an allowlisted numeric field ──
  let metric: string | undefined;
  if (operation === 'sum') {
    metric = sumField;
    if (!metric || !source.fields.includes(metric)) {
      throw new CustomQueryError(
        `Unknown field "${metric ?? ''}" for source "${sourceName}".`
      );
    }
    if (!source.numericFields.includes(metric)) {
      throw new CustomQueryError(
        `Field "${metric}" is not numeric and cannot be summed.`
      );
    }
  }

  // ── where field must be allowlisted ──
  let where: CustomQueryAst['where'];
  if (whereField !== undefined) {
    if (!source.fields.includes(whereField)) {
      throw new CustomQueryError(
        `Unknown field "${whereField}" for source "${sourceName}".`
      );
    }
    where = { field: whereField, value: unquote(whereValueRaw ?? '') };
  }

  // ── group by field must be allowlisted ──
  if (groupBy !== undefined && !source.fields.includes(groupBy)) {
    throw new CustomQueryError(
      `Unknown field "${groupBy}" for source "${sourceName}".`
    );
  }

  // ── trend by field must be allowlisted ──
  if (trendBy !== undefined && !source.fields.includes(trendBy)) {
    throw new CustomQueryError(
      `Unknown field "${trendBy}" for source "${sourceName}".`
    );
  }

  // ── between dates ──
  let between: CustomQueryAst['between'];
  if (betweenStart && betweenEnd) {
    between = { start: betweenStart, end: betweenEnd };
  }

  // ── limit ──
  let limit: number | undefined;
  if (limitRaw !== undefined) {
    const n = Number.parseInt(limitRaw, 10);
    if (!Number.isFinite(n) || n <= 0) {
      throw new CustomQueryError('Limit must be a positive number.');
    }
    limit = Math.min(n, MAX_LIMIT);
  }

  return {
    raw,
    operation,
    metric,
    source: sourceName,
    between,
    where,
    groupBy,
    trendBy,
    limit,
    visualization: inferVisualization(chart, Boolean(trendBy), Boolean(groupBy)),
  };
}

/**
 * Non-fatal "does the chart suit the query?" suggestions for the workbench.
 * Returns an empty array when nothing looks off.
 */
export function getVisualFitWarnings(ast: CustomQueryAst): string[] {
  const warnings: string[] = [];
  const source = getCustomQuerySource(ast.source);

  if (ast.groupBy && ast.visualization === 'number') {
    warnings.push(
      'This query groups results — a table, bar or pie chart shows the breakdown better than a single number.'
    );
  }
  if (ast.visualization === 'line' && !ast.trendBy) {
    warnings.push('Line charts need a "trend by" field to plot over time.');
  }
  if (ast.trendBy && ast.visualization !== 'line') {
    warnings.push('This is a trend query — "chart line" usually reads best over time.');
  }
  if (ast.visualization === 'pie' && (ast.limit ?? 12) > 8 && ast.groupBy) {
    warnings.push('Pie charts get crowded with many groups — consider a bar chart or table, or add "limit".');
  }
  if (source?.snapshot && ast.trendBy) {
    warnings.push(
      `"${ast.source}" is a current snapshot, not an event history — trends reflect record dates, not changes over time. Use an event source (e.g. records, incidents) for true history.`
    );
  }
  return warnings;
}
