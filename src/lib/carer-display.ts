export const CARER_EMAIL_UNAVAILABLE = 'Carer email unavailable';

export function getCarerDisplayLabel(
  carer: { name?: string | null; email?: string | null } | null | undefined
): string {
  return carer?.name || carer?.email || CARER_EMAIL_UNAVAILABLE;
}
