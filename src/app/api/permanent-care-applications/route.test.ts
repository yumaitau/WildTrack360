import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockAuth, mockPrisma, mockLogAudit, mockGetUserRole, mockHasPermission } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    permanentCareApplication: { findMany: vi.fn(), create: vi.fn() },
    animal: { findFirst: vi.fn() },
  },
  mockLogAudit: vi.fn(),
  mockGetUserRole: vi.fn(),
  mockHasPermission: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/rbac', () => ({ getUserRole: mockGetUserRole, hasPermission: mockHasPermission }));
vi.mock('@/lib/compliance-guardrails', () => ({
  validateApplicationSubmission: () => ({ allowed: true }),
  validateApprovalDetails: () => ({ allowed: true }),
}));

import { GET, POST } from './route';

const D = new Date('2026-01-01T00:00:00.000Z');

const baseApp = {
  id: 'app-1',
  animalId: 'animal-1',
  status: 'DRAFT',
  createdByUserId: 'user-1',
  submittedByUserId: null,
  submittedAt: null,
  nonReleasableReasons: 'Injury',
  euthanasiaJustification: 'Permanent disability',
  vetReportUrl: null,
  vetName: null,
  vetClinic: null,
  vetContact: null,
  keeperName: null,
  facilityName: null,
  facilityAddress: null,
  facilitySuburb: null,
  facilityState: 'NSW',
  facilityPostcode: null,
  category: null,
  notes: null,
  npwsApprovalNumber: null,
  npwsApprovalDate: null,
  rejectionReason: null,
  reviewedByUserId: null,
  reviewedAt: null,
  clerkOrganizationId: 'org-1',
  createdAt: D,
  updatedAt: D,
  animal: { id: 'animal-1', name: 'Bob', species: 'Echidna' },
};

function getReq() {
  return new Request('http://t.localhost/api/permanent-care-applications', { method: 'GET' });
}

function postReq(body: unknown) {
  return new Request('http://t.localhost/api/permanent-care-applications', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/permanent-care-applications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockPrisma.permanentCareApplication.findMany.mockResolvedValue([baseApp]);
  });

  it('returns 200 with schema-valid application list', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].id).toBe('app-1');
    expect(body[0].status).toBe('DRAFT');
  });
});

describe('POST /api/permanent-care-applications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockGetUserRole.mockResolvedValue('admin');
    mockHasPermission.mockReturnValue(true);
    mockPrisma.animal.findFirst.mockResolvedValue({ id: 'animal-1' });
    mockPrisma.permanentCareApplication.create.mockResolvedValue(baseApp);
  });

  it('returns 400 when required fields missing before calling create', async () => {
    const res = await POST(postReq({}));
    expect(res.status).toBe(400);
    expect(mockPrisma.permanentCareApplication.create).not.toHaveBeenCalled();
  });

  it('returns 201 with schema-valid application on valid body', async () => {
    const res = await POST(postReq({
      animalId: 'animal-1',
      nonReleasableReasons: 'Injury',
      euthanasiaJustification: 'Permanent disability',
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('app-1');
    expect(body.status).toBe('DRAFT');
  });
});
