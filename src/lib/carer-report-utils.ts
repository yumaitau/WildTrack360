export type ActiveFilter = "active" | "inactive" | "all";
export type LicenceFilter = "all" | "valid" | "expired" | "expiring-soon" | "missing";

export const LICENCE_EXPIRING_SOON_DAYS = 30;

export function getLicenceStatus(expiry: Date | string | null | undefined): LicenceFilter {
  if (!expiry) return "missing";
  const expiryDate = expiry instanceof Date ? expiry : new Date(expiry);
  if (Number.isNaN(expiryDate.getTime())) return "missing";

  const today = new Date();
  const expiryDay = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((expiryDay.getTime() - todayDay.getTime()) / 86_400_000);

  if (days < 0) return "expired";
  if (days <= LICENCE_EXPIRING_SOON_DAYS) return "expiring-soon";
  return "valid";
}
