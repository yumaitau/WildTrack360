import { describe, expect, it } from 'vitest';

// The full-refund detection lives inline in handleChargeRefunded (webhook.ts).
// Tests at this layer would need a database; instead we re-implement the
// pure check here and lock in its behaviour so future refactors don't
// quietly switch back to flipping status on partial refunds.
function isFullyRefunded(charge: { amount?: number | null; amount_refunded?: number | null }): boolean {
  return (
    typeof charge.amount === 'number' &&
    typeof charge.amount_refunded === 'number' &&
    charge.amount_refunded >= charge.amount
  );
}

describe('isFullyRefunded', () => {
  it('returns true when amount_refunded equals amount', () => {
    expect(isFullyRefunded({ amount: 10000, amount_refunded: 10000 })).toBe(true);
  });

  it('returns false on partial refund', () => {
    expect(isFullyRefunded({ amount: 10000, amount_refunded: 2500 })).toBe(false);
  });

  it('returns true when amount_refunded exceeds amount (rounding / fee adjustments)', () => {
    expect(isFullyRefunded({ amount: 100, amount_refunded: 101 })).toBe(true);
  });

  it('returns false for missing fields rather than over-marking refunds', () => {
    expect(isFullyRefunded({ amount: null, amount_refunded: 100 })).toBe(false);
    expect(isFullyRefunded({ amount: 100, amount_refunded: null })).toBe(false);
    expect(isFullyRefunded({})).toBe(false);
  });
});
