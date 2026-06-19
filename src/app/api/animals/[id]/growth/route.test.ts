import { describe, it, expect, beforeEach, vi } from 'vitest';

const {
  mockAuth,
  mockGetUserRole,
  mockCanAccessAnimal,
  mockHasPermission,
  mockAnimalFindFirst,
  mockGrowthFindMany,
  mockGrowthCreate,
  mockGrowthFindFirst,
  mockGrowthDelete,
  mockLogAudit,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetUserRole: vi.fn(),
  mockCanAccessAnimal: vi.fn(),
  mockHasPermission: vi.fn(),
  mockAnimalFindFirst: vi.fn(),
  mockGrowthFindMany: vi.fn(),
  mockGrowthCreate: vi.fn(),
  mockGrowthFindFirst: vi.fn(),
  mockGrowthDelete: vi.fn(),
  mockLogAudit: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/rbac', () => ({
  getUserRole: mockGetUserRole,
  canAccessAnimal: mockCanAccessAnimal,
  hasPermission: mockHasPermission,
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    animal: { findFirst: mockAnimalFindFirst },
    growthMeasurement: {
      findMany: mockGrowthFindMany,
      create: mockGrowthCreate,
      findFirst: mockGrowthFindFirst,
      delete: mockGrowthDelete,
    },
  },
}));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));

import { GET, POST } from './route';
import { DELETE } from './[measurementId]/route';

const D = new Date('2026-01-01T00:00:00.000Z');
const measurement = {
  id: 'm-1', animalId: 'animal-1', date: D, weightGrams: 420, headLengthMm: null, earLengthMm: null,
  armLengthMm: null, legLengthMm: null, footLengthMm: null, tailLengthMm: null, bodyLengthMm: null,
  wingLengthMm: null, notes: null, createdAt: D, updatedAt: D, clerkUserId: 'user-1', clerkOrganizationId: 'org-1',
};
const idCtx = { params: Promise.resolve({ id: 'animal-1' }) };
const mCtx = { params: Promise.resolve({ id: 'animal-1', measurementId: 'm-1' }) };

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
  mockGetUserRole.mockResolvedValue('ADMIN');
  mockAnimalFindFirst.mockResolvedValue({ id: 'animal-1', carerId: null, clerkOrganizationId: 'org-1' });
});

describe('GET /api/animals/[id]/growth', () => {
  it('returns 200 with measurements passing the schema', async () => {
    mockGrowthFindMany.mockResolvedValue([measurement]);
    const res = await GET(new Request('http://t.localhost/api/animals/animal-1/growth'), idCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].weightGrams).toBe(420);
    expect(body[0].date).toBe('2026-01-01T00:00:00.000Z');
  });

  it('returns 404 when the animal is not found', async () => {
    mockAnimalFindFirst.mockResolvedValue(null);
    const res = await GET(new Request('http://t.localhost/api/animals/animal-1/growth'), idCtx);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/animals/[id]/growth', () => {
  function postReq(body: unknown) {
    return new Request('http://t.localhost/api/animals/animal-1/growth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('returns 400 when date is missing', async () => {
    const res = await POST(postReq({ weightGrams: 10 }), idCtx);
    expect(res.status).toBe(400);
    expect(mockGrowthCreate).not.toHaveBeenCalled();
  });

  it('creates and returns 201 with a schema-valid measurement', async () => {
    mockGrowthCreate.mockResolvedValue(measurement);
    const res = await POST(postReq({ date: '2026-01-01T00:00:00.000Z', weightGrams: 420 }), idCtx);
    expect(res.status).toBe(201);
    expect((await res.json()).id).toBe('m-1');
  });
});

describe('DELETE /api/animals/[id]/growth/[measurementId]', () => {
  beforeEach(() => {
    mockGrowthFindFirst.mockResolvedValue(measurement);
    mockGrowthDelete.mockResolvedValue(measurement);
    mockHasPermission.mockReturnValue(true);
  });

  it('deletes and returns 200 { success: true }', async () => {
    const res = await DELETE(new Request('http://t.localhost/x', { method: 'DELETE' }), mCtx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('returns 404 when the measurement is not found', async () => {
    mockGrowthFindFirst.mockResolvedValue(null);
    const res = await DELETE(new Request('http://t.localhost/x', { method: 'DELETE' }), mCtx);
    expect(res.status).toBe(404);
  });
});
