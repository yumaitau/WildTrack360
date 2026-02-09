'server-only';

import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from './prisma';
import type { CarerProfile } from '@prisma/client';
import type { EnrichedCarer } from './types';

/**
 * Fetches Clerk org members and merges with CarerProfile data from DB.
 */
export async function getEnrichedCarers(orgId: string): Promise<EnrichedCarer[]> {
  const client = await clerkClient();

  // Fetch Clerk org members and CarerProfiles in parallel
  const [membershipList, profiles] = await Promise.all([
    client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    }),
    prisma.carerProfile.findMany({
      where: { clerkOrganizationId: orgId },
      include: { trainings: true },
    }),
  ]);

  const profileMap = new Map<string, CarerProfile & { trainings?: any[] }>();
  for (const p of profiles) {
    profileMap.set(p.id, p);
  }

  return membershipList.data
    .filter(m => m.publicUserData?.userId)
    .map(m => {
      const userId = m.publicUserData!.userId!;
      const profile = profileMap.get(userId);

      return {
        id: userId,
        name: [m.publicUserData?.firstName, m.publicUserData?.lastName]
          .filter(Boolean)
          .join(' ') || m.publicUserData?.identifier || 'Unknown',
        email: m.publicUserData?.identifier || '',
        imageUrl: m.publicUserData?.imageUrl || '',
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
        memberSince: profile?.memberSince ?? null,
        trainingLevel: profile?.trainingLevel ?? null,
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
  const client = await clerkClient();

  const [clerkUser, profile] = await Promise.all([
    client.users.getUser(userId).catch(() => null),
    prisma.carerProfile.findFirst({
      where: { id: userId, clerkOrganizationId: orgId },
      include: { trainings: true },
    }),
  ]);

  if (!clerkUser) return null;

  return {
    id: clerkUser.id,
    name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
      clerkUser.emailAddresses[0]?.emailAddress || 'Unknown',
    email: clerkUser.emailAddresses[0]?.emailAddress || '',
    imageUrl: clerkUser.imageUrl || '',
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
    memberSince: profile?.memberSince ?? null,
    trainingLevel: profile?.trainingLevel ?? null,
    hasProfile: !!profile,
    trainings: profile?.trainings ?? [],
  };
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
      ...data,
    },
    update: data,
  });
}
