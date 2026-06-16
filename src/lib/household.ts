'server-only';

import { prisma } from './prisma';
import type { Member, MembershipTier } from '@prisma/client';

export const MAX_HOUSEHOLD_MEMBERS = 6;

export interface EffectiveMembership {
  tier: MembershipTier;
  periodEnd: Date;
  status: string;
  giftedBy: string | null;
  viaPrimary: boolean;
  primaryName: string | null;
}

// A member's current coverage: their own active membership, or — when they're a
// secondary household member — the primary member's active membership. Returns
// null when nobody covering them has an active membership.
export async function getEffectiveMembership(member: Member): Promise<EffectiveMembership | null> {
  const now = new Date();

  const own = await prisma.membership.findFirst({
    where: {
      clerkOrganizationId: member.clerkOrganizationId,
      memberId: member.id,
      status: 'ACTIVE',
      periodEnd: { gte: now },
    },
    include: { tier: true },
    orderBy: { periodEnd: 'desc' },
  });
  if (own) {
    return {
      tier: own.tier,
      periodEnd: own.periodEnd,
      status: own.status,
      giftedBy: own.giftedBy,
      viaPrimary: false,
      primaryName: null,
    };
  }

  if (member.primaryMemberId) {
    const [primary, primaryMembership] = await Promise.all([
      prisma.member.findFirst({
        where: { id: member.primaryMemberId, clerkOrganizationId: member.clerkOrganizationId },
      }),
      prisma.membership.findFirst({
        where: {
          clerkOrganizationId: member.clerkOrganizationId,
          memberId: member.primaryMemberId,
          status: 'ACTIVE',
          periodEnd: { gte: now },
        },
        include: { tier: true },
        orderBy: { periodEnd: 'desc' },
      }),
    ]);
    if (primary && primaryMembership) {
      return {
        tier: primaryMembership.tier,
        periodEnd: primaryMembership.periodEnd,
        status: primaryMembership.status,
        giftedBy: primaryMembership.giftedBy,
        viaPrimary: true,
        primaryName: `${primary.firstName} ${primary.lastName}`.trim(),
      };
    }
  }

  return null;
}

export async function listHouseholdMembers(orgId: string, primaryId: string) {
  return prisma.member.findMany({
    where: { clerkOrganizationId: orgId, primaryMemberId: primaryId, archivedAt: null },
    orderBy: { joinedAt: 'asc' },
    select: { id: true, firstName: true, lastName: true, email: true, clerkUserId: true },
  });
}

export interface HouseholdMemberInput {
  firstName: string;
  lastName: string;
  email: string;
}

// Add a secondary member to a primary member's household. Links an existing
// uncovered member with that email, or creates a new linked member. Guards
// against nesting (a household member can't have their own household) and a
// reasonable household size cap.
export async function addHouseholdMember(
  orgId: string,
  primary: Member,
  input: HouseholdMemberInput
): Promise<{ id: string }> {
  if (primary.primaryMemberId) {
    throw new Error('Household members cannot add their own household members');
  }
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName || !email)
    throw new Error('First name, last name and email are required');
  if (email === primary.email.toLowerCase()) throw new Error('That email is the primary member');

  const count = await prisma.member.count({
    where: { clerkOrganizationId: orgId, primaryMemberId: primary.id, archivedAt: null },
  });
  const maxSecondaryMembers = MAX_HOUSEHOLD_MEMBERS - 1;
  if (count >= maxSecondaryMembers) {
    throw new Error(`A household can have at most ${MAX_HOUSEHOLD_MEMBERS} total members`);
  }

  const existing = await prisma.member.findFirst({
    where: { clerkOrganizationId: orgId, email: { equals: email, mode: 'insensitive' } },
  });

  if (existing) {
    if (existing.primaryMemberId && existing.primaryMemberId !== primary.id) {
      throw new Error('That person is already in another household');
    }
    const existingDependants = await prisma.member.count({
      where: {
        clerkOrganizationId: orgId,
        primaryMemberId: existing.id,
        archivedAt: null,
      },
    });
    if (existingDependants > 0) {
      throw new Error('That person already manages their own household');
    }
    const ownActive = await prisma.membership.findFirst({
      where: {
        clerkOrganizationId: orgId,
        memberId: existing.id,
        status: 'ACTIVE',
        periodEnd: { gte: new Date() },
      },
      select: { id: true },
    });
    if (ownActive) throw new Error('That person already has their own active membership');
    await prisma.member.update({
      where: { id: existing.id },
      data: { primaryMemberId: primary.id, status: 'ACTIVE' },
    });
    return { id: existing.id };
  }

  const created = await prisma.member.create({
    data: {
      clerkOrganizationId: orgId,
      firstName,
      lastName,
      email,
      primaryMemberId: primary.id,
      status: 'ACTIVE',
    },
    select: { id: true },
  });
  return created;
}

export async function removeHouseholdMember(orgId: string, primaryId: string, memberId: string) {
  const result = await prisma.member.updateMany({
    where: { id: memberId, clerkOrganizationId: orgId, primaryMemberId: primaryId },
    data: { primaryMemberId: null },
  });
  if (result.count === 0) throw new Error('Household member not found');
}
