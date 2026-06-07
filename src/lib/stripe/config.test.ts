import { describe, expect, it } from 'vitest';
import { PLATFORM_FEE_BPS, PLATFORM_FEE_PERCENT, platformFeeCents } from './config';

describe('platformFeeCents', () => {
  it('returns 5% rounded to the nearest cent', () => {
    expect(platformFeeCents(10_000)).toBe(500);    // $100 → $5
    expect(platformFeeCents(2500)).toBe(125);      // $25 → $1.25
    expect(platformFeeCents(199)).toBe(10);        // rounding edge: 9.95 → 10
  });

  it('rounds half to even / nearest correctly', () => {
    expect(platformFeeCents(150)).toBe(8);  // 7.5 → 8 (Math.round behavior)
    expect(platformFeeCents(1)).toBe(0);    // sub-cent fees collapse to 0
  });

  it('returns 0 for non-positive amounts', () => {
    expect(platformFeeCents(0)).toBe(0);
    expect(platformFeeCents(-100)).toBe(0);
    expect(platformFeeCents(NaN)).toBe(0);
    expect(platformFeeCents(Infinity)).toBe(0);
  });

  it('basis points constant matches percent constant', () => {
    expect(PLATFORM_FEE_BPS).toBe(500);
    expect(PLATFORM_FEE_PERCENT).toBe(5);
  });
});
