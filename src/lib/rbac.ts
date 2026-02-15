'server-only';

import { prisma } from './prisma';
import type { OrgRole } from '@prisma/client';

// ─── Role Hierarchy ──────────────────────────────────────────────────────────
// ADMIN > COORDINATOR > CARER
const ROLE_RANK: Record<OrgRole, number> = {
  ADMIN: 3,
  COORDINATOR: 2,
  CARER: 1,
};

// ─── Permission Actions ──────────────────────────────────────────────────────
export type Permission =
  | 'animal:view_all'
  | 'animal:view_species_group'
  | 'animal:view_own'
  | 'animal:create'
  | 'animal:assign'
  | 'animal:edit_any'
  | 'animal:edit_own'
  | 'animal:delete'
  | 'user:manage'
  | 'species_group:manage'
  | 'coordinator:assign'
  | 'report:view_org'
  | 'report:view_species'
  | 'report:export'
  | 'settings:manage'
  | 'carer:view_workload';

// ─── Permission Matrix ───────────────────────────────────────────────────────
const PERMISSION_MATRIX: Record<OrgRole, Set<Permission>> = {
  ADMIN: new Set([
    'animal:view_all',
    'animal:view_species_group',
    'animal:view_own',
    'animal:create',
    'animal:assign',
    'animal:edit_any',
    'animal:edit_own',
    'animal:delete',
    'user:manage',
    'species_group:manage',
    'coordinator:assign',
    'report:view_org',
    'report:view_species',
    'report:export',
    'settings:manage',
    'carer:view_workload',
  ]),
  COORDINATOR: new Set([
    'animal:view_species_group',
    'animal:view_own',
    'animal:create',
    'animal:assign',
    'animal:edit_any',
    'animal:edit_own',
    'report:view_species',
    'report:export',
    'carer:view_workload',
  ]),
  CARER: new Set([
    'animal:view_own',
    'animal:edit_own',
  ]),
};

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Get the user's WildTrack360 role for an organisation.
 * Falls back to CARER if no OrgMember record exists.
 */
export async function getUserRole(userId: string, orgId: string): Promise<OrgRole> {
  const member = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
  return member?.role ?? 'CARER';
}

/**
 * Get the full OrgMember record (includes speciesAssignments).
 */
export async function getOrgMember(userId: string, orgId: string) {
  return prisma.orgMember.findUnique({
    where: { userId_orgId: { userId, orgId } },
    include: {
      speciesAssignments: {
        include: { speciesGroup: true },
      },
    },
  });
}

/**
 * Check whether a role has a specific permission.
 */
export function hasPermission(role: OrgRole, permission: Permission): boolean {
  return PERMISSION_MATRIX[role].has(permission);
}

/**
 * Check whether the role meets or exceeds a minimum role level.
 */
export function hasMinimumRole(role: OrgRole, minimumRole: OrgRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimumRole];
}

/**
 * Throws if the user's role doesn't have the requested permission.
 */
export async function requirePermission(
  userId: string,
  orgId: string,
  permission: Permission
): Promise<OrgRole> {
  const role = await getUserRole(userId, orgId);
  if (!hasPermission(role, permission)) {
    throw new Error('Forbidden');
  }
  return role;
}

/**
 * Throws if the user's role is below the required minimum.
 */
export async function requireMinimumRole(
  userId: string,
  orgId: string,
  minimumRole: OrgRole
): Promise<OrgRole> {
  const role = await getUserRole(userId, orgId);
  if (!hasMinimumRole(role, minimumRole)) {
    throw new Error('Forbidden');
  }
  return role;
}

// ─── Species-Scoped Access ───────────────────────────────────────────────────

/**
 * Normalise a species name for case-insensitive comparison.
 */
function normaliseSpecies(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Get the species names a coordinator is authorised to manage.
 * Returns null for ADMIN (unrestricted) or empty array for CARER.
 * Species names preserve original casing for Prisma query compatibility.
 */
export async function getAuthorisedSpecies(
  userId: string,
  orgId: string
): Promise<string[] | null> {
  const member = await getOrgMember(userId, orgId);
  if (!member) return [];

  // Admin sees everything — null means "no filter"
  if (member.role === 'ADMIN') return null;

  // Coordinator sees species in their assigned groups
  // Preserve original casing so Prisma queries match DB values
  if (member.role === 'COORDINATOR') {
    const speciesNames = member.speciesAssignments.flatMap(
      (a) => a.speciesGroup.speciesNames
    );
    return [...new Set(speciesNames.map(s => s.trim()))];
  }

  // Carer has no species-level access (filtered by assigned animals instead)
  return [];
}

/**
 * Check whether a user can access a specific animal based on their role:
 * - ADMIN: always
 * - COORDINATOR: if the animal's species is in one of their assigned species groups (case-insensitive)
 * - CARER: only if the animal is assigned to them
 */
export async function canAccessAnimal(
  userId: string,
  orgId: string,
  animal: { species: string; carerId: string | null }
): Promise<boolean> {
  const member = await getOrgMember(userId, orgId);
  if (!member) {
    // No OrgMember record — default CARER: can only see if assigned to them
    return animal.carerId === userId;
  }

  if (member.role === 'ADMIN') return true;

  if (member.role === 'COORDINATOR') {
    const authorisedSpecies = member.speciesAssignments.flatMap(
      (a) => a.speciesGroup.speciesNames.map(normaliseSpecies)
    );
    return authorisedSpecies.includes(normaliseSpecies(animal.species));
  }

  // CARER
  return animal.carerId === userId;
}

// ─── Role Management ─────────────────────────────────────────────────────────

/**
 * Set a user's role within an organisation (upsert).
 * Prevents demotion of the last ADMIN in an org.
 * Wrapped in an interactive transaction so the read + write are atomic.
 */
export async function setUserRole(
  userId: string,
  orgId: string,
  role: OrgRole
) {
  return prisma.$transaction(async (tx) => {
    // Prevent removing the last ADMIN
    if (role !== 'ADMIN') {
      const currentMember = await tx.orgMember.findUnique({
        where: { userId_orgId: { userId, orgId } },
      });
      if (currentMember?.role === 'ADMIN') {
        const adminCount = await tx.orgMember.count({
          where: { orgId, role: 'ADMIN' },
        });
        if (adminCount <= 1) {
          throw new Error('Cannot demote the last admin in the organisation');
        }
      }
    }

    return tx.orgMember.upsert({
      where: { userId_orgId: { userId, orgId } },
      create: { userId, orgId, role },
      update: { role },
    });
  });
}

/**
 * List all OrgMember records for an organisation.
 */
export async function listOrgMembers(orgId: string) {
  return prisma.orgMember.findMany({
    where: { orgId },
    include: {
      speciesAssignments: {
        include: { speciesGroup: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

// ─── Species Group Management ────────────────────────────────────────────────

export async function listSpeciesGroups(orgId: string) {
  return prisma.speciesGroup.findMany({
    where: { orgId },
    include: {
      coordinators: {
        include: { orgMember: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function createSpeciesGroup(data: {
  slug: string;
  name: string;
  description?: string;
  speciesNames: string[];
  orgId: string;
}) {
  return prisma.speciesGroup.create({ data });
}

/**
 * Update a species group. Scoped by orgId to prevent cross-tenant modification.
 * Only allows updating safe fields (name, slug, description, speciesNames).
 */
export async function updateSpeciesGroup(
  id: string,
  orgId: string,
  data: { name?: string; slug?: string; description?: string; speciesNames?: string[] }
) {
  // Allowlist only safe fields — never allow orgId, id, createdAt, updatedAt
  const safeData: Record<string, unknown> = {};
  if (data.name !== undefined) safeData.name = data.name;
  if (data.slug !== undefined) safeData.slug = data.slug;
  if (data.description !== undefined) safeData.description = data.description;
  if (data.speciesNames !== undefined) safeData.speciesNames = data.speciesNames;

  if (Object.keys(safeData).length === 0) {
    throw new Error('No valid fields to update');
  }

  const result = await prisma.speciesGroup.updateMany({
    where: { id, orgId },
    data: safeData,
  });
  if (result.count === 0) {
    throw new Error('Species group not found');
  }
  return prisma.speciesGroup.findUnique({ where: { id } });
}

/**
 * Delete a species group. Scoped by orgId to prevent cross-tenant deletion.
 */
export async function deleteSpeciesGroup(id: string, orgId: string) {
  // First verify the group belongs to this org
  const group = await prisma.speciesGroup.findFirst({
    where: { id, orgId },
  });
  if (!group) {
    throw new Error('Species group not found');
  }
  return prisma.speciesGroup.delete({ where: { id } });
}

// ─── Coordinator ↔ Species Group Assignment ──────────────────────────────────

/**
 * Assign a coordinator to a species group.
 * Validates that both the OrgMember and SpeciesGroup belong to the same org.
 */
export async function assignCoordinatorToSpeciesGroup(
  orgMemberId: string,
  speciesGroupId: string,
  orgId: string
) {
  // Verify both belong to the same org
  const [member, group] = await Promise.all([
    prisma.orgMember.findFirst({ where: { id: orgMemberId, orgId } }),
    prisma.speciesGroup.findFirst({ where: { id: speciesGroupId, orgId } }),
  ]);
  if (!member) throw new Error('OrgMember not found in this organisation');
  if (!group) throw new Error('Species group not found in this organisation');

  return prisma.coordinatorSpeciesAssignment.create({
    data: { orgMemberId, speciesGroupId },
  });
}

/**
 * Remove a coordinator from a species group.
 * Validates that the OrgMember belongs to the caller's org.
 */
export async function removeCoordinatorFromSpeciesGroup(
  orgMemberId: string,
  speciesGroupId: string,
  orgId: string
) {
  // Verify both belong to the same org
  const [member, group] = await Promise.all([
    prisma.orgMember.findFirst({ where: { id: orgMemberId, orgId } }),
    prisma.speciesGroup.findFirst({ where: { id: speciesGroupId, orgId } }),
  ]);
  if (!member) throw new Error('OrgMember not found in this organisation');
  if (!group) throw new Error('Species group not found in this organisation');

  return prisma.coordinatorSpeciesAssignment.delete({
    where: {
      orgMemberId_speciesGroupId: { orgMemberId, speciesGroupId },
    },
  });
}
