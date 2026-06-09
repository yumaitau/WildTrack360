import { describe, expect, it } from 'vitest';
import { formatAbn, formatAmountCents, resolveThankYouMessage } from './receipts';

describe('formatAbn', () => {
  it('formats 11 digits as 2-3-3-3', () => {
    expect(formatAbn('12345678901')).toBe('12 345 678 901');
  });

  it('normalises existing spacing', () => {
    expect(formatAbn('12 345 678 901')).toBe('12 345 678 901');
  });

  it('returns the raw value when not 11 digits', () => {
    expect(formatAbn('123')).toBe('123');
    expect(formatAbn('not-an-abn')).toBe('not-an-abn');
  });
});

describe('formatAmountCents', () => {
  it('formats AUD cents as currency', () => {
    expect(formatAmountCents(10_000, 'AUD')).toBe('$100.00');
    expect(formatAmountCents(2550, 'AUD')).toBe('$25.50');
  });
});

describe('resolveThankYouMessage', () => {
  it('replaces the {name} token (case-insensitive) with the donor name', () => {
    expect(resolveThankYouMessage('Thanks {name}!', 'Jo')).toBe('Thanks Jo!');
    expect(resolveThankYouMessage('Cheers {NAME}', 'Sam')).toBe('Cheers Sam');
  });

  it('falls back to "there" when no name is available', () => {
    expect(resolveThankYouMessage('Hi {name}', null)).toBe('Hi there');
  });

  it('returns null for an empty/missing message so callers use their default', () => {
    expect(resolveThankYouMessage(null, 'Jo')).toBeNull();
    expect(resolveThankYouMessage('', 'Jo')).toBeNull();
  });

  it('passes through a message with no token', () => {
    expect(resolveThankYouMessage('Thank you for your support', 'Jo')).toBe(
      'Thank you for your support'
    );
  });
});
