'server-only';

import { prisma } from './prisma';
import { getOrgDisplayInfo } from './org-info';
import {
  financialYearEndYear,
  financialYearLabel,
  financialYearRange,
} from './financial-year';

export interface EofyLine {
  date: Date;
  receiptNumber: string | null;
  amountCents: number;
}

export interface EofyStatement {
  org: {
    name: string;
    abn: string | null;
    dgrEndorsed: boolean;
    contactEmail: string | null;
    contactPhone: string | null;
  };
  donorName: string | null;
  donorEmail: string;
  fyEndYear: number;
  fyLabel: string;
  currency: string;
  lines: EofyLine[];
  totalCents: number;
  taxDeductible: boolean;
}

// Only genuine donations are tax-deductible (and only when the org is a DGR);
// membership fees are excluded by querying the Donation table, which is written
// for donation payments only.
async function loadOrg(orgId: string) {
  const [info, settings] = await Promise.all([
    getOrgDisplayInfo(orgId),
    prisma.organisationSettings.findUnique({
      where: { clerkOrganisationId: orgId },
      select: { abn: true, dgrEndorsed: true },
    }),
  ]);
  return {
    name: info.name,
    abn: settings?.abn ?? null,
    dgrEndorsed: settings?.dgrEndorsed ?? false,
    contactEmail: info.contactEmail,
    contactPhone: info.contactPhone,
  };
}

// Build one donor's consolidated statement for a financial year. Aggregates by
// email (case-insensitive) so gifts made before and after the donor claimed a
// portal account still appear together. Returns null when the donor has no
// successful donations in the year.
export async function loadEofyStatement(
  orgId: string,
  fyEndYear: number,
  donorEmail: string
): Promise<EofyStatement | null> {
  const { start, end } = financialYearRange(fyEndYear);
  const donations = await prisma.donation.findMany({
    where: {
      clerkOrganizationId: orgId,
      donorEmail: { equals: donorEmail, mode: 'insensitive' },
      createdAt: { gte: start, lt: end },
      payment: { status: 'SUCCEEDED' },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      amountCents: true,
      currency: true,
      donorName: true,
      createdAt: true,
      payment: { select: { receiptNumber: true } },
    },
  });
  if (donations.length === 0) return null;

  const lines: EofyLine[] = donations.map((d) => ({
    date: d.createdAt,
    receiptNumber: d.payment?.receiptNumber ?? null,
    amountCents: d.amountCents,
  }));
  const totalCents = lines.reduce((sum, l) => sum + l.amountCents, 0);
  const donorName = donations.find((d) => d.donorName)?.donorName ?? null;
  const org = await loadOrg(orgId);

  return {
    org,
    donorName,
    donorEmail,
    fyEndYear,
    fyLabel: financialYearLabel(fyEndYear),
    currency: donations[0]?.currency ?? 'AUD',
    lines,
    totalCents,
    taxDeductible: org.dgrEndorsed,
  };
}

// FY end-years in which an email made successful donations, newest first.
export async function donorFinancialYears(orgId: string, donorEmail: string): Promise<number[]> {
  const donations = await prisma.donation.findMany({
    where: {
      clerkOrganizationId: orgId,
      donorEmail: { equals: donorEmail, mode: 'insensitive' },
      payment: { status: 'SUCCEEDED' },
    },
    select: { createdAt: true },
  });
  const years = new Set<number>();
  for (const d of donations) years.add(financialYearEndYear(d.createdAt));
  return [...years].sort((a, b) => b - a);
}

export interface DonorAggregate {
  donorEmail: string;
  donorName: string | null;
  count: number;
  totalCents: number;
}

// Per-donor totals for an org in a financial year, for the admin statements
// view. Grouped by lower-cased email so each donor appears once.
export async function aggregateDonorsForFy(
  orgId: string,
  fyEndYear: number
): Promise<DonorAggregate[]> {
  const { start, end } = financialYearRange(fyEndYear);
  const donations = await prisma.donation.findMany({
    where: {
      clerkOrganizationId: orgId,
      createdAt: { gte: start, lt: end },
      payment: { status: 'SUCCEEDED' },
    },
    select: { donorEmail: true, donorName: true, amountCents: true },
  });

  const byEmail = new Map<string, DonorAggregate>();
  for (const d of donations) {
    const key = d.donorEmail.toLowerCase();
    const existing = byEmail.get(key);
    if (existing) {
      existing.count += 1;
      existing.totalCents += d.amountCents;
      if (!existing.donorName && d.donorName) existing.donorName = d.donorName;
    } else {
      byEmail.set(key, {
        donorEmail: d.donorEmail,
        donorName: d.donorName ?? null,
        count: 1,
        totalCents: d.amountCents,
      });
    }
  }
  return [...byEmail.values()].sort((a, b) => b.totalCents - a.totalCents);
}
