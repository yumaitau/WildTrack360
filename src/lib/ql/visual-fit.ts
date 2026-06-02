// Heuristics that explain when a chosen chart type is a poor fit for a result.
//
// Pure and dependency-free so it can be unit tested and shared by the workbench
// (live guidance) and the dashboard widgets (sanity checks).

import type { ChartType } from './sources';
import type { QueryResult } from './types';

const MONTH_RE = /^\d{4}-\d{2}$/;

/** Returns a human-readable warning, or null when the chart suits the result. */
export function visualFitWarning(chartType: ChartType, result: Pick<QueryResult, 'rows'>): string | null {
  const rows = result.rows;
  const n = rows.length;

  switch (chartType) {
    case 'table':
      return null;

    case 'number':
      if (n > 1) {
        return `A number card shows a single value, but this result has ${n} rows. Use a bar chart or table instead.`;
      }
      return null;

    case 'pie':
      if (n < 2) {
        return 'Pie charts compare parts of a whole — group by a field so there is more than one slice.';
      }
      if (n > 8) {
        return `Pie charts get hard to read past ~8 slices (this has ${n}). A bar chart will read more clearly.`;
      }
      if (rows.some((r) => r.value < 0)) {
        return 'Pie charts cannot represent negative values. Use a bar chart instead.';
      }
      return null;

    case 'line':
      if (n < 2) {
        return 'Line charts need at least two points. Group by a month field to plot a trend.';
      }
      if (!rows.every((r) => MONTH_RE.test(r.group))) {
        return 'Line charts read best over time. Group by a month field (e.g. foundMonth) for a meaningful trend.';
      }
      return null;

    case 'bar':
      if (n < 1) return null;
      if (n > 30) {
        return `That is a lot of bars (${n}). Consider filtering or grouping differently for readability.`;
      }
      return null;

    default:
      return null;
  }
}
