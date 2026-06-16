// Platform fee in basis points (500 = 5%). Single source of truth for the
// app_fee_money taken on every Square charge (one-off and recurring).
export const PLATFORM_FEE_BPS = 500;

export function platformFeeCents(amountCents: number): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 0;
  return Math.round((amountCents * PLATFORM_FEE_BPS) / 10000);
}

export const PLATFORM_FEE_PERCENT = PLATFORM_FEE_BPS / 100;

export const SUPPORTED_CURRENCIES = ['AUD'] as const;
export const DEFAULT_CURRENCY: (typeof SUPPORTED_CURRENCIES)[number] = 'AUD';

export const MIN_DONATION_CENTS = 200; // AU$2 minimum to keep fees economical.
export const MAX_DONATION_CENTS = 1_000_000; // AU$10,000 cap per single charge.
