import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockAuth, mockPrisma, mockLogAudit, mockGetUserRole, mockHasPermission } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    animalTransfer: { findMany: vi.fn(), create: vi.fn() },
    animal: { findFirst: vi.fn(), update: vi.fn() },
    carerProfile: { findFirst: vi.fn() },
    permanentCareApplication: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
  mockLogAudit: vi.fn(),
  mockGetUserRole: vi.fn(),
  mockHasPermission: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/rbac', () => ({ getUserRole: mockGetUserRole, hasPermission: mockHasPermission }));
vi.mock('@/lib/compliance-guardrails', () => ({ validateTransferRecord: () => ({ allowed: true }) }));
vi.mock('@/lib/transfer-effects', () => ({
  animalUpdateForTransfer: () => ({}),
  newAnimalStatusForTransfer: () => 'IN_TRANSFER',
}));

import { GET, POST } from './route';

const D = new Date('2026-01-01T00:00:00.000Z');

const baseTransfer = {
  id: 'transfer-1',
  animalId: 'animal-1',
  transferDate: D,
  transferType: 'VET_TRANSFER',
  reasonForTransfer: 'Vet care',
  fromCarerId: null,
  toCarerId: null,
  receivingEntity: 'Vet Clinic',
  receivingEntityType: null,
  receivingLicense: null,
  receivingContactName: null,
  receivingContactPhone: null,
  receivingContactEmail: null,
  receivingOrgAnimalId: null,
  receivingAuthorityType: null,
  authorityEvidenceUrl: null,
  receivingAddress: null,
  receivingSuburb: null,
  receivingState: null,
  receivingPostcode: null,
  transferAuthorizedBy: null,
  transferNotes: null,
  documents: null,
  clerkUserId: 'user-1',
  clerkOrganizationId: 'org-1',
  createdAt: D,
  updatedAt: D,
  animal: { id: 'animal-1', name: 'Bob', species: 'Echidna' },
};

const baseAnimal = { id: 'animal-1', status: 'INTAKE', carerId: null };

function getReq() {
  return new Request('http://t.localhost/api/transfers', { method: 'GET' });
}

function postReq(body: unknown) {
  return new Request('http://t.localhost/api/transfers', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/transfers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockPrisma.animalTransfer.findMany.mockResolvedValue([baseTransfer]);
  });

  it('returns 200 with schema-valid transfer list', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].id).toBe('transfer-1');
    expect(body[0].transferType).toBe('VET_TRANSFER');
  });
});

describe('POST /api/transfers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockGetUserRole.mockResolvedValue('admin');
    mockHasPermission.mockReturnValue(true);
    mockPrisma.animal.findFirst.mockResolvedValue(baseAnimal);
    mockPrisma.$transaction.mockResolvedValue([baseTransfer, baseAnimal]);
  });

  it('returns 400 when required fields missing before calling transaction', async () => {
    const res = await POST(postReq({}));
    expect(res.status).toBe(400);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns 201 with transfer and updatedAnimal on valid body', async () => {
    const res = await POST(postReq({
      animalId: 'animal-1',
      transferDate: '2026-01-01',
      reasonForTransfer: 'Vet care',
      receivingEntity: 'Vet Clinic',
      transferType: 'VET_TRANSFER',
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.transfer.id).toBe('transfer-1');
    expect(body.updatedAnimal.id).toBe('animal-1');
  });
});
