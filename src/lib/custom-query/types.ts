// Shared types for the safe custom reporting query language (QL).
//
// The QL is intentionally tiny and read-only. It never executes SQL — user
// query text is parsed into a small AST, data is fetched through ordinary
// tenant-scoped Prisma calls, and aggregates are computed in application code
// over normalised rows. See ./parser.ts and ./evaluator.ts.

export type CustomQueryOperation = 'count' | 'sum';

export const CUSTOM_QUERY_VISUALIZATIONS = [
  'number',
  'table',
  'bar',
  'pie',
  'line',
] as const;

export type CustomQueryVisualization = (typeof CUSTOM_QUERY_VISUALIZATIONS)[number];

/** A parsed, validated query. Produced by parseCustomQuery. */
export interface CustomQueryAst {
  raw: string;
  operation: CustomQueryOperation;
  /** Numeric field to sum. Only present when operation === 'sum'. */
  metric?: string;
  source: string;
  /** Inclusive YYYY-MM-DD bounds from a `between` clause, if present. */
  between?: { start: string; end: string };
  where?: { field: string; value: string };
  groupBy?: string;
  trendBy?: string;
  limit?: number;
  visualization: CustomQueryVisualization;
}

/** A single normalised row: only allowlisted, sanitised scalar values. */
export type NormalizedRow = Record<string, string | number | boolean | null>;

export interface CustomQueryRow {
  label: string;
  value: number;
}

export interface CustomQuerySeries {
  label: string;
  rows: CustomQueryRow[];
}

/** Result DTO returned to the browser. Never contains raw records. */
export interface CustomQueryResult {
  query: string;
  ok: boolean;
  source?: string;
  operation?: CustomQueryOperation;
  metric?: string;
  groupBy?: string;
  trendBy?: string;
  visualization?: CustomQueryVisualization;
  value?: number;
  rows?: CustomQueryRow[];
  series?: CustomQuerySeries[];
  /** Non-fatal visual-fit suggestions for the workbench UI. */
  warnings?: string[];
  error?: string;
}

/** Thrown by the parser/evaluator for user-facing (safe) validation errors. */
export class CustomQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomQueryError';
  }
}
