// ─── Database push-down for plain-column custom queries ──────────────────────
//
// Plain-column count/sum queries are translated into a single Prisma
// `aggregate`/`groupBy` call so the evaluator never materialises raw rows in
// memory for them. Anything derived in a source's `normalize` projection
// (day/month buckets, `has*` text flags, `carerName`, `expired`,
// `released`/`deceased`) still uses the in-memory path in evaluator.ts.
//
// SAFETY: this does not weaken the "no SQL from user input" rule. The parser
// has already validated every field name against the allowlist, and the
// mapping from QL field → Prisma column below is a hand-maintained registry —
// user text never names a raw column, and values are passed as Prisma filter
// parameters, never interpolated. Tenant scoping (`clerkOrganizationId`) and
// the date window are applied exactly as in the findMany path.
//
// PARITY: for the same rows, a pushed-down query must produce a result
// deep-equal to the in-memory evaluator's. The field specs therefore mirror
// the exact `normalize` + `labelOf` + `matchesWhere` semantics: null/empty
// group labels become 'Unknown' (and merge with literal 'Unknown' strings),
// booleans label as Yes/No, `where field = null|unknown` matches null rows,
// string matching is case-insensitive, and numeric `where` compares parsed
// numbers. pushdown.test.ts enforces this against the in-memory path.

import { AnimalStatus, IncidentSeverity, RecordType, ReleaseType, AssetStatus } from '@prisma/client';
import type { CustomQueryAst, CustomQueryRow } from './types';
import type { CustomQuerySource, CustomQuerySourceName } from './allowlist';
import type { ResolvedRange } from './range';

type PushdownFieldSpec =
  /** Non-null enum column. `where` matches enum values case-insensitively. */
  | { kind: 'enum'; column: string; values: readonly string[] }
  /** Text column (nullable or not). Null/empty label as 'Unknown'. */
  | { kind: 'string'; column: string }
  /** Non-null boolean column. Labels Yes/No; `where` accepts true/yes/1, false/no/0. */
  | { kind: 'boolean'; column: string }
  /** Nullable numeric column. Null sums as 0 and labels as 'Unknown'. */
  | { kind: 'number'; column: string }
  /** JS projection is `column != null` — usable in `where` only. */
  | { kind: 'presence'; column: string };

const PUSHDOWN_FIELDS: Record<CustomQuerySourceName, Record<string, PushdownFieldSpec>> = {
  animals: {
    species: { kind: 'string', column: 'species' },
    status: { kind: 'enum', column: 'status', values: Object.values(AnimalStatus) },
    sex: { kind: 'string', column: 'sex' },
    ageClass: { kind: 'string', column: 'ageClass' },
    outcome: { kind: 'string', column: 'outcome' },
    weightGrams: { kind: 'number', column: 'initialWeightGrams' },
    hasCarer: { kind: 'presence', column: 'carerId' },
  },
  animal_assignments: {
    hasPreviousCarer: { kind: 'presence', column: 'fromCarerId' },
  },
  incidents: {
    type: { kind: 'string', column: 'type' },
    severity: { kind: 'enum', column: 'severity', values: Object.values(IncidentSeverity) },
    resolved: { kind: 'boolean', column: 'resolved' },
    hasAnimal: { kind: 'presence', column: 'animalId' },
  },
  hygiene_logs: {
    type: { kind: 'string', column: 'type' },
    completed: { kind: 'boolean', column: 'completed' },
    enclosureCleaned: { kind: 'boolean', column: 'enclosureCleaned' },
    ppeUsed: { kind: 'boolean', column: 'ppeUsed' },
    handwashAvailable: { kind: 'boolean', column: 'handwashAvailable' },
    feedingBowlsDisinfected: { kind: 'boolean', column: 'feedingBowlsDisinfected' },
  },
  carer_training: {
    trainingType: { kind: 'string', column: 'trainingType' },
    provider: { kind: 'string', column: 'provider' },
    trainingHours: { kind: 'number', column: 'trainingHours' },
  },
  records: {
    type: { kind: 'enum', column: 'type', values: Object.values(RecordType) },
  },
  release_checklists: {
    releaseType: { kind: 'enum', column: 'releaseType', values: Object.values(ReleaseType) },
    completed: { kind: 'boolean', column: 'completed' },
    within10km: { kind: 'boolean', column: 'within10km' },
  },
  post_release_monitoring: {
    animalCondition: { kind: 'string', column: 'animalCondition' },
  },
  assets: {
    type: { kind: 'string', column: 'type' },
    status: { kind: 'enum', column: 'status', values: Object.values(AssetStatus) },
  },
};

const IMPOSSIBLE = Symbol('impossible-where');

type PrismaWhere = Record<string, unknown>;

export interface PushdownPlan {
  ast: CustomQueryAst;
  source: CustomQuerySource;
  /** Translated `where`; IMPOSSIBLE means no row can match (skip the DB). */
  qlWhere: PrismaWhere | typeof IMPOSSIBLE | null;
  metricSpec: PushdownFieldSpec | null;
  groupSpec: PushdownFieldSpec | null;
}

/**
 * Decide whether a parsed query can run as one Prisma aggregation. Returns
 * null when any referenced field is derived in JS (the caller falls back to
 * the in-memory path).
 */
export function planPushdown(ast: CustomQueryAst, source: CustomQuerySource): PushdownPlan | null {
  // Trend buckets are timezone-derived day/month keys — always in-memory.
  if (ast.trendBy) return null;

  const fields = PUSHDOWN_FIELDS[ast.source as CustomQuerySourceName];
  if (!fields) return null;

  let metricSpec: PushdownFieldSpec | null = null;
  if (ast.operation === 'sum') {
    if (!ast.metric) return null;
    const spec = fields[ast.metric];
    if (spec?.kind !== 'number') return null;
    metricSpec = spec;
  }

  let groupSpec: PushdownFieldSpec | null = null;
  if (ast.groupBy) {
    const spec = fields[ast.groupBy];
    if (!spec || spec.kind === 'presence') return null;
    groupSpec = spec;
  }

  let qlWhere: PushdownPlan['qlWhere'] = null;
  if (ast.where) {
    const spec = fields[ast.where.field];
    if (!spec) return null;
    qlWhere = translateWhere(spec, ast.where.value);
  }

  return { ast, source, qlWhere, metricSpec, groupSpec };
}

function translateWhere(spec: PushdownFieldSpec, value: string): PrismaWhere | typeof IMPOSSIBLE {
  const lower = value.toLowerCase();
  const isNullToken = lower === 'null' || lower === 'unknown';

  switch (spec.kind) {
    case 'string':
      // A null row matches the null/unknown tokens; a literal 'null' /
      // 'Unknown' string value matches them too (case-insensitive compare).
      return isNullToken
        ? { OR: [{ [spec.column]: null }, { [spec.column]: { equals: value, mode: 'insensitive' } }] }
        : { [spec.column]: { equals: value, mode: 'insensitive' } };
    case 'enum': {
      const match = spec.values.find((v) => v.toLowerCase() === lower);
      return match ? { [spec.column]: match } : IMPOSSIBLE;
    }
    case 'boolean':
      if (['true', 'yes', '1'].includes(lower)) return { [spec.column]: true };
      if (['false', 'no', '0'].includes(lower)) return { [spec.column]: false };
      return IMPOSSIBLE;
    case 'presence':
      if (['true', 'yes', '1'].includes(lower)) return { [spec.column]: { not: null } };
      if (['false', 'no', '0'].includes(lower)) return { [spec.column]: null };
      return IMPOSSIBLE;
    case 'number': {
      if (isNullToken) return { [spec.column]: null };
      const n = Number(value);
      return Number.isFinite(n) ? { [spec.column]: n } : IMPOSSIBLE;
    }
  }
}

export interface PushdownDbArgs {
  kind: 'aggregate' | 'groupBy';
  args: {
    by?: string[];
    where: { AND: PrismaWhere[] };
    _count: Record<string, boolean>;
    _sum?: Record<string, boolean>;
  };
}

export function buildPushdownArgs(
  plan: PushdownPlan,
  options: { orgId: string; range: ResolvedRange }
): PushdownDbArgs {
  // Fail closed: an impossible filter means "no rows", never "all rows".
  // Callers must short-circuit to an empty result (as executePushdown does)
  // instead of building args without the QL filter.
  if (plan.qlWhere === IMPOSSIBLE) {
    throw new Error('Cannot build pushdown args for an impossible filter; skip the query instead.');
  }

  const clauses: PrismaWhere[] = [
    ...(plan.source.baseWhere ? [plan.source.baseWhere] : []),
    { clerkOrganizationId: options.orgId },
    { [plan.source.dateField]: { gte: options.range.start, lte: options.range.end } },
    ...(plan.qlWhere ? [plan.qlWhere] : []),
  ];

  return {
    kind: plan.groupSpec ? 'groupBy' : 'aggregate',
    args: {
      ...(plan.groupSpec ? { by: [plan.groupSpec.column] } : {}),
      where: { AND: clauses },
      _count: { _all: true },
      ...(plan.metricSpec ? { _sum: { [plan.metricSpec.column]: true } } : {}),
    },
  };
}

interface DbCounts {
  _count?: { _all?: number };
  _sum?: Record<string, number | null | undefined>;
}
type DbGroupRow = DbCounts & Record<string, unknown>;

export interface AggregatingDelegate {
  aggregate: (args: unknown) => Promise<unknown>;
  groupBy: (args: unknown) => Promise<unknown[]>;
}

export function supportsAggregation(delegate: unknown): delegate is AggregatingDelegate {
  return (
    typeof delegate === 'object' &&
    delegate !== null &&
    typeof (delegate as AggregatingDelegate).aggregate === 'function' &&
    typeof (delegate as AggregatingDelegate).groupBy === 'function'
  );
}

/** Mirrors the in-memory evaluator's `labelOf` for a raw column value. */
function labelForGroupKey(value: unknown): string {
  if (value === null || value === undefined) return 'Unknown';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  const s = String(value);
  return s.length === 0 ? 'Unknown' : s;
}

function valueOfCounts(plan: PushdownPlan, counts: DbCounts): number {
  if (plan.metricSpec) return counts._sum?.[plan.metricSpec.column] ?? 0;
  return counts._count?._all ?? 0;
}

export async function executePushdown(
  plan: PushdownPlan,
  options: { delegate: AggregatingDelegate; orgId: string; range: ResolvedRange }
): Promise<{ value: number; rows: CustomQueryRow[] }> {
  if (plan.groupSpec) {
    const groups =
      plan.qlWhere === IMPOSSIBLE
        ? []
        : ((await options.delegate.groupBy(
            buildPushdownArgs(plan, options).args
          )) as DbGroupRow[]);

    // Distinct column values can share a projected label (null and '' both
    // label 'Unknown', merging with literal 'Unknown' strings) — accumulate
    // per label exactly as the in-memory Map does.
    const totals = new Map<string, number>();
    for (const group of groups) {
      const label = labelForGroupKey(group[plan.groupSpec.column]);
      totals.set(label, (totals.get(label) ?? 0) + valueOfCounts(plan, group));
    }
    let rows = [...totals.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
    if (plan.ast.limit !== undefined) rows = rows.slice(0, plan.ast.limit);
    return { value: rows.reduce((sum, r) => sum + r.value, 0), rows };
  }

  const counts =
    plan.qlWhere === IMPOSSIBLE
      ? {}
      : ((await options.delegate.aggregate(buildPushdownArgs(plan, options).args)) as DbCounts);
  const value = valueOfCounts(plan, counts);
  return { value, rows: [{ label: plan.ast.metric ?? 'Total', value }] };
}
