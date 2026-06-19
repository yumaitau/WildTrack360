import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockAuth, mockPrisma, mockLogAudit, mockClerkClient } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    callLog: { findMany: vi.fn(), create: vi.fn() },
    animal: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
  mockLogAudit: vi.fn(),
  mockClerkClient: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth, clerkClient: mockClerkClient }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));

import { GET, POST } from './route';

const D = new Date('2026-01-01T00:00:00.000Z');

const baseCallLog = {
  id: 'log-1',
  dateTime: D,
  status: 'OPEN',
  callerName: 'Jane Smith',
  callerPhone: '0400000000',
  callerEmail: null,
  species: 'Possum',
  location: 'Park',
  coordinates: null,
  suburb: 'Sydney',
  postcode: '2000',
  notes: null,
  reason: null,
  referrer: null,
  action: null,
  outcome: null,
  takenByUserId: 'user-1',
  takenByUserName: 'Test User',
  assignedToUserId: null,
  assignedToUserName: null,
  animalId: null,
  clerkOrganizationId: 'org-1',
  createdAt: D,
  updatedAt: D,
};

function getReq() {
  return new Request('http://t.localhost/api/call-logs', { method: 'GET' });
}

function postReq(body: unknown) {
  return new Request('http://t.localhost/api/call-logs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/call-logs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockPrisma.callLog.findMany.mockResolvedValue([baseCallLog]);
  });

  it('returns 200 with schema-valid call log list', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].id).toBe('log-1');
    expect(body[0].callerName).toBe('Jane Smith');
  });
});

describe('POST /api/call-logs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockClerkClient.mockResolvedValue({ users: { getUser: vi.fn().mockResolvedValue({ firstName: 'Test', lastName: 'User' }) } });
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
    mockPrisma.callLog.create.mockResolvedValue(baseCallLog);
    mockPrisma.animal.findFirst.mockResolvedValue(null);
  });

  it('returns 201 with created call log on valid body', async () => {
    const res = await POST(postReq({ callerName: 'Jane Smith', species: 'Possum' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('log-1');
    expect(body.callerName).toBe('Jane Smith');
  });
});
