import { describe, expect, it } from 'vitest';
import {
  financialYearEndYear,
  financialYearLabel,
  parseFinancialYearEndYear,
  financialYearRange,
  financialYearShort,
} from './financial-year';

describe('financialYearRange', () => {
  it('runs 1 July Sydney time (prev year) to 1 July Sydney time (exclusive)', () => {
    const { start, end } = financialYearRange(2026);
    expect(start.toISOString()).toBe('2025-06-30T14:00:00.000Z');
    expect(end.toISOString()).toBe('2026-06-30T14:00:00.000Z');
  });
});

describe('financialYearEndYear', () => {
  it('maps July–December to the next calendar year', () => {
    expect(financialYearEndYear(new Date('2025-06-30T14:00:00Z'))).toBe(2026);
    expect(financialYearEndYear(new Date('2025-12-31T23:59:59Z'))).toBe(2026);
  });
  it('maps January–June to the same calendar year', () => {
    expect(financialYearEndYear(new Date('2026-01-01T00:00:00Z'))).toBe(2026);
    expect(financialYearEndYear(new Date('2026-06-30T13:59:59Z'))).toBe(2026);
  });
});

describe('parseFinancialYearEndYear', () => {
  it('accepts bounded four-digit financial years only', () => {
    expect(parseFinancialYearEndYear('2026')).toBe(2026);
    expect(parseFinancialYearEndYear('2026abc')).toBeNull();
    expect(parseFinancialYearEndYear('999999')).toBeNull();
    expect(parseFinancialYearEndYear('1899')).toBeNull();
    expect(parseFinancialYearEndYear('2101')).toBeNull();
  });
});

describe('labels', () => {
  it('formats long and short labels', () => {
    expect(financialYearLabel(2026)).toBe('1 July 2025 – 30 June 2026');
    expect(financialYearShort(2026)).toBe('2025–26');
  });
});
