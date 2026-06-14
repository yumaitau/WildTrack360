'server-only';

import { prisma } from './prisma';
import type { Prisma, BillingInterval, GstHandling } from '@prisma/client';

export interface TierInput {
  name: string;
  description?: string | null;
  amountCents: number;
  currency?: string;
  billingInterval: BillingInterval;
  gstHandling?: GstHandling;
  benefits?: string[];
  active?: boolean;
}

const VALID_INTERVALS: BillingInterval[] = ['ONE_OFF', 'MONTHLY', 'ANNUAL', 'LIFETIME'];
const MAX_BENEFITS = 20;
const MAX_BENEFIT_LEN = 160;

// Normalise a raw benefits payload into a clean string[]: trims, drops blanks,
// caps line length and count. Defensive against arbitrary JSON from the client.
function cleanBenefits(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((b): b is string => typeof b === 'string')
    .map((b) => b.trim().slice(0, MAX_BENEFIT_LEN))
    .filter((b) => b.length > 0)
    .slice(0, MAX_BENEFITS);
}

export async function listTiers(orgId: string, opts: { includeArchived?: boolean } = {}) {
  return prisma.membershipTier.findMany({
    where: {
      clerkOrganizationId: orgId,
      ...(opts.includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: [{ active: 'desc' }, { amountCents: 'asc' }],
  });
}

function pick(body: Record<string, unknown>): Partial<TierInput> {
  const out: Partial<TierInput> = {};
  if (typeof body.name === 'string') out.name = body.name;
  if ('description' in body) out.description = (body.description as string | null) ?? null;
  if (typeof body.amountCents === 'number') out.amountCents = body.amountCents;
  if (typeof body.currency === 'string') out.currency = body.currency;
  if (typeof body.billingInterval === 'string') {
    out.billingInterval = body.billingInterval as BillingInterval;
  }
  if (typeof body.gstHandling === 'string') {
    out.gstHandling = body.gstHandling as GstHandling;
  }
  if ('benefits' in body) out.benefits = cleanBenefits(body.benefits);
  if (typeof body.active === 'boolean') out.active = body.active;
  return out;
}

export async function createTier(orgId: string, body: Record<string, unknown>) {
  const data = pick(body);
  if (!data.name || data.amountCents === undefined) {
    throw new Error('name and amountCents are required');
  }
  if (data.amountCents < 0) throw new Error('amountCents must be non-negative');
  const interval = data.billingInterval ?? 'ANNUAL';
  if (!VALID_INTERVALS.includes(interval)) throw new Error('Invalid billing interval');

  return prisma.membershipTier.create({
    data: {
      clerkOrganizationId: orgId,
      name: data.name,
      description: data.description ?? null,
      amountCents: data.amountCents,
      currency: data.currency ?? 'AUD',
      billingInterval: interval,
      gstHandling: data.gstHandling ?? 'NONE',
      benefitsJson: (data.benefits ?? []) as Prisma.InputJsonValue,
      active: data.active ?? true,
    },
  });
}

export async function updateTier(id: string, orgId: string, body: Record<string, unknown>) {
  const data = pick(body);
  const update: Prisma.MembershipTierUpdateInput = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.description !== undefined) update.description = data.description;
  if (data.amountCents !== undefined) {
    if (data.amountCents < 0) throw new Error('amountCents must be non-negative');
    update.amountCents = data.amountCents;
  }
  if (data.currency !== undefined) update.currency = data.currency;
  if (data.billingInterval !== undefined) {
    if (!VALID_INTERVALS.includes(data.billingInterval)) throw new Error('Invalid billing interval');
    update.billingInterval = data.billingInterval;
  }
  if (data.gstHandling !== undefined) update.gstHandling = data.gstHandling;
  if (data.benefits !== undefined) update.benefitsJson = data.benefits as Prisma.InputJsonValue;
  if (data.active !== undefined) update.active = data.active;

  const result = await prisma.membershipTier.updateMany({
    where: { id, clerkOrganizationId: orgId },
    data: update,
  });
  if (result.count === 0) throw new Error('Tier not found');
  return prisma.membershipTier.findUnique({ where: { id } });
}

export async function archiveTier(id: string, orgId: string) {
  const result = await prisma.membershipTier.updateMany({
    where: { id, clerkOrganizationId: orgId, archivedAt: null },
    data: { archivedAt: new Date(), active: false },
  });
  if (result.count === 0) throw new Error('Tier not found');
}
