import { PLATFORM_FEE_BPS } from './square/config';

// Estimated Square AU online (card-not-present) processing rate. Used ONLY to
// size the optional "cover the fees" top-up shown to donors; the real Square
// fee is reconciled from the settled payment afterwards.
export const PROCESSING_FEE_BPS = 220; // ~2.2%

// Combined platform + processing rate the top-up is grossed up against.
export const COVER_FEE_BPS = PLATFORM_FEE_BPS + PROCESSING_FEE_BPS;

// The extra amount (in cents) a donor adds so that, after the platform app-fee
// and estimated processing fee, the organisation nets approximately `baseCents`.
// Grosses up so net = gross * (1 - rate) ≈ baseCents. Returns 0 for non-positive
// input. Pure + shared by the donate UI and any server-side validation.
export function coverFeesCents(baseCents: number): number {
  if (!Number.isFinite(baseCents) || baseCents <= 0) return 0;
  const rate = COVER_FEE_BPS / 10000;
  if (rate <= 0 || rate >= 1) {
    throw new Error('Invalid COVER_FEE_BPS configuration');
  }
  const gross = Math.round(baseCents / (1 - rate));
  return Math.max(0, gross - baseCents);
}

// Convenience: the total a donor pays when they opt to cover fees.
export function totalWithCoveredFees(baseCents: number): number {
  return baseCents + coverFeesCents(baseCents);
}

// Estimated amount the organisation nets from a charge of `grossCents`, after
// the platform app-fee + estimated processing fee. For admin fee transparency.
export function netAfterFeesCents(grossCents: number): number {
  if (!Number.isFinite(grossCents) || grossCents <= 0) return 0;
  const fees = Math.round((grossCents * COVER_FEE_BPS) / 10000);
  return Math.max(0, grossCents - fees);
}
