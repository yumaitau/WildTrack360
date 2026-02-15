import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma (hoisted so vi.mock factory can reference it) ──────────────
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    animal: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('./prisma', () => ({ prisma: mockPrisma }));

import { createAnimal, updateAnimal, deleteAnimal } from './database';

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Mass Assignment Protection ──────────────────────────────────────────────

describe('createAnimal – field allowlisting', () => {
  it('passes safe fields through', async () => {
    mockPrisma.animal.create.mockResolvedValue({ id: 'a1' });

    await createAnimal({
      name: 'Joey',
      species: 'Eastern Grey Kangaroo',
      status: 'ADMITTED',
      dateFound: new Date('2025-01-01'),
      clerkUserId: 'user1',
      clerkOrganizationId: 'org1',
    });

    const createCall = mockPrisma.animal.create.mock.calls[0][0];
    expect(createCall.data.name).toBe('Joey');
    expect(createCall.data.species).toBe('Eastern Grey Kangaroo');
    expect(createCall.data.status).toBe('ADMITTED');
    expect(createCall.data.clerkUserId).toBe('user1');
    expect(createCall.data.clerkOrganizationId).toBe('org1');
  });

  it('strips injected fields (id, createdAt) from body data', async () => {
    mockPrisma.animal.create.mockResolvedValue({ id: 'a1' });

    await createAnimal({
      name: 'Joey',
      species: 'Koala',
      clerkUserId: 'server-user',
      clerkOrganizationId: 'server-org',
      id: 'attacker-id',
      createdAt: '2020-01-01',
    });

    const createCall = mockPrisma.animal.create.mock.calls[0][0];
    expect(createCall.data.name).toBe('Joey');
    expect(createCall.data.species).toBe('Koala');
    expect(createCall.data.clerkUserId).toBe('server-user');
    expect(createCall.data.clerkOrganizationId).toBe('server-org');
    expect(createCall.data).not.toHaveProperty('id');
    expect(createCall.data).not.toHaveProperty('createdAt');
  });

  it('converts empty carerId to null', async () => {
    mockPrisma.animal.create.mockResolvedValue({ id: 'a1' });

    await createAnimal({
      name: 'Joey',
      carerId: '',
      clerkUserId: 'u1',
      clerkOrganizationId: 'o1',
    });

    const createCall = mockPrisma.animal.create.mock.calls[0][0];
    expect(createCall.data.carerId).toBeNull();
  });
});

describe('updateAnimal – field allowlisting', () => {
  it('strips dangerous fields from update payload', async () => {
    mockPrisma.animal.update.mockResolvedValue({ id: 'a1' });

    await updateAnimal('a1', {
      name: 'Updated Joey',
      clerkUserId: 'attacker-user',
      clerkOrganizationId: 'attacker-org',
      id: 'new-id',
    });

    const updateCall = mockPrisma.animal.update.mock.calls[0][0];
    expect(updateCall.data.name).toBe('Updated Joey');
    expect(updateCall.data).not.toHaveProperty('clerkUserId');
    expect(updateCall.data).not.toHaveProperty('clerkOrganizationId');
    expect(updateCall.data).not.toHaveProperty('id');
  });

  it('allows all safe fields through', async () => {
    mockPrisma.animal.update.mockResolvedValue({ id: 'a1' });

    await updateAnimal('a1', {
      name: 'Joey',
      species: 'Koala',
      sex: 'MALE',
      status: 'IN_CARE',
      rescueLocation: 'Park',
      rescueSuburb: 'Canberra',
      notes: 'Healthy',
      carerId: 'carer1',
    });

    const updateCall = mockPrisma.animal.update.mock.calls[0][0];
    expect(updateCall.data.name).toBe('Joey');
    expect(updateCall.data.species).toBe('Koala');
    expect(updateCall.data.sex).toBe('MALE');
    expect(updateCall.data.status).toBe('IN_CARE');
    expect(updateCall.data.rescueLocation).toBe('Park');
    expect(updateCall.data.notes).toBe('Healthy');
    expect(updateCall.data.carerId).toBe('carer1');
  });
});

// ─── Cross-Tenant Deletion Protection ────────────────────────────────────────

describe('deleteAnimal – org scoping', () => {
  it('deletes animal when it belongs to the org', async () => {
    mockPrisma.animal.findFirst.mockResolvedValue({ id: 'a1', clerkOrganizationId: 'org1' });
    mockPrisma.animal.delete.mockResolvedValue({});

    await deleteAnimal('a1', 'org1');

    expect(mockPrisma.animal.findFirst).toHaveBeenCalledWith({
      where: { id: 'a1', clerkOrganizationId: 'org1' },
    });
    expect(mockPrisma.animal.delete).toHaveBeenCalledWith({
      where: { id: 'a1' },
    });
  });

  it('throws when animal does not belong to the org', async () => {
    mockPrisma.animal.findFirst.mockResolvedValue(null);

    await expect(deleteAnimal('a1', 'wrong-org'))
      .rejects.toThrow('Animal not found');
    expect(mockPrisma.animal.delete).not.toHaveBeenCalled();
  });
});
