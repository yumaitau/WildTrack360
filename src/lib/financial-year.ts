// Australian financial year helpers. The AU FY runs 1 July – 30 June; we key a
// year by the calendar year it ENDS in, so "FY end year 2026" = 1 Jul 2025 to
// 30 Jun 2026. Boundaries are stored in UTC but aligned to midnight in
// Australia/Sydney. FY rollover occurs outside daylight saving time, so the
// local boundary is always 30 Jun 14:00 UTC.

export interface DateRange {
  start: Date; // inclusive
  end: Date; // exclusive
}

export const MIN_FINANCIAL_YEAR_END = 1900;
export const MAX_FINANCIAL_YEAR_END = 2100;

export function financialYearRange(fyEndYear: number): DateRange {
  return {
    start: new Date(Date.UTC(fyEndYear - 1, 5, 30, 14, 0, 0, 0)),
    end: new Date(Date.UTC(fyEndYear, 5, 30, 14, 0, 0, 0)),
  };
}

// The FY end-year a given date falls in (July–December → next calendar year).
export function financialYearEndYear(d: Date): number {
  const year = d.getUTCFullYear();
  const boundary = Date.UTC(year, 5, 30, 14, 0, 0, 0);
  return d.getTime() >= boundary ? year + 1 : year;
}

export function parseFinancialYearEndYear(value: string | null | undefined): number | null {
  if (!value || !/^\d{4}$/.test(value)) return null;
  const year = Number.parseInt(value, 10);
  if (year < MIN_FINANCIAL_YEAR_END || year > MAX_FINANCIAL_YEAR_END) return null;
  return year;
}

// "1 July 2025 – 30 June 2026"
export function financialYearLabel(fyEndYear: number): string {
  return `1 July ${fyEndYear - 1} – 30 June ${fyEndYear}`;
}

// "2025–26"
export function financialYearShort(fyEndYear: number): string {
  return `${fyEndYear - 1}–${String(fyEndYear).slice(2)}`;
}
