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

  return {
    payment,
    org: {
      name: process.env.NEXT_PUBLIC_ORGANIZATION_NAME ?? 'Wildlife Organisation',
      abn: settings?.abn ?? null,
      dgrEndorsed: settings?.dgrEndorsed ?? false,
      contactEmail: settings?.contactEmail ?? null,
      contactPhone: settings?.contactPhone ?? null,
    },
    donorEmail,
    donorName,
    taxDeductible: isTaxDeductible(payment.kind, settings?.dgrEndorsed ?? false),
  };
}

export function receiptKindLabel(kind: PaymentKind): string {
  return KIND_LABEL[kind];
}

export function formatAmountCents(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(cents / 100);
}
