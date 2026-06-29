import { describe, it, expect, beforeEach, vi } from 'vitest';

const {
  mockAuth,
  mockGetUserRole,
  mockCanAccessAnimal,
  mockHasPermission,
  mockFindFirst,
  mockUpdateAnimal,
  mockDeleteAnimal,
  mockLogAudit,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetUserRole: vi.fn(),
  mockCanAccessAnimal: vi.fn(),
  mockHasPermission: vi.fn(),
  mockFindFirst: vi.fn(),
  mockUpdateAnimal: vi.fn(),
  mockDeleteAnimal: vi.fn(),
  mockLogAudit: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/rbac', () => ({
  getUserRole: mockGetUserRole,
  canAccessAnimal: mockCanAccessAnimal,
  hasPermission: mockHasPermission,
}));
vi.mock('@/lib/prisma', () => ({ prisma: { animal: { findFirst: mockFindFirst } } }));
vi.mock('@/lib/database', () => ({ updateAnimal: mockUpdateAnimal, deleteAnimal: mockDeleteAnimal }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));

import { PATCH, DELETE } from './route';

const D = new Date('2026-01-01T00:00:00.000Z');
const animal = {
  id: 'animal-1', name: 'Joey', species: 'Eastern Grey Kangaroo', sex: null, ageClass: null, age: null,
  dateOfBirth: null, status: 'IN_CARE', dateFound: D, dateReleased: null, outcomeDate: null, outcome: null,
  photo: null, notes: null, rescueLocation: null, rescueCoordinates: null, rescueAddress: null,
  rescueSuburb: null, rescuePostcode: null, releaseLocation: null, releaseCoordinates: null, releaseNotes: null,
  releaseAddress: null, releaseSuburb: null, releasePostcode: null, encounterType: null, initialWeightGrams: null,
  weightUnit: 'g', animalCondition: null, pouchCondition: null, fate: null, tagBandColourNumber: null,
  microchipNumber: null, lifeStage: null, dateAdmitted: null, orgAnimalId: 'ORG-2026-0001', outcomeReason: null,
  sourceOrgAnimalId: null, interOrgTransferReceived: false, createdAt: D, updatedAt: D, clerkUserId: 'user-1',
  clerkOrganizationId: 'org-1', carerId: null,
};

function patchReq(body: unknown) {
  return new Request('http://t.localhost/api/animals/animal-1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
const ctx = { params: Promise.resolve({ id: 'animal-1' }) };

describe('PATCH /api/animals/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockGetUserRole.mockResolvedValue('ADMIN');
    mockFindFirst.mockResolvedValue(animal);
    mockUpdateAnimal.mockResolvedValue({ ...animal, name: 'Updated' });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null, orgId: null });
    const res = await PATCH(patchReq({ name: 'Updated' }), ctx);
    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid status value', async () => {
    const res = await PATCH(patchReq({ status: 'NOPE' }), ctx);
    expect(res.status).toBe(400);
    expect(mockUpdateAnimal).not.toHaveBeenCalled();
  });

  it('returns 404 when the animal does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);
    const res = await PATCH(patchReq({ name: 'Updated' }), ctx);
    expect(res.status).toBe(404);
  });

  it('updates and returns 200 with a schema-valid animal', async () => {
    const res = await PATCH(patchReq({ name: 'Updated' }), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Updated');
    expect(body.dateFound).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('DELETE /api/animals/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockGetUserRole.mockResolvedValue('ADMIN');
    mockHasPermission.mockReturnValue(true);
    mockDeleteAnimal.mockResolvedValue(undefined);
  });

  it('deletes and returns 200 { ok: true } for an admin', async () => {
    const res = await DELETE(new Request('http://t.localhost/api/animals/animal-1', { method: 'DELETE' }), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockDeleteAnimal).toHaveBeenCalledWith('animal-1', 'org-1');
  });

  it('returns 403 when the role lacks animal:delete', async () => {
    mockHasPermission.mockReturnValue(false);
    const res = await DELETE(new Request('http://t.localhost/api/animals/animal-1', { method: 'DELETE' }), ctx);
    expect(res.status).toBe(403);
    expect(mockDeleteAnimal).not.toHaveBeenCalled();
  });
});
