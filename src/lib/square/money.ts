'server-only';

import type { Square } from 'square';
import { DEFAULT_CURRENCY } from './config';

// Square represents money as { amount: bigint (minor units), currency }.
export function centsToMoney(cents: number, currency: string = DEFAULT_CURRENCY): Square.Money {
  return { amount: BigInt(Math.round(cents)), currency: currency as Square.Currency };
}

export function moneyToCents(money: Square.Money | null | undefined): number | null {
  if (!money || money.amount === undefined || money.amount === null) return null;
  return Number(money.amount);
}

// Square's processing fee is populated only once the payment settles, as an
// array of fee entries. Sum them into cents; null until Square reports it.
export function processingFeeCents(payment: Square.Payment | null | undefined): number | null {
  const fees = payment?.processingFee;
  if (!fees || fees.length === 0) return null;
  let total = 0;
  for (const fee of fees) {
    const cents = moneyToCents(fee.amountMoney);
    if (cents != null) total += cents;
  }
  return total;
}
