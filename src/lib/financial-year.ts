// Australian financial year helpers. The AU FY runs 1 July – 30 June; we key a
// year by the calendar year it ENDS in, so "FY end year 2026" = 1 Jul 2025 to
// 30 Jun 2026. Boundaries are computed in UTC for determinism across servers.

export interface DateRange {
  start: Date; // inclusive
  end: Date; // exclusive
}

export function financialYearRange(fyEndYear: number): DateRange {
  return {
    start: new Date(Date.UTC(fyEndYear - 1, 6, 1, 0, 0, 0, 0)), // 1 July prev year
    end: new Date(Date.UTC(fyEndYear, 6, 1, 0, 0, 0, 0)), // 1 July this year (exclusive)
  };
}

// The FY end-year a given date falls in (July–December → next calendar year).
export function financialYearEndYear(d: Date): number {
  return d.getUTCMonth() >= 6 ? d.getUTCFullYear() + 1 : d.getUTCFullYear();
}

// "1 July 2025 – 30 June 2026"
export function financialYearLabel(fyEndYear: number): string {
  return `1 July ${fyEndYear - 1} – 30 June ${fyEndYear}`;
}

// "2025–26"
export function financialYearShort(fyEndYear: number): string {
  return `${fyEndYear - 1}–${String(fyEndYear).slice(2)}`;
}
