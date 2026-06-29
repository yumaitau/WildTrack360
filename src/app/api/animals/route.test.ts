import { describe, it, expect, beforeEach, vi } from 'vitest';

const {
  mockAuth,
  mockGetUserRole,
  mockGetAuthorisedSpecies,
  mockHasPermission,
  mockFindMany,
  mockCreateAnimal,
  mockLogAudit,
  mockCommitAnimalId,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetUserRole: vi.fn(),
  mockGetAuthorisedSpecies: vi.fn(),
  mockHasPermission: vi.fn(),
  mockFindMany: vi.fn(),
  mockCreateAnimal: vi.fn(),
  mockLogAudit: vi.fn(),
  mockCommitAnimalId: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/rbac', () => ({
  getUserRole: mockGetUserRole,
  getAuthorisedSpecies: mockGetAuthorisedSpecies,
  hasPermission: mockHasPermission,
}));
vi.mock('@/lib/prisma', () => ({ prisma: { animal: { findMany: mockFindMany } } }));
vi.mock('@/lib/database', () => ({ createAnimal: mockCreateAnimal }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/animalId/generate', () => ({ commitAnimalId: mockCommitAnimalId }));

import { GET, POST } from './route';

const D = new Date('2026-01-01T00:00:00.000Z');

// A complete, realistically-typed Prisma Animal (Date objects, all scalar fields).
const baseAnimal = {
  id: 'animal-1',
  name: 'Joey',
  species: 'Eastern Grey Kangaroo',
  sex: 'Female',
  ageClass: 'Juvenile',
  age: null,
  dateOfBirth: null,
  status: 'IN_CARE',
  dateFound: D,
  dateReleased: null,
  outcomeDate: null,
  outcome: null,
  photo: null,
  notes: null,
  rescueLocation: null,
  rescueCoordinates: { lat: -35.28, lng: 149.13 },
  rescueAddress: null,
  rescueSuburb: null,
  rescuePostcode: null,
  releaseLocation: null,
  releaseCoordinates: null,
  releaseNotes: null,
  releaseAddress: null,
  releaseSuburb: null,
  releasePostcode: null,
  encounterType: null,
  initialWeightGrams: 420,
  weightUnit: 'g',
  animalCondition: null,
  pouchCondition: null,
  fate: null,
  tagBandColourNumber: null,
  microchipNumber: null,
  lifeStage: null,
  dateAdmitted: null,
  orgAnimalId: 'ORG-2026-0001',
  outcomeReason: null,
  sourceOrgAnimalId: null,
  interOrgTransferReceived: false,
  createdAt: D,
  updatedAt: D,
  clerkUserId: 'user-1',
  clerkOrganizationId: 'org-1',
  carerId: null,
};

const animalWithRelations = {
  ...baseAnimal,
  carer: {
    id: 'carer-1',
    phone: null,
    licenseNumber: 'LIC-1',
    jurisdiction: 'NSW',
    specialties: ['Macropods'],
    active: true,
    createdAt: D,
    updatedAt: D,
    clerkOrganizationId: 'org-1',
    // extra field the lite schema does not model - must be tolerated:
    notes: 'experienced carer',
  },
  records: [
    {
      id: 'rec-1',
      type: 'MEDICAL',
      date: D,
      description: 'Initial check',
      location: null,
      notes: null,
      createdAt: D,
      updatedAt: D,
      clerkUserId: 'user-1',
      clerkOrganizationId: 'org-1',
      animalId: 'animal-1',
    },
  ],
  photos: [
    {
      id: 'photo-1',
      url: 'https://example.com/p.jpg',
      description: 'intake',
      date: D,
      createdAt: D,
      updatedAt: D,
      clerkUserId: 'user-1',
      clerkOrganizationId: 'org-1',
      animalId: 'animal-1',
    },
  ],
};

function req(method: 'GET' | 'POST', body?: unknown) {
  return new Request('http://tenant.localhost/api/animals', {
    method,
    ...(body !== undefined
      ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
  });
}

describe('GET /api/animals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockGetUserRole.mockResolvedValue('ADMIN');
    mockFindMany.mockResolvedValue([animalWithRelations]);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null, orgId: null });
    const res = await GET(req('GET'));
    expect(res.status).toBe(401);
  });

  it('returns 200 and the payload passes the AnimalWithRelations schema (no validation throw)', async () => {
    const res = await GET(req('GET'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].id).toBe('animal-1');
    expect(body[0].dateFound).toBe('2026-01-01T00:00:00.000Z');
    expect(body[0].records).toHaveLength(1);
    expect(body[0].carer.notes).toBe('experienced carer'); // extra field preserved in the response
  });
});

describe('POST /api/animals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockGetUserRole.mockResolvedValue('ADMIN');
    mockHasPermission.mockReturnValue(true);
    mockCreateAnimal.mockResolvedValue(baseAnimal);
  });

  it('returns 400 for an invalid body (missing required fields) without creating', async () => {
    const res = await POST(req('POST', { species: 'Koala' })); // no name/status/dateFound
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid request');
    expect(mockCreateAnimal).not.toHaveBeenCalled();
  });

  it('creates an animal and returns 201 with a schema-valid body', async () => {
    const res = await POST(
      req('POST', {
        name: 'Joey',
        species: 'Eastern Grey Kangaroo',
        status: 'IN_CARE',
        dateFound: '2026-01-01T00:00:00.000Z',
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('animal-1');
    expect(body.status).toBe('IN_CARE');
    expect(mockCreateAnimal).toHaveBeenCalledOnce();
  });

  it('returns 403 when the role lacks animal:create permission', async () => {
    mockHasPermission.mockReturnValue(false);
    const res = await POST(
      req('POST', { name: 'Joey', species: 'Koala', status: 'IN_CARE', dateFound: '2026-01-01' }),
    );
    expect(res.status).toBe(403);
    expect(mockCreateAnimal).not.toHaveBeenCalled();
  });
});
