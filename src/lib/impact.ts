'server-only';

import { prisma } from './prisma';
import { financialYearEndYear, financialYearRange } from './financial-year';
import { getEffectiveMembership } from './household';
import type { Member } from '@prisma/client';

export interface RecentRelease {
  id: string;
  name: string;
  species: string;
  dateReleased: string | null;
}

export interface MemberImpact {
  org: {
    animalsHelped: number;
    released: number;
    releasedThisFy: number;
    speciesCount: number;
    currentlyInCare: number;
    fyEndYear: number;
  };
  member: {
    totalDonatedCents: number;
    currency: string;
    memberSince: string;
    hasActiveMembership: boolean;
  };
  recentReleases: RecentRelease[];
}

const IN_CARE_STATUSES = ['ADMITTED', 'IN_CARE', 'READY_FOR_RELEASE'] as const;

// Aggregate the org-wide care impact a member is contributing to, plus that
// member's own giving. This is the feature only WildTrack360 can offer — the
// animals and the members live in the same database, so a supporter can see
// "the animals your support helped care for".
export async function getMemberImpact(orgId: string, member: Member): Promise<MemberImpact> {
  const now = new Date();
  const fyEndYear = financialYearEndYear(now);
  const { start, end } = financialYearRange(fyEndYear);

  const [
    animalsHelped,
    released,
    releasedThisFy,
    speciesGroups,
    currentlyInCare,
    donationAgg,
    effectiveMembership,
    recent,
  ] = await Promise.all([
    prisma.animal.count({ where: { clerkOrganizationId: orgId } }),
    prisma.animal.count({ where: { clerkOrganizationId: orgId, status: 'RELEASED' } }),
    prisma.animal.count({
      where: { clerkOrganizationId: orgId, status: 'RELEASED', dateReleased: { gte: start, lt: end } },
    }),
    prisma.animal.findMany({
      where: { clerkOrganizationId: orgId },
      distinct: ['species'],
      select: { species: true },
    }),
    prisma.animal.count({ where: { clerkOrganizationId: orgId, status: { in: [...IN_CARE_STATUSES] } } }),
    prisma.payment.aggregate({
      _sum: { amountCents: true },
      where: {
        memberId: member.id,
        status: 'SUCCEEDED',
        kind: { in: ['DONATION_ONE_OFF', 'DONATION_RECURRING'] },
      },
    }),
    getEffectiveMembership(member),
    prisma.animal.findMany({
      where: { clerkOrganizationId: orgId, status: 'RELEASED', dateReleased: { not: null } },
      orderBy: { dateReleased: 'desc' },
      take: 6,
      select: { id: true, name: true, species: true, dateReleased: true },
    }),
  ]);

  return {
    org: {
      animalsHelped,
      released,
      releasedThisFy,
      speciesCount: speciesGroups.length,
      currentlyInCare,
      fyEndYear,
    },
    member: {
      totalDonatedCents: donationAgg._sum.amountCents ?? 0,
      currency: 'AUD',
      memberSince: member.joinedAt.toISOString(),
      hasActiveMembership: Boolean(effectiveMembership),
    },
    recentReleases: recent.map((a) => ({
      id: a.id,
      name: a.name,
      species: a.species,
      dateReleased: a.dateReleased ? a.dateReleased.toISOString() : null,
    })),
  };
}
