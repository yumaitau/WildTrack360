import { describe, it, expect, beforeEach, vi } from 'vitest';

const {
  mockAuth,
  mockClerkClient,
  mockGetUserRole,
  mockHasPermission,
  mockAnimalFindFirst,
  mockReminderFindMany,
  mockReminderCreate,
  mockReminderFindFirst,
  mockReminderDelete,
  mockLogAudit,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockClerkClient: vi.fn(),
  mockGetUserRole: vi.fn(),
  mockHasPermission: vi.fn(),
  mockAnimalFindFirst: vi.fn(),
  mockReminderFindMany: vi.fn(),
  mockReminderCreate: vi.fn(),
  mockReminderFindFirst: vi.fn(),
  mockReminderDelete: vi.fn(),
  mockLogAudit: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth, clerkClient: mockClerkClient }));
vi.mock('@/lib/rbac', () => ({ getUserRole: mockGetUserRole, hasPermission: mockHasPermission }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    animal: { findFirst: mockAnimalFindFirst },
    animalReminder: {
      findMany: mockReminderFindMany,
      create: mockReminderCreate,
      findFirst: mockReminderFindFirst,
      delete: mockReminderDelete,
    },
  },
}));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));

import { GET, POST } from './route';
import { DELETE } from './[reminderId]/route';

const D = new Date('2026-01-01T00:00:00.000Z');
const reminder = {
  id: 'r-1', animalId: 'animal-1', message: 'Vaccinate next week', isActive: true, expiresAt: null,
  createdByUserId: 'user-1', createdByName: 'Jane Doe', createdAt: D, updatedAt: D, clerkOrganizationId: 'org-1',
};
const idCtx = { params: Promise.resolve({ id: 'animal-1' }) };
const rCtx = { params: Promise.resolve({ id: 'animal-1', reminderId: 'r-1' }) };

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
  mockGetUserRole.mockResolvedValue('ADMIN');
  mockHasPermission.mockReturnValue(true);
  mockAnimalFindFirst.mockResolvedValue({ id: 'animal-1', clerkOrganizationId: 'org-1' });
  mockClerkClient.mockResolvedValue({ users: { getUser: vi.fn().mockResolvedValue({ firstName: 'Jane', lastName: 'Doe' }) } });
});

describe('GET /api/animals/[id]/reminders', () => {
  it('returns 200 with reminders passing the schema', async () => {
    mockReminderFindMany.mockResolvedValue([reminder]);
    const res = await GET(new Request('http://t.localhost/api/animals/animal-1/reminders'), idCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].message).toBe('Vaccinate next week');
    expect(body[0].createdByName).toBe('Jane Doe');
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null, orgId: null });
    const res = await GET(new Request('http://t.localhost/api/animals/animal-1/reminders'), idCtx);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/animals/[id]/reminders', () => {
  function postReq(body: unknown) {
    return new Request('http://t.localhost/api/animals/animal-1/reminders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('returns 400 when message is blank', async () => {
    const res = await POST(postReq({ message: '' }), idCtx);
    expect(res.status).toBe(400);
    expect(mockReminderCreate).not.toHaveBeenCalled();
  });

  it('returns 400 when message is whitespace-only (trim regression guard)', async () => {
    const res = await POST(postReq({ message: '   ' }), idCtx);
    expect(res.status).toBe(400);
    expect(mockReminderCreate).not.toHaveBeenCalled();
  });

  it('creates and returns 201 with a schema-valid reminder', async () => {
    mockReminderCreate.mockResolvedValue(reminder);
    const res = await POST(postReq({ message: 'Vaccinate next week' }), idCtx);
    expect(res.status).toBe(201);
    expect((await res.json()).id).toBe('r-1');
  });

  it('returns 403 without reminder:create permission', async () => {
    mockHasPermission.mockReturnValue(false);
    const res = await POST(postReq({ message: 'x' }), idCtx);
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/animals/[id]/reminders/[reminderId]', () => {
  it('deletes and returns 200 { ok: true }', async () => {
    mockReminderFindFirst.mockResolvedValue(reminder);
    mockReminderDelete.mockResolvedValue(reminder);
    const res = await DELETE(new Request('http://t.localhost/x', { method: 'DELETE' }), rCtx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('returns 404 when the reminder is not found', async () => {
    mockReminderFindFirst.mockResolvedValue(null);
    const res = await DELETE(new Request('http://t.localhost/x', { method: 'DELETE' }), rCtx);
    expect(res.status).toBe(404);
  });
});
