// Shared types for the safe custom query language (QL).
//
// The QL is intentionally tiny. Query *text* is parsed into this small AST and
// is NEVER executed as SQL. The executor maps a validated AST onto a small set
// of allowlisted Prisma reads, always scoped to the caller's organisation.

export type QlOperator = '=' | '!=' | 'in';

export interface QlFilter {
  field: string;
  op: QlOperator;
  values: string[];
}

export type QlMetric =
  | { kind: 'count' }
  | { kind: 'sum'; field: string }
  | { kind: 'avg'; field: string };

export interface QueryAST {
  /** Allowlisted source key (e.g. "animals"). */
  source: string;
  /** AND-combined equality / membership filters. */
  filters: QlFilter[];
  /** Inclusive lower bound (YYYY-MM-DD) applied to the source's date field. */
  since?: string;
  /** Inclusive upper bound (YYYY-MM-DD) applied to the source's date field. */
  until?: string;
  /** Optional grouping dimension. When omitted a single total row is returned. */
  groupBy?: string;
  /** Aggregate metric. Defaults to count. */
  metric: QlMetric;
}

export interface ParseResult {
  ast: QueryAST | null;
  /** Human-readable parse error, or null when parsing succeeded. */
  error: string | null;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export interface QueryResultRow {
  /** Group label (the literal value of the groupBy field), or "All" when ungrouped. */
  group: string;
  /** Aggregated metric value for the group. */
  value: number;
}

export interface QueryResult {
  rows: QueryResultRow[];
  /** Column headers for table rendering: [groupLabel, metricLabel]. */
  columns: [string, string];
  /** True when the underlying read hit the row cap and results may be partial. */
  truncated: boolean;
  /** The resolved (capped) date window actually queried. */
  range: { since: string; until: string };
}
