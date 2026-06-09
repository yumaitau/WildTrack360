import { describe, expect, it } from 'vitest';
import type { Square } from 'square';
import { centsToMoney, moneyToCents, processingFeeCents } from './money';

describe('centsToMoney', () => {
  it('converts cents to a BigInt Money with the default currency', () => {
    const m = centsToMoney(10_000);
    expect(m.amount).toBe(BigInt(10_000));
    expect(m.currency).toBe('AUD');
  });

  it('rounds fractional cents', () => {
    expect(centsToMoney(99.6).amount).toBe(BigInt(100));
  });

  it('honours an explicit currency', () => {
    expect(centsToMoney(500, 'USD').currency).toBe('USD');
  });
});

describe('moneyToCents', () => {
  it('reads a BigInt amount back to a number', () => {
    expect(moneyToCents({ amount: BigInt(250), currency: 'AUD' })).toBe(250);
  });

  it('returns null for missing money', () => {
    expect(moneyToCents(null)).toBeNull();
    expect(moneyToCents(undefined)).toBeNull();
    expect(moneyToCents({ currency: 'AUD' })).toBeNull();
  });
});

describe('processingFeeCents', () => {
  it('sums Square processing fee entries', () => {
    const payment = {
      processingFee: [
        { amountMoney: { amount: BigInt(220), currency: 'AUD' } },
        { amountMoney: { amount: BigInt(30), currency: 'AUD' } },
      ],
    } as Square.Payment;
    expect(processingFeeCents(payment)).toBe(250);
  });

  it('returns null when the fee is not yet reported', () => {
    expect(processingFeeCents({} as Square.Payment)).toBeNull();
    expect(processingFeeCents(null)).toBeNull();
  });
});
