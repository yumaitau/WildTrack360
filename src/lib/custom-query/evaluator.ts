// ─── Safe custom QL evaluator ─────────────────────────────────────────────────
//
// Pipeline: parse → validate range → evaluate ONLY the one allowlisted source
// (tenant-scoped by clerkOrganizationId + bounded by the date window):
//   * Plain-column count/sum queries run as a single Prisma
//     `aggregate`/`groupBy` (see pushdown.ts) so no raw rows are materialised.
//   * Everything else (derived fields, trends) fetches rows, drops to safe
//     normalised rows, and filters/aggregates in memory.
//
// No SQL is constructed from user input. Field names are validated against
// the allowlist by the parser; the pushed-down path maps them to columns via
// the hand-maintained registry in pushdown.ts (values are Prisma filter
// parameters, never interpolated), and the in-memory path applies `where` to
// normalised rows in application code. Either way a user can never reference
// a raw column, relation or tenant id.

import {
  CustomQueryAst,
  CustomQueryError,
  CustomQueryResult,
  CustomQueryRow,
  CustomQuerySeries,
  NormalizedRow,
} from './types';
import { getCustomQuerySource, type CustomQuerySource } from './allowlist';
import { parseCustomQuery, getVisualFitWarnings } from './parser';
import { resolveQueryRange, type ResolvedRange } from './range';
import { planPushdown, executePushdown, supportsAggregation } from './pushdown';

/**
 * Minimal Prisma surface the evaluator needs (also satisfied by test fakes).
 * `aggregate`/`groupBy` are optional — when a delegate lacks them (e.g. a
 * simple fake), pushdown-eligible queries transparently use the findMany path.
 */
export interface QueryablePrisma {
  [model: string]: {
    findMany: (args: { where: Record<string, unknown> }) => Promise<unknown[]>;
    aggregate?: (args: unknown) => Promise<unknown>;
    groupBy?: (args: unknown) => Promise<unknown[]>;
  };
}

export interface EvaluateOptions {
  prisma: QueryablePrisma;
  /** Effective Clerk organisation (tenant) id — applied to every fetch. */
  orgId: string;
  defaultStart?: Date;
  defaultEnd?: Date;
  now?: Date;
  carerNamesById?: Record<string, string>;
}

function labelOf(value: NormalizedRow[string]): string {
  if (value === null || value === undefined) return 'Unknown';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  const s = String(value);
  return s.length === 0 ? 'Unknown' : s;
}

function matchesWhere(row: NormalizedRow, where: { field: string; value: string }): boolean {
  const actual = row[where.field];
  const expected = where.value;
  const expectedLower = expected.toLowerCase();

  if (actual === null || actual === undefined) {
    return expectedLower === 'null' || expectedLower === 'unknown';
  }
  if (typeof actual === 'boolean') {
    if (['true', 'yes', '1'].includes(expectedLower)) return actual === true;
    if (['false', 'no', '0'].includes(expectedLower)) return actual === false;
    return false;
  }
  if (typeof actual === 'number') {
    const n = Number(expected);
    return Number.isFinite(n) && n === actual;
  }
  return String(actual).toLowerCase() === expectedLower;
}

function valueOf(row: NormalizedRow, ast: CustomQueryAst): number {
  if (ast.operation === 'count') return 1;
  const raw = ast.metric ? row[ast.metric] : null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function aggregateGrouped(
  rows: NormalizedRow[],
  ast: CustomQueryAst,
  field: string
): CustomQueryRow[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = labelOf(row[field]);
    totals.set(key, (totals.get(key) ?? 0) + valueOf(row, ast));
  }
  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function aggregateTrend(
  rows: NormalizedRow[],
  ast: CustomQueryAst,
  field: string
): CustomQueryRow[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = labelOf(row[field]);
    totals.set(key, (totals.get(key) ?? 0) + valueOf(row, ast));
  }
  // Trend buckets are date keys (YYYY-MM-DD / YYYY-MM): lexical sort == chrono.
  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
}

function aggregateMultiSeries(
  rows: NormalizedRow[],
  ast: CustomQueryAst
): { rows: CustomQueryRow[]; series: CustomQuerySeries[] } {
  const groupField = ast.groupBy!;
  const trendField = ast.trendBy!;

  const bucketSet = new Set<string>();
  const groupTotals = new Map<string, number>();
  const grid = new Map<string, Map<string, number>>(); // group -> bucket -> value

  for (const row of rows) {
    const bucket = labelOf(row[trendField]);
    const group = labelOf(row[groupField]);
    const v = valueOf(row, ast);
    bucketSet.add(bucket);
    groupTotals.set(group, (groupTotals.get(group) ?? 0) + v);
    let byBucket = grid.get(group);
    if (!byBucket) {
      byBucket = new Map<string, number>();
      grid.set(group, byBucket);
    }
    byBucket.set(bucket, (byBucket.get(bucket) ?? 0) + v);
  }

  const buckets = [...bucketSet].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  let groups = [...groupTotals.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
  if (ast.limit !== undefined) groups = groups.slice(0, ast.limit);

  const series: CustomQuerySeries[] = groups.map((group) => {
    const byBucket = grid.get(group) ?? new Map<string, number>();
    return {
      label: group,
      rows: buckets.map((b) => ({ label: b, value: byBucket.get(b) ?? 0 })),
    };
  });

  // Top-level rows = totals per bucket across the (limited) series.
  const topRows: CustomQueryRow[] = buckets.map((b) => ({
    label: b,
    value: series.reduce((sum, s) => sum + (s.rows.find((r) => r.label === b)?.value ?? 0), 0),
  }));

  return { rows: topRows, series };
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function carerNameFor(id: unknown, carerNamesById?: Record<string, string>): string | null {
  if (typeof id !== 'string' || id.trim().length === 0) return null;
  return carerNamesById?.[id] ?? null;
}

function enrichReportRow(
  source: CustomQuerySource,
  row: Record<string, unknown>,
  options: EvaluateOptions
): Record<string, unknown> {
  if (source.model === 'animal') {
    const hasCarer = typeof row.carerId === 'string' && row.carerId.trim().length > 0;
    return {
      ...row,
      carerName:
        carerNameFor(row.carerId, options.carerNamesById) ?? (hasCarer ? 'Unknown carer' : null),
    };
  }

  if (source.model === 'animalTransfer') {
    const hasCarer = typeof row.toCarerId === 'string' && row.toCarerId.trim().length > 0;
    return {
      ...row,
      carerName:
        carerNameFor(row.toCarerId, options.carerNamesById) ??
        stringOrNull(row.receivingContactName) ??
        stringOrNull(row.receivingEntity) ??
        (hasCarer ? 'Unknown carer' : null),
    };
  }

  return row;
}

async function fetchNormalizedRows(
  source: CustomQuerySource,
  ast: CustomQueryAst,
  options: EvaluateOptions,
  range: ResolvedRange
): Promise<NormalizedRow[]> {
  const delegate = options.prisma[source.model];

  const raw = await delegate.findMany({
    where: {
      ...(source.baseWhere ?? {}),
      clerkOrganizationId: options.orgId,
      [source.dateField]: { gte: range.start, lte: range.end },
    },
  });

  return (raw as Record<string, unknown>[]).map((r) =>
    source.normalize(enrichReportRow(source, r, options))
  );
}

/**
 * Evaluate one query line and return an aggregate-only DTO.
 *
 * User-facing validation problems (parse errors, unknown sources/fields,
 * out-of-range dates) resolve to `{ ok: false, error }` so a multi-line preview
 * can report per-line failures without aborting. Unexpected errors are logged
 * server-side and surfaced as a generic message (no internals leak).
 */
export async function evaluateCustomQuery(
  rawQuery: string,
  options: EvaluateOptions
): Promise<CustomQueryResult> {
  let ast: CustomQueryAst;
  try {
    ast = parseCustomQuery(rawQuery);
  } catch (err) {
    return {
      query: rawQuery,
      ok: false,
      error: err instanceof CustomQueryError ? err.message : 'Invalid query.',
    };
  }

  try {
    const source = getCustomQuerySource(ast.source);
    if (!source) throw new CustomQueryError(`Unknown source "${ast.source}".`);

    const range = resolveQueryRange(ast.between, {
      defaultStart: options.defaultStart,
      defaultEnd: options.defaultEnd,
      now: options.now,
    });

    const delegate = options.prisma[source.model];
    if (!delegate || typeof delegate.findMany !== 'function') {
      throw new CustomQueryError(`Source "${ast.source}" is not available.`);
    }

    const base: CustomQueryResult = {
      query: ast.raw,
      ok: true,
      source: ast.source,
      operation: ast.operation,
      metric: ast.metric,
      groupBy: ast.groupBy,
      trendBy: ast.trendBy,
      visualization: ast.visualization,
      warnings: getVisualFitWarnings(ast),
    };

    // Plain-column count/sum queries run as one Prisma aggregation instead of
    // materialising rows. Derived fields, trends, and delegates without
    // aggregate/groupBy (simple fakes) use the in-memory path below.
    const plan = planPushdown(ast, source);
    if (plan && supportsAggregation(delegate)) {
      const { value, rows } = await executePushdown(plan, {
        delegate,
        orgId: options.orgId,
        range,
      });
      return { ...base, value, rows };
    }

    const rows = await fetchNormalizedRows(source, ast, options, range);
    const filtered = ast.where ? rows.filter((r) => matchesWhere(r, ast.where!)) : rows;

    // Multi-series line: group by + trend by.
    if (ast.groupBy && ast.trendBy) {
      const { rows: topRows, series } = aggregateMultiSeries(filtered, ast);
      return { ...base, rows: topRows, series };
    }

    // Trend only.
    if (ast.trendBy) {
      let trendRows = aggregateTrend(filtered, ast, ast.trendBy);
      if (ast.limit !== undefined) trendRows = trendRows.slice(-ast.limit);
      return { ...base, rows: trendRows };
    }

    // Group only.
    if (ast.groupBy) {
      let groupRows = aggregateGrouped(filtered, ast, ast.groupBy);
      if (ast.limit !== undefined) groupRows = groupRows.slice(0, ast.limit);
      const value = groupRows.reduce((sum, r) => sum + r.value, 0);
      return { ...base, value, rows: groupRows };
    }

    // Scalar total.
    const value = filtered.reduce((sum, r) => sum + valueOf(r, ast), 0);
    return {
      ...base,
      value,
      rows: [{ label: ast.metric ?? 'Total', value }],
    };
  } catch (err) {
    if (err instanceof CustomQueryError) {
      return { query: ast.raw, ok: false, error: err.message };
    }
    console.error('Custom query evaluation failed:', err);
    return { query: ast.raw, ok: false, error: 'Failed to evaluate query.' };
  }
}

/** Evaluate several query lines independently (used by the preview route). */
export async function evaluateCustomQueries(
  rawQueries: string[],
  options: EvaluateOptions
): Promise<CustomQueryResult[]> {
  return Promise.all(rawQueries.map((q) => evaluateCustomQuery(q, options)));
}
