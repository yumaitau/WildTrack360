'server-only';

import { prisma } from './prisma';
import type { CarerProfile, CarerTraining } from '@prisma/client';
import type { EnrichedCarer } from './types';
import { getOrgRoster, getUserInfo } from './org-directory';

/**
 * Fetches all org members (Clerk or DB roster depending on ORG_SOURCE) and
 * merges with CarerProfile data from the DB.
 */
export async function getEnrichedCarers(orgId: string): Promise<EnrichedCarer[]> {
  // Pending invite placeholders are not carers yet — they surface in the
  // people-management invitations list instead.
  const roster = (await getOrgRoster(orgId)).filter((entry) => !entry.pending);

  const profiles = await prisma.carerProfile.findMany({
    where: { clerkOrganizationId: orgId },
    include: { trainings: true },
  });

  const profileMap = new Map<string, CarerProfile & { trainings?: CarerTraining[] }>();
  for (const p of profiles) {
    profileMap.set(p.id, p);
  }

  return roster.map(member => {
      const userId = member.userId;
      const profile = profileMap.get(userId);

      return {
        id: userId,
        name: [member.firstName, member.lastName]
          .filter(Boolean)
          .join(' ') || member.email || 'Unknown',
        email: member.email || '',
        imageUrl: member.imageUrl || '',
        // Profile fields
        phone: profile?.phone ?? null,
        licenseNumber: profile?.licenseNumber ?? null,
        licenseExpiry: profile?.licenseExpiry ?? null,
        jurisdiction: profile?.jurisdiction ?? null,
        specialties: profile?.specialties ?? [],
        notes: profile?.notes ?? null,
        active: profile?.active ?? true,
        // NSW-specific
        streetAddress: profile?.streetAddress ?? null,
        suburb: profile?.suburb ?? null,
        state: profile?.state ?? null,
        postcode: profile?.postcode ?? null,
        executivePosition: profile?.executivePosition ?? null,
        speciesCoordinatorFor: profile?.speciesCoordinatorFor ?? null,
        rehabilitatesKoala: profile?.rehabilitatesKoala ?? false,
        rehabilitatesFlyingFox: profile?.rehabilitatesFlyingFox ?? false,
        rehabilitatesBirdOfPrey: profile?.rehabilitatesBirdOfPrey ?? false,
        rehabilitatesVenomousSnake: profile?.rehabilitatesVenomousSnake ?? false,
        rehabilitatesMarineReptile: profile?.rehabilitatesMarineReptile ?? false,
        memberSince: profile?.memberSince ?? null,
        trainingLevel: profile?.trainingLevel ?? null,
        memberId: profile?.memberId ?? null,
        // Meta
        hasProfile: !!profile,
        trainings: profile?.trainings ?? [],
      };
    });
}

/**
 * Single enriched carer by Clerk user ID.
 */
export async function getEnrichedCarer(userId: string, orgId: string): Promise<EnrichedCarer | null> {
  const [user, profile] = await Promise.all([
    getUserInfo(userId),
    prisma.carerProfile.findFirst({
      where: { id: userId, clerkOrganizationId: orgId },
      include: { trainings: true },
    }),
  ]);

  if (!user) return null;

  return {
    id: user.id,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.email || 'Unknown',
    email: user.email || '',
    imageUrl: user.imageUrl || '',
    phone: profile?.phone ?? null,
    licenseNumber: profile?.licenseNumber ?? null,
    licenseExpiry: profile?.licenseExpiry ?? null,
    jurisdiction: profile?.jurisdiction ?? null,
    specialties: profile?.specialties ?? [],
    notes: profile?.notes ?? null,
    active: profile?.active ?? true,
    streetAddress: profile?.streetAddress ?? null,
    suburb: profile?.suburb ?? null,
    state: profile?.state ?? null,
    postcode: profile?.postcode ?? null,
    executivePosition: profile?.executivePosition ?? null,
    speciesCoordinatorFor: profile?.speciesCoordinatorFor ?? null,
    rehabilitatesKoala: profile?.rehabilitatesKoala ?? false,
    rehabilitatesFlyingFox: profile?.rehabilitatesFlyingFox ?? false,
    rehabilitatesBirdOfPrey: profile?.rehabilitatesBirdOfPrey ?? false,
    rehabilitatesVenomousSnake: profile?.rehabilitatesVenomousSnake ?? false,
    rehabilitatesMarineReptile: profile?.rehabilitatesMarineReptile ?? false,
    memberSince: profile?.memberSince ?? null,
    trainingLevel: profile?.trainingLevel ?? null,
    memberId: profile?.memberId ?? null,
    hasProfile: !!profile,
    trainings: profile?.trainings ?? [],
  };
}

/**
 * Returns the set of Clerk user IDs eligible to care for a given species,
 * based on SpeciesGroup assignments. Users with no species group assignments
 * are not eligible for any species.
 */
export async function getEligibleCarerIdsForSpecies(
  orgId: string,
  species: string
): Promise<Set<string> | null> {
  const normSpecies = species.trim().toLowerCase();

  // Find species groups in this org that contain the species
  const matchingGroups = await prisma.speciesGroup.findMany({
    where: { orgId },
    select: { id: true, speciesNames: true },
  });

  const matchingGroupIds = matchingGroups
    .filter(g => g.speciesNames.some(s => s.trim().toLowerCase() === normSpecies))
    .map(g => g.id);

  // If no species groups exist at all for the org, skip filtering entirely
  if (matchingGroups.length === 0) return null;

  // Find all OrgMember IDs that have ANY species assignment in this org
  const allAssigned = await prisma.coordinatorSpeciesAssignment.findMany({
    where: {
      orgMember: { orgId },
    },
    select: { orgMemberId: true, speciesGroupId: true },
  });

  // Build set of orgMember IDs that have at least one assignment
  const membersWithAssignments = new Set(allAssigned.map(a => a.orgMemberId));

  // Build set of orgMember IDs assigned to matching groups
  const eligibleMemberIds = new Set(
    allAssigned
      .filter(a => matchingGroupIds.includes(a.speciesGroupId))
      .map(a => a.orgMemberId)
  );

  // Resolve orgMember IDs → Clerk user IDs (include role to identify admins)
  const orgMembers = await prisma.orgMember.findMany({
    where: { orgId },
    select: { id: true, userId: true, role: true },
  });

  const eligible = new Set<string>();
  for (const m of orgMembers) {
    // Always include admins and *_ALL roles — they are eligible for all species
    if (m.role === 'ADMIN' || m.role === 'COORDINATOR_ALL' || m.role === 'CARER_ALL') {
      eligible.add(m.userId);
    }
    // Include if assigned to a matching species group
    else if (eligibleMemberIds.has(m.id)) {
      eligible.add(m.userId);
    }
  }

  return eligible;
}

/**
 * Upsert a CarerProfile for a Clerk user.
 */
export async function upsertCarerProfile(
  userId: string,
  orgId: string,
  data: Partial<Omit<CarerProfile, 'id' | 'clerkOrganizationId' | 'createdAt' | 'updatedAt'>>
): Promise<CarerProfile> {
  return prisma.carerProfile.upsert({
    where: { id: userId },
    create: {
      id: userId,
      clerkOrganizationId: orgId,
      specialties: data.specialties ?? [],
      ...data,
    },
    update: data,
  });
}
