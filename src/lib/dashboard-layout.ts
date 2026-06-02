// src/lib/dashboard-layout.ts
//
// Pure helpers for the draggable dashboard widget system. All persistence is
// browser-local (localStorage); nothing here touches the database. Keeping the
// reconciliation logic here (rather than inside the React component) makes it
// unit-testable in the node test environment.

export type WidgetSize = "full" | "half";

export const ORDER_STORAGE_KEY = "wildtrack360.dashboard.order";
export const HIDDEN_STORAGE_KEY = "wildtrack360.dashboard.hidden";
export const SIZE_STORAGE_KEY = "wildtrack360.dashboard.sizes";
export const TREND_WINDOW_STORAGE_KEY = "wildtrack360.dashboard.trendWindow";

/** Allowed default trend timeframes, in weeks. */
export const TREND_WINDOW_OPTIONS = [4, 8, 12, 26] as const;
export type TrendWindow = (typeof TREND_WINDOW_OPTIONS)[number];
export const DEFAULT_TREND_WINDOW: TrendWindow = 8;

/**
 * Reconcile a stored widget order against the widgets that currently exist.
 *
 * - If no stored order exists, fall back to the server-provided order.
 * - Drop stored IDs that no longer correspond to a real widget (stale).
 * - Keep only the first occurrence of any duplicated ID.
 * - Append any new widgets (added since the order was saved) in their natural
 *   order so they show up automatically.
 */
export function reconcileOrder(
  stored: string[] | null | undefined,
  currentIds: string[],
): string[] {
  if (!stored) return [...currentIds];

  const currentSet = new Set(currentIds);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const id of stored) {
    if (currentSet.has(id) && !seen.has(id)) {
      result.push(id);
      seen.add(id);
    }
  }

  for (const id of currentIds) {
    if (!seen.has(id)) result.push(id);
  }

  return result;
}

/**
 * Filter stored hidden IDs down to those that still correspond to a real
 * widget, de-duplicating in the process.
 */
export function reconcileHidden(
  stored: string[] | null | undefined,
  currentIds: string[],
): string[] {
  if (!stored) return [];
  const currentSet = new Set(currentIds);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of stored) {
    if (currentSet.has(id) && !seen.has(id)) {
      result.push(id);
      seen.add(id);
    }
  }
  return result;
}

/**
 * Reconcile stored widget sizes: keep only entries for current widgets whose
 * value is a valid {@link WidgetSize}.
 */
export function reconcileSizes(
  stored: Record<string, unknown> | null | undefined,
  currentIds: string[],
): Record<string, WidgetSize> {
  const result: Record<string, WidgetSize> = {};
  if (!stored) return result;
  const currentSet = new Set(currentIds);
  for (const [id, value] of Object.entries(stored)) {
    if (!currentSet.has(id)) continue;
    if (value === "full" || value === "half") {
      result[id] = value;
    }
  }
  return result;
}

/** Coerce an arbitrary value to a valid trend window, falling back to default. */
export function validateTrendWindow(value: unknown): TrendWindow {
  const num = typeof value === "string" ? Number(value) : value;
  if (
    typeof num === "number" &&
    (TREND_WINDOW_OPTIONS as readonly number[]).includes(num)
  ) {
    return num as TrendWindow;
  }
  return DEFAULT_TREND_WINDOW;
}

/**
 * A multi-series time series, as produced by reporting queries. Each series has
 * a label and an array of `{ label, value }` points (label is typically a date
 * bucket).
 */
export type QuerySeries = Array<{
  label: string;
  rows: Array<{ label: string; value: number }>;
}>;

/**
 * Transform a {@link QuerySeries} into rows + series keys suitable for a
 * Recharts line chart. Buckets are taken from the union of every series' point
 * labels, sorted, and missing values are filled with 0 so lines stay continuous.
 */
export function buildTrendChartRows(series: QuerySeries) {
  const labels = Array.from(
    new Set(series.flatMap((item) => item.rows.map((row) => row.label))),
  ).sort((a, b) => a.localeCompare(b));

  const seriesKeys = series.map((item, index) => ({
    key: `series_${index}`,
    label: item.label,
  }));

  const chartRows = labels.map((label) => {
    const row: Record<string, string | number> = { label };
    series.forEach((item, index) => {
      row[`series_${index}`] =
        item.rows.find((value) => value.label === label)?.value ?? 0;
    });
    return row;
  });

  return { chartRows, seriesKeys };
}
