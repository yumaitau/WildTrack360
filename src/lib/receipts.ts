'server-only';

import { prisma } from './prisma';
import type { Payment, PaymentKind } from '@prisma/client';

export interface ReceiptData {
  payment: Payment & { donations: { donorEmail: string; donorName: string | null }[] };
  org: {
    name: string;
    abn: string | null;
    dgrEndorsed: boolean;
    contactEmail: string | null;
    contactPhone: string | null;
  };
  donorEmail: string;
  donorName: string | null;
  taxDeductible: boolean;
  // Org-customised thank-you wording for this payment type ({name} token still
  // unresolved). Null when the org hasn't set one.
  thankYouMessage: string | null;
}

const KIND_LABEL: Record<PaymentKind, string> = {
  DONATION_ONE_OFF: 'Donation',
  DONATION_RECURRING: 'Recurring donation instalment',
  MEMBERSHIP_ONE_OFF: 'Membership fee',
  MEMBERSHIP_RECURRING: 'Membership instalment',
};

// Memberships are not tax-deductible under Australian DGR rules even for
// DGR-endorsed orgs. Only donations qualify, and only when the org is endorsed.
function isTaxDeductible(kind: PaymentKind, dgrEndorsed: boolean): boolean {
  if (!dgrEndorsed) return false;
  return kind === 'DONATION_ONE_OFF' || kind === 'DONATION_RECURRING';
}

export async function loadReceiptData(paymentId: string, orgId: string): Promise<ReceiptData | null> {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, clerkOrganizationId: orgId },
    include: { donations: { select: { donorEmail: true, donorName: true } } },
  });
  if (!payment) return null;

  const settings = await prisma.organisationSettings.findUnique({
    where: { clerkOrganisationId: orgId },
  });

  const donation = payment.donations[0];
  const member = payment.memberId
    ? await prisma.member.findUnique({
        where: { id: payment.memberId },
        select: { email: true, firstName: true, lastName: true },
      })
    : null;

  const donorEmail = donation?.donorEmail ?? member?.email ?? 'unknown@example.com';
  const donorName = donation?.donorName ?? (member ? `${member.firstName} ${member.lastName}` : null);

  const isDonation = payment.kind === 'DONATION_ONE_OFF' || payment.kind === 'DONATION_RECURRING';
  const thankYouMessage =
    (isDonation ? settings?.donationThankYouMessage : settings?.membershipThankYouMessage)?.trim() ||
    null;

  return {
    payment,
    org: {
      // Prefer the org's registered name from settings; fall back to the
      // deployment-wide env name, then a generic label.
      name:
        settings?.legalName?.trim() ||
        process.env.NEXT_PUBLIC_ORGANIZATION_NAME ||
        'Wildlife Organisation',
      abn: settings?.abn ?? null,
      dgrEndorsed: settings?.dgrEndorsed ?? false,
      contactEmail: settings?.contactEmail ?? null,
      contactPhone: settings?.contactPhone ?? null,
    },
    donorEmail,
    donorName,
    taxDeductible: isTaxDeductible(payment.kind, settings?.dgrEndorsed ?? false),
    thankYouMessage,
  };
}

// Resolve the {name} token in a custom thank-you message. Empty/missing message
// returns null so callers fall back to their default copy.
export function resolveThankYouMessage(
  message: string | null,
  donorName: string | null
): string | null {
  if (!message) return null;
  return message.replace(/\{name\}/gi, donorName ?? 'there').trim();
}

export function receiptKindLabel(kind: PaymentKind): string {
  return KIND_LABEL[kind];
}

export function formatAmountCents(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(cents / 100);
}

// Display an ABN as "12 345 678 901" (2-3-3-3). Falls back to the raw value if
// it isn't 11 digits.
export function formatAbn(abn: string): string {
  const digits = abn.replace(/\s/g, '');
  if (!/^\d{11}$/.test(digits)) return abn;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 11)}`;
}
