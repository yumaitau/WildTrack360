// ─── Query range limits ───────────────────────────────────────────────────────
//
// Every Prisma read driven by the QL is bounded by a date window so a single
// report can never scan an unbounded history. The cap is applied to the inline
// `between` clause, UI-supplied report periods, dashboard widget timeframes and
// saved-query previews alike.

import { CustomQueryError } from './types';

export const MAX_CUSTOM_QUERY_RANGE_DAYS = 366;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ResolvedRange {
  start: Date;
  end: Date;
}

/** Parse a YYYY-MM-DD string into a UTC Date, or null if invalid. */
function parseIsoDate(value: string, endOfDay: boolean): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, mo, d] = match;
  const date = new Date(
    Date.UTC(
      Number(y),
      Number(mo) - 1,
      Number(d),
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0
    )
  );
  // Guard against rollover (e.g. 2026-02-31 → March).
  if (
    date.getUTCFullYear() !== Number(y) ||
    date.getUTCMonth() !== Number(mo) - 1 ||
    date.getUTCDate() !== Number(d)
  ) {
    return null;
  }
  return date;
}

function clampToCap(range: ResolvedRange): ResolvedRange {
  const spanDays = (range.end.getTime() - range.start.getTime()) / MS_PER_DAY;
  if (spanDays > MAX_CUSTOM_QUERY_RANGE_DAYS) {
    throw new CustomQueryError(
      `Date range cannot exceed ${MAX_CUSTOM_QUERY_RANGE_DAYS} days.`
    );
  }
  return range;
}

/**
 * Resolve the effective [start, end] window for a query.
 *
 * Precedence: inline `between` clause → caller-supplied default period →
 * a trailing one-year window ending now. The result is always validated and
 * capped to MAX_CUSTOM_QUERY_RANGE_DAYS.
 */
export function resolveQueryRange(
  between: { start: string; end: string } | undefined,
  options: { defaultStart?: Date; defaultEnd?: Date; now?: Date } = {}
): ResolvedRange {
  const now = options.now ?? new Date();

  if (between) {
    const start = parseIsoDate(between.start, false);
    const end = parseIsoDate(between.end, true);
    if (!start) throw new CustomQueryError(`Invalid start date "${between.start}".`);
    if (!end) throw new CustomQueryError(`Invalid end date "${between.end}".`);
    if (end.getTime() < start.getTime()) {
      throw new CustomQueryError('End date must be on or after the start date.');
    }
    return clampToCap({ start, end });
  }

  if (options.defaultStart && options.defaultEnd) {
    const { defaultStart: start, defaultEnd: end } = options;
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new CustomQueryError('Invalid report period.');
    }
    if (end.getTime() < start.getTime()) {
      throw new CustomQueryError('End date must be on or after the start date.');
    }
    return clampToCap({ start, end });
  }

  // Fallback: trailing one-year window.
  const end = now;
  const start = new Date(end.getTime() - MAX_CUSTOM_QUERY_RANGE_DAYS * MS_PER_DAY);
  return { start, end };
}
