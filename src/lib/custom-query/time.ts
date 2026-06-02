// Timezone-aware date-bucket helpers for the custom QL.
//
// WildTrack360 is an Australian product; reporting buckets are computed in the
// Australia/Sydney zone so day/month boundaries match what carers expect. This
// mirrors the approach used by the Wally usage tracker.

export const CUSTOM_QUERY_TIME_ZONE = 'Australia/Sydney';

function partsInZone(date: Date): { year: string; month: string; day: string } | null {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: CUSTOM_QUERY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  if (!year || !month || !day) return null;
  return { year, month, day };
}

/** YYYY-MM-DD bucket key, or null for a null/invalid date. */
export function toDayKey(date: Date | null | undefined): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  const p = partsInZone(date);
  if (!p) return date.toISOString().slice(0, 10);
  return `${p.year}-${p.month}-${p.day}`;
}

/** YYYY-MM bucket key, or null for a null/invalid date. */
export function toMonthKey(date: Date | null | undefined): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  const p = partsInZone(date);
  if (!p) return date.toISOString().slice(0, 7);
  return `${p.year}-${p.month}`;
}
