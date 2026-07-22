import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ──────────────────────────────────────────────────────────
const { mockPrisma, mockTx } = vi.hoisted(() => {
  const mockTx = {
    user: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    orgMember: {
      upsert: vi.fn(),
    },
  };
  const mockPrisma = {
    $transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    user: {
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    organisation: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  };
  return { mockPrisma, mockTx };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import {
  deactivateUser,
  isPendingUserId,
  upsertOrganisationFromClerk,
  upsertUserFromClerk,
} from './user-sync';

beforeEach(() => {
  vi.clearAllMocks();
  mockTx.user.findFirst.mockResolvedValue(null);
});

describe('isPendingUserId', () => {
  it('detects pending placeholder ids', () => {
    expect(isPendingUserId('pending_abc')).toBe(true);
    expect(isPendingUserId('user_abc')).toBe(false);
  });
});

describe('upsertUserFromClerk', () => {
  it('upserts the user row and sets the email', async () => {
    await upsertUserFromClerk({
      id: 'user_1',
      email: 'jane@example.org',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    expect(mockTx.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user_1' },
        create: expect.objectContaining({ id: 'user_1', firstName: 'Jane' }),
      })
    );
    expect(mockTx.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { email: 'jane@example.org' },
    });
  });

  it('never writes rows for pending placeholder ids', async () => {
    await upsertUserFromClerk({ id: 'pending_x', email: 'x@example.org' });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('claims a pending placeholder by email: memberships move, placeholder deleted', async () => {
    mockTx.user.findFirst.mockResolvedValue({
      id: 'pending_abc',
      email: 'invited@example.org',
      invitedAt: new Date('2026-07-01T00:00:00Z'),
      memberships: [
        { orgId: 'org_1', role: 'COORDINATOR' },
        { orgId: 'org_2', role: 'CARER' },
      ],
    });

    await upsertUserFromClerk({ id: 'user_real', email: 'invited@example.org' });

    // Membership rows recreated against the real Clerk user id with the
    // invite-time role preserved.
    expect(mockTx.orgMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_orgId: { userId: 'user_real', orgId: 'org_1' } },
        create: { userId: 'user_real', orgId: 'org_1', role: 'COORDINATOR' },
        update: {},
      })
    );
    expect(mockTx.orgMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { userId: 'user_real', orgId: 'org_2', role: 'CARER' },
      })
    );
    expect(mockTx.user.delete).toHaveBeenCalledWith({ where: { id: 'pending_abc' } });
    // invitedAt carried over to the claimed user
    expect(mockTx.user.update).toHaveBeenCalledWith({
      where: { id: 'user_real' },
      data: { invitedAt: new Date('2026-07-01T00:00:00Z') },
    });
  });

  it('does not claim anything without an email', async () => {
    await upsertUserFromClerk({ id: 'user_real' });
    expect(mockTx.user.findFirst).not.toHaveBeenCalled();
    expect(mockTx.user.delete).not.toHaveBeenCalled();
  });
});

describe('deactivateUser', () => {
  it('marks the row inactive without deleting it', async () => {
    await deactivateUser('user_1');
    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { isActive: false },
    });
  });
});

describe('upsertOrganisationFromClerk', () => {
  it('creates an organisation with slug and jurisdiction', async () => {
    mockPrisma.organisation.findUnique.mockResolvedValue(null);

    await upsertOrganisationFromClerk({
      id: 'org_1',
      name: 'Rescue Org',
      slug: 'rescue',
      jurisdiction: 'NSW',
    });

    expect(mockPrisma.organisation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'org_1' },
        create: expect.objectContaining({ name: 'Rescue Org', slug: 'rescue', jurisdiction: 'NSW' }),
      })
    );
  });

  it('falls back to the org id as placeholder slug when Clerk has no org_url', async () => {
    mockPrisma.organisation.findUnique.mockResolvedValue(null);

    await upsertOrganisationFromClerk({ id: 'org_2', name: 'No Slug Org' });

    expect(mockPrisma.organisation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ slug: 'org_2' }),
      })
    );
  });

  it('keeps the existing slug when Clerk metadata is missing', async () => {
    mockPrisma.organisation.findUnique.mockResolvedValue({
      id: 'org_3',
      slug: 'existing-slug',
      name: 'Existing',
      jurisdiction: 'VIC',
      logoUrl: null,
    });

    await upsertOrganisationFromClerk({ id: 'org_3', name: 'Renamed Org' });

    expect(mockPrisma.organisation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ slug: 'existing-slug', name: 'Renamed Org' }),
      })
    );
  });
});
