import type { BillingInterval } from '@prisma/client';

// Next charge date for a self-billed recurring subscription.
export function computeNextCharge(from: Date, interval: 'MONTHLY' | 'ANNUAL'): Date {
  const d = new Date(from);
  if (interval === 'MONTHLY') d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}

// Membership period end given a start + the tier's billing interval. ONE_OFF
// grants a year; LIFETIME a nominal 100 years.
export function computeMembershipEnd(start: Date, interval: BillingInterval): Date {
  const d = new Date(start);
  switch (interval) {
    case 'MONTHLY':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'ANNUAL':
    case 'ONE_OFF':
      d.setFullYear(d.getFullYear() + 1);
      break;
    case 'LIFETIME':
      d.setFullYear(d.getFullYear() + 100);
      break;
  }
  return d;
}
