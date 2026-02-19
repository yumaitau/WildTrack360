import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma (hoisted so vi.mock factory can reference it) ──────────────
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    orgMember: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
    },
    speciesGroup: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    coordinatorSpeciesAssignment: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    // $transaction executes the callback with the mock itself as the tx client
    $transaction: vi.fn((cb: (tx: any) => any) => cb(mock)),
  };
  return { mockPrisma: mock };
});

vi.mock('./prisma', () => ({ prisma: mockPrisma }));

import {
  getUserRole,
  hasPermission,
  hasMinimumRole,
  requirePermission,
  requireMinimumRole,
  getAuthorisedSpecies,
  canAccessAnimal,
  setUserRole,
  updateSpeciesGroup,
  deleteSpeciesGroup,
  assignCoordinatorToSpeciesGroup,
  removeCoordinatorFromSpeciesGroup,
} from './rbac';
import type { Permission } from './rbac';

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Permission Matrix ───────────────────────────────────────────────────────

describe('hasPermission', () => {
  it('ADMIN has all permissions', () => {
    const allPermissions: Permission[] = [
      'animal:view_all', 'animal:view_species_group', 'animal:view_own',
      'animal:create', 'animal:assign', 'animal:edit_any', 'animal:edit_own',
      'animal:delete', 'user:manage', 'species_group:manage',
      'coordinator:assign', 'report:view_org', 'report:view_species',
      'report:export', 'settings:manage', 'carer:view_workload',
    ];
    for (const p of allPermissions) {
      expect(hasPermission('ADMIN', p)).toBe(true);
    }
  });

  it('COORDINATOR has expected permissions', () => {
    expect(hasPermission('COORDINATOR', 'animal:view_species_group')).toBe(true);
    expect(hasPermission('COORDINATOR', 'animal:create')).toBe(true);
    expect(hasPermission('COORDINATOR', 'animal:assign')).toBe(true);
    expect(hasPermission('COORDINATOR', 'report:view_species')).toBe(true);
    expect(hasPermission('COORDINATOR', 'carer:view_workload')).toBe(true);
  });

  it('COORDINATOR does NOT have admin-only permissions', () => {
    expect(hasPermission('COORDINATOR', 'animal:view_all')).toBe(false);
    expect(hasPermission('COORDINATOR', 'animal:delete')).toBe(false);
    expect(hasPermission('COORDINATOR', 'user:manage')).toBe(false);
    expect(hasPermission('COORDINATOR', 'species_group:manage')).toBe(false);
    expect(hasPermission('COORDINATOR', 'settings:manage')).toBe(false);
  });

  it('CARER only has view_own and edit_own', () => {
    expect(hasPermission('CARER', 'animal:view_own')).toBe(true);
    expect(hasPermission('CARER', 'animal:edit_own')).toBe(true);
    expect(hasPermission('CARER', 'animal:create')).toBe(false);
    expect(hasPermission('CARER', 'animal:delete')).toBe(false);
    expect(hasPermission('CARER', 'user:manage')).toBe(false);
    expect(hasPermission('CARER', 'report:view_org')).toBe(false);
  });
});

// ─── Role Hierarchy ──────────────────────────────────────────────────────────

describe('hasMinimumRole', () => {
  it('ADMIN meets all minimum roles', () => {
    expect(hasMinimumRole('ADMIN', 'ADMIN')).toBe(true);
    expect(hasMinimumRole('ADMIN', 'COORDINATOR')).toBe(true);
    expect(hasMinimumRole('ADMIN', 'CARER')).toBe(true);
  });

  it('COORDINATOR meets COORDINATOR and CARER but not ADMIN', () => {
    expect(hasMinimumRole('COORDINATOR', 'ADMIN')).toBe(false);
    expect(hasMinimumRole('COORDINATOR', 'COORDINATOR')).toBe(true);
    expect(hasMinimumRole('COORDINATOR', 'CARER')).toBe(true);
  });

  it('CARER only meets CARER', () => {
    expect(hasMinimumRole('CARER', 'ADMIN')).toBe(false);
    expect(hasMinimumRole('CARER', 'COORDINATOR')).toBe(false);
    expect(hasMinimumRole('CARER', 'CARER')).toBe(true);
  });
});

// ─── getUserRole ─────────────────────────────────────────────────────────────

describe('getUserRole', () => {
  it('returns role from OrgMember record', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue({ role: 'COORDINATOR' });
    const role = await getUserRole('user1', 'org1');
    expect(role).toBe('COORDINATOR');
  });

  it('falls back to CARER when no OrgMember exists', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue(null);
    const role = await getUserRole('user1', 'org1');
    expect(role).toBe('CARER');
  });
});

// ─── requirePermission ───────────────────────────────────────────────────────

describe('requirePermission', () => {
  it('returns role when permission is granted', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue({ role: 'ADMIN' });
    const role = await requirePermission('user1', 'org1', 'user:manage');
    expect(role).toBe('ADMIN');
  });

  it('throws Forbidden when permission is denied', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue({ role: 'CARER' });
    await expect(requirePermission('user1', 'org1', 'user:manage'))
      .rejects.toThrow('Forbidden');
  });

  it('throws Forbidden for unmigrated users (no OrgMember)', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue(null);
    await expect(requirePermission('user1', 'org1', 'animal:create'))
      .rejects.toThrow('Forbidden');
  });
});

// ─── requireMinimumRole ──────────────────────────────────────────────────────

describe('requireMinimumRole', () => {
  it('returns role when minimum is met', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue({ role: 'ADMIN' });
    const role = await requireMinimumRole('user1', 'org1', 'COORDINATOR');
    expect(role).toBe('ADMIN');
  });

  it('throws Forbidden when below minimum', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue({ role: 'CARER' });
    await expect(requireMinimumRole('user1', 'org1', 'COORDINATOR'))
      .rejects.toThrow('Forbidden');
  });
});

// ─── getAuthorisedSpecies (SBAC) ─────────────────────────────────────────────

describe('getAuthorisedSpecies', () => {
  it('returns null for ADMIN (unrestricted access)', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue({
      role: 'ADMIN',
      speciesAssignments: [],
    });
    const result = await getAuthorisedSpecies('admin1', 'org1');
    expect(result).toBeNull();
  });

  it('returns normalised species list for COORDINATOR', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue({
      role: 'COORDINATOR',
      speciesAssignments: [
        { speciesGroup: { speciesNames: ['Eastern Grey Kangaroo', 'Red Kangaroo'] } },
        { speciesGroup: { speciesNames: ['Wallaroo'] } },
      ],
    });
    const result = await getAuthorisedSpecies('coord1', 'org1');
    expect(result).toEqual(['eastern grey kangaroo', 'red kangaroo', 'wallaroo']);
  });

  it('deduplicates species names', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue({
      role: 'COORDINATOR',
      speciesAssignments: [
        { speciesGroup: { speciesNames: ['Koala'] } },
        { speciesGroup: { speciesNames: ['Koala', 'Wombat'] } },
      ],
    });
    const result = await getAuthorisedSpecies('coord1', 'org1');
    expect(result).toEqual(['koala', 'wombat']);
  });

  it('returns empty array for CARER', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue({
      role: 'CARER',
      speciesAssignments: [],
    });
    const result = await getAuthorisedSpecies('carer1', 'org1');
    expect(result).toEqual([]);
  });

  it('returns empty array when no OrgMember record exists', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue(null);
    const result = await getAuthorisedSpecies('unknown', 'org1');
    expect(result).toEqual([]);
  });
});

// ─── canAccessAnimal (SBAC) ──────────────────────────────────────────────────

describe('canAccessAnimal', () => {
  it('ADMIN can always access any animal', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue({
      role: 'ADMIN',
      speciesAssignments: [],
    });
    const result = await canAccessAnimal('admin1', 'org1', {
      species: 'Platypus',
      carerId: 'someone-else',
    });
    expect(result).toBe(true);
  });

  it('COORDINATOR can access animal in their species group', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue({
      role: 'COORDINATOR',
      speciesAssignments: [
        { speciesGroup: { speciesNames: ['Eastern Grey Kangaroo'] } },
      ],
    });
    const result = await canAccessAnimal('coord1', 'org1', {
      species: 'Eastern Grey Kangaroo',
      carerId: null,
    });
    expect(result).toBe(true);
  });

  it('COORDINATOR species matching is case-insensitive', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue({
      role: 'COORDINATOR',
      speciesAssignments: [
        { speciesGroup: { speciesNames: ['eastern grey kangaroo'] } },
      ],
    });
    const result = await canAccessAnimal('coord1', 'org1', {
      species: 'Eastern Grey KANGAROO',
      carerId: null,
    });
    expect(result).toBe(true);
  });

  it('COORDINATOR can access animals assigned to them even if species not in group', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue({
      role: 'COORDINATOR',
      speciesAssignments: [
        { speciesGroup: { speciesNames: ['Koala'] } },
      ],
    });
    const result = await canAccessAnimal('coord1', 'org1', {
      species: 'Platypus',
      carerId: 'coord1',
    });
    expect(result).toBe(true);
  });

  it('COORDINATOR cannot access animal outside their species group and not assigned', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue({
      role: 'COORDINATOR',
      speciesAssignments: [
        { speciesGroup: { speciesNames: ['Koala'] } },
      ],
    });
    const result = await canAccessAnimal('coord1', 'org1', {
      species: 'Platypus',
      carerId: 'someone-else',
    });
    expect(result).toBe(false);
  });

  it('CARER can only access animals assigned to them', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue({
      role: 'CARER',
      speciesAssignments: [],
    });
    expect(await canAccessAnimal('carer1', 'org1', {
      species: 'Koala', carerId: 'carer1',
    })).toBe(true);
    expect(await canAccessAnimal('carer1', 'org1', {
      species: 'Koala', carerId: 'someone-else',
    })).toBe(false);
  });

  it('user with no OrgMember record can only see assigned animals', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue(null);
    expect(await canAccessAnimal('new-user', 'org1', {
      species: 'Koala', carerId: 'new-user',
    })).toBe(true);
    expect(await canAccessAnimal('new-user', 'org1', {
      species: 'Koala', carerId: null,
    })).toBe(false);
  });
});

// ─── setUserRole ─────────────────────────────────────────────────────────────

describe('setUserRole', () => {
  it('creates a new OrgMember when none exists', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue(null);
    mockPrisma.orgMember.upsert.mockResolvedValue({ userId: 'u1', orgId: 'o1', role: 'COORDINATOR' });

    await setUserRole('u1', 'o1', 'COORDINATOR');
    expect(mockPrisma.orgMember.upsert).toHaveBeenCalledWith({
      where: { userId_orgId_environment: { userId: 'u1', orgId: 'o1', environment: 'PRODUCTION' } },
      create: { userId: 'u1', orgId: 'o1', role: 'COORDINATOR' },
      update: { role: 'COORDINATOR' },
    });
  });

  it('prevents demoting the last ADMIN', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue({ role: 'ADMIN' });
    mockPrisma.orgMember.count.mockResolvedValue(1);

    await expect(setUserRole('u1', 'o1', 'CARER'))
      .rejects.toThrow('Cannot demote the last admin in the organisation');
  });

  it('allows demoting an ADMIN when there are other ADMINs', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue({ role: 'ADMIN' });
    mockPrisma.orgMember.count.mockResolvedValue(2);
    mockPrisma.orgMember.upsert.mockResolvedValue({ userId: 'u1', orgId: 'o1', role: 'COORDINATOR' });

    await setUserRole('u1', 'o1', 'COORDINATOR');
    expect(mockPrisma.orgMember.upsert).toHaveBeenCalled();
  });

  it('does not check admin count when promoting to ADMIN', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue({ role: 'CARER' });
    mockPrisma.orgMember.upsert.mockResolvedValue({ userId: 'u1', orgId: 'o1', role: 'ADMIN' });

    await setUserRole('u1', 'o1', 'ADMIN');
    expect(mockPrisma.orgMember.count).not.toHaveBeenCalled();
  });
});

// ─── Species Group Management ────────────────────────────────────────────────

describe('updateSpeciesGroup', () => {
  it('scopes update by orgId (cross-tenant protection)', async () => {
    mockPrisma.speciesGroup.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.speciesGroup.findUnique.mockResolvedValue({ id: 'sg1', name: 'Macropods' });

    await updateSpeciesGroup('sg1', 'org1', { name: 'Macropods Updated' });

    expect(mockPrisma.speciesGroup.updateMany).toHaveBeenCalledWith({
      where: { id: 'sg1', orgId: 'org1' },
      data: { name: 'Macropods Updated' },
    });
  });

  it('throws when species group not found in org', async () => {
    mockPrisma.speciesGroup.updateMany.mockResolvedValue({ count: 0 });

    await expect(updateSpeciesGroup('sg1', 'other-org', { name: 'hack' }))
      .rejects.toThrow('Species group not found');
  });

  it('only passes safe fields', async () => {
    mockPrisma.speciesGroup.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.speciesGroup.findUnique.mockResolvedValue({ id: 'sg1' });

    await updateSpeciesGroup('sg1', 'org1', {
      name: 'Test', slug: 'test', description: 'desc', speciesNames: ['Koala'],
    });

    const calledData = mockPrisma.speciesGroup.updateMany.mock.calls[0][0].data;
    expect(calledData).toEqual({
      name: 'Test', slug: 'test', description: 'desc', speciesNames: ['Koala'],
    });
  });

  it('throws when no valid fields provided', async () => {
    await expect(updateSpeciesGroup('sg1', 'org1', {} as any))
      .rejects.toThrow('No valid fields to update');

    expect(mockPrisma.speciesGroup.updateMany).not.toHaveBeenCalled();
  });
});

describe('deleteSpeciesGroup', () => {
  it('scopes deletion by orgId', async () => {
    mockPrisma.speciesGroup.findFirst.mockResolvedValue({ id: 'sg1', orgId: 'org1' });
    mockPrisma.speciesGroup.delete.mockResolvedValue({});

    await deleteSpeciesGroup('sg1', 'org1');
    expect(mockPrisma.speciesGroup.findFirst).toHaveBeenCalledWith({
      where: { id: 'sg1', orgId: 'org1' },
    });
  });

  it('throws when species group does not belong to org', async () => {
    mockPrisma.speciesGroup.findFirst.mockResolvedValue(null);

    await expect(deleteSpeciesGroup('sg1', 'wrong-org'))
      .rejects.toThrow('Species group not found');
    expect(mockPrisma.speciesGroup.delete).not.toHaveBeenCalled();
  });
});

// ─── Coordinator Assignment ──────────────────────────────────────────────────

describe('assignCoordinatorToSpeciesGroup', () => {
  it('succeeds when both belong to same org', async () => {
    mockPrisma.orgMember.findFirst.mockResolvedValue({ id: 'member1', orgId: 'org1' });
    mockPrisma.speciesGroup.findFirst.mockResolvedValue({ id: 'sg1', orgId: 'org1' });
    mockPrisma.coordinatorSpeciesAssignment.create.mockResolvedValue({});

    await assignCoordinatorToSpeciesGroup('member1', 'sg1', 'org1');
    expect(mockPrisma.coordinatorSpeciesAssignment.create).toHaveBeenCalledWith({
      data: { orgMemberId: 'member1', speciesGroupId: 'sg1' },
    });
  });

  it('throws when OrgMember is from different org', async () => {
    mockPrisma.orgMember.findFirst.mockResolvedValue(null);
    mockPrisma.speciesGroup.findFirst.mockResolvedValue({ id: 'sg1' });

    await expect(assignCoordinatorToSpeciesGroup('member1', 'sg1', 'org1'))
      .rejects.toThrow('OrgMember not found in this organisation');
  });

  it('throws when SpeciesGroup is from different org', async () => {
    mockPrisma.orgMember.findFirst.mockResolvedValue({ id: 'member1' });
    mockPrisma.speciesGroup.findFirst.mockResolvedValue(null);

    await expect(assignCoordinatorToSpeciesGroup('member1', 'sg1', 'org1'))
      .rejects.toThrow('Species group not found in this organisation');
  });
});

describe('removeCoordinatorFromSpeciesGroup', () => {
  it('succeeds when both belong to same org', async () => {
    mockPrisma.orgMember.findFirst.mockResolvedValue({ id: 'member1', orgId: 'org1' });
    mockPrisma.speciesGroup.findFirst.mockResolvedValue({ id: 'sg1', orgId: 'org1' });
    mockPrisma.coordinatorSpeciesAssignment.delete.mockResolvedValue({});

    await removeCoordinatorFromSpeciesGroup('member1', 'sg1', 'org1');
    expect(mockPrisma.coordinatorSpeciesAssignment.delete).toHaveBeenCalled();
  });

  it('throws when member is from different org', async () => {
    mockPrisma.orgMember.findFirst.mockResolvedValue(null);
    mockPrisma.speciesGroup.findFirst.mockResolvedValue({ id: 'sg1', orgId: 'org1' });

    await expect(removeCoordinatorFromSpeciesGroup('member1', 'sg1', 'org1'))
      .rejects.toThrow('OrgMember not found in this organisation');
  });

  it('throws when species group is from different org', async () => {
    mockPrisma.orgMember.findFirst.mockResolvedValue({ id: 'member1', orgId: 'org1' });
    mockPrisma.speciesGroup.findFirst.mockResolvedValue(null);

    await expect(removeCoordinatorFromSpeciesGroup('member1', 'sg1', 'org1'))
      .rejects.toThrow('Species group not found in this organisation');
  });
});
