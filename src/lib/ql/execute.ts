'server-only';

// Executor for the safe query language.
//
// A *validated* AST is mapped onto a single allowlisted Prisma `findMany`, which
// is ALWAYS scoped to the caller's organisation and ALWAYS time-bounded. Rows
// are then grouped and aggregated in memory. Query text never becomes SQL, and
// no field outside the sources allowlist is ever read.

import { prisma } from '@/lib/prisma';
import type { QueryAST, QueryResult, QueryResultRow, QlFilter } from './types';
import { getSource, getField, fieldValue, fieldReads, ROW_CAP } from './sources';
import type { FieldDef } from './sources';
import { resolveDateRange, formatDay } from './range';

/** Minimal shape of the Prisma client we depend on (eases testing). */
interface QueryClient {
  [model: string]: { findMany: (args: unknown) => Promise<Record<string, unknown>[]> };
}

interface ExecuteOptions {
  client?: QueryClient;
  now?: Date;
}

/** Coerce a "true"/"false" literal to a boolean for database filters. */
function coerce(value: string): string | boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

/** Build the Prisma `where` fragment for a direct-column filter. */
function pushDownFilter(column: string, filter: QlFilter): Record<string, unknown> {
  if (filter.op === 'in') {
    return { [column]: { in: filter.values.map(coerce) } };
  }
  const value = coerce(filter.values[0]);
  return filter.op === '!=' ? { [column]: { not: value } } : { [column]: value };
}

/** In-memory match for derived (non-column) filters. */
function rowMatches(def: FieldDef, filter: QlFilter, row: Record<string, unknown>): boolean {
  const actual = fieldValue(def, row);
  const a = actual === null || actual === undefined ? null : String(actual);
  if (filter.op === '=') return a === filter.values[0];
  if (filter.op === '!=') return a !== filter.values[0];
  return a !== null && filter.values.includes(a);
}

function metricLabel(ast: QueryAST, source: ReturnType<typeof getSource>): string {
  if (ast.metric.kind === 'count') return 'Count';
  const field = source!.fields[ast.metric.field];
  const name = field?.label ?? ast.metric.field;
  return ast.metric.kind === 'sum' ? `Sum of ${name}` : `Average ${name}`;
}

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function executeQuery(ast: QueryAST, orgId: string, options: ExecuteOptions = {}): Promise<QueryResult> {
  const source = getSource(ast.source);
  if (!source) throw new Error(`Unknown source "${ast.source}".`);
  if (!orgId) throw new Error('Organisation is required.');

  const client = (options.client ?? (prisma as unknown as QueryClient)) as QueryClient;
  const { since, until } = resolveDateRange(ast.since, ast.until, options.now);

  // ── Determine the columns we must read (allowlisted only) ──
  const reads = new Set<string>([source.dateField]);
  const groupDef = ast.groupBy ? getField(ast.source, ast.groupBy) : undefined;
  if (groupDef) fieldReads(groupDef).forEach((c) => reads.add(c));
  if (ast.metric.kind !== 'count') {
    const metricDef = getField(ast.source, ast.metric.field);
    if (metricDef) fieldReads(metricDef).forEach((c) => reads.add(c));
  }
  for (const filter of ast.filters) {
    const def = getField(ast.source, filter.field);
    if (def) fieldReads(def).forEach((c) => reads.add(c));
  }

  // ── Build the tenant- and time-scoped where clause ──
  const where: Record<string, unknown> = {
    clerkOrganizationId: orgId,
    [source.dateField]: { gte: since, lte: until },
  };
  const inMemoryFilters: { def: FieldDef; filter: QlFilter }[] = [];
  for (const filter of ast.filters) {
    const def = getField(ast.source, filter.field);
    if (!def) continue; // unreachable for validated ASTs
    if (def.column) {
      Object.assign(where, pushDownFilter(def.column, filter));
    } else {
      inMemoryFilters.push({ def, filter });
    }
  }

  const select = Object.fromEntries([...reads].map((c) => [c, true]));
  const rows = await client[source.model].findMany({
    where,
    select,
    take: ROW_CAP + 1,
  });

  const truncated = rows.length > ROW_CAP;
  const considered = truncated ? rows.slice(0, ROW_CAP) : rows;

  // ── Group + aggregate in memory ──
  const sums = new Map<string, number>();
  const counts = new Map<string, number>();

  for (const row of considered) {
    if (!inMemoryFilters.every(({ def, filter }) => rowMatches(def, filter, row))) continue;

    const rawKey = groupDef ? fieldValue(groupDef, row) : 'All';
    const key = rawKey === null || rawKey === undefined || rawKey === '' ? '(none)' : String(rawKey);

    counts.set(key, (counts.get(key) ?? 0) + 1);

    if (ast.metric.kind !== 'count') {
      const metricDef = getField(ast.source, ast.metric.field)!;
      const v = fieldValue(metricDef, row);
      if (typeof v === 'number' && !Number.isNaN(v)) {
        sums.set(key, (sums.get(key) ?? 0) + v);
      }
    }
  }

  let resultRows: QueryResultRow[] = [...counts.keys()].map((group) => {
    if (ast.metric.kind === 'count') return { group, value: counts.get(group) ?? 0 };
    const sum = sums.get(group) ?? 0;
    if (ast.metric.kind === 'sum') return { group, value: sum };
    const n = counts.get(group) ?? 0;
    return { group, value: n === 0 ? 0 : Math.round((sum / n) * 100) / 100 };
  });

  // Month buckets read best chronologically; everything else by descending value.
  const allMonths = resultRows.length > 0 && resultRows.every((r) => MONTH_RE.test(r.group));
  resultRows = allMonths
    ? resultRows.sort((a, b) => a.group.localeCompare(b.group))
    : resultRows.sort((a, b) => b.value - a.value || a.group.localeCompare(b.group));

  return {
    rows: resultRows,
    columns: [groupDef?.label ?? 'Total', metricLabel(ast, source)],
    truncated,
    range: { since: formatDay(since), until: formatDay(until) },
  };
}
