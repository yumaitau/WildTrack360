import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Hoisted mocks ──────────────────────────────────────────────────────────
const { mockPrisma, mockHeaders } = vi.hoisted(() => ({
  mockPrisma: {
    organisation: { findUnique: vi.fn() },
    orgMember: { findUnique: vi.fn(), findFirst: vi.fn() },
  },
  mockHeaders: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next/headers', () => ({ headers: mockHeaders }));
// react.cache memoises per request in the app; identity passthrough in tests.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, cache: <T>(fn: T) => fn };
});

import { resolveDbOrgId } from './org-resolver';

function withHost(host: string | null) {
  mockHeaders.mockResolvedValue({
    get: (name: string) => (name === 'host' ? host : null),
  });
}

const ROOT = 'localhost:3000';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_ROOT_DOMAIN = ROOT;
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_ROOT_DOMAIN;
});

describe('resolveDbOrgId', () => {
  it('returns null without a user id', async () => {
    await expect(resolveDbOrgId('')).resolves.toBeNull();
  });

  it('resolves subdomain → organisation → membership', async () => {
    withHost(`rescue.${ROOT}`);
    mockPrisma.organisation.findUnique.mockResolvedValue({ id: 'org_1', isActive: true });
    mockPrisma.orgMember.findUnique.mockResolvedValue({ id: 'member_1' });

    await expect(resolveDbOrgId('user_1')).resolves.toBe('org_1');
    expect(mockPrisma.organisation.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: 'rescue' } })
    );
    expect(mockPrisma.orgMember.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId_orgId: { userId: 'user_1', orgId: 'org_1' } } })
    );
  });

  it('returns null on a subdomain when the user is not a member', async () => {
    withHost(`rescue.${ROOT}`);
    mockPrisma.organisation.findUnique.mockResolvedValue({ id: 'org_1', isActive: true });
    mockPrisma.orgMember.findUnique.mockResolvedValue(null);

    await expect(resolveDbOrgId('user_1')).resolves.toBeNull();
  });

  it('returns null for an unknown or inactive organisation', async () => {
    withHost(`ghost.${ROOT}`);
    mockPrisma.organisation.findUnique.mockResolvedValue(null);
    await expect(resolveDbOrgId('user_1')).resolves.toBeNull();

    mockPrisma.organisation.findUnique.mockResolvedValue({ id: 'org_x', isActive: false });
    await expect(resolveDbOrgId('user_1')).resolves.toBeNull();
    expect(mockPrisma.orgMember.findUnique).not.toHaveBeenCalled();
  });

  it('falls back to the first membership on the root domain', async () => {
    withHost(ROOT);
    mockPrisma.orgMember.findFirst.mockResolvedValue({ orgId: 'org_first' });

    await expect(resolveDbOrgId('user_1')).resolves.toBe('org_first');
    expect(mockPrisma.orgMember.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user_1' }, orderBy: { createdAt: 'asc' } })
    );
  });

  it('returns null when headers are unavailable and the user has no memberships', async () => {
    mockHeaders.mockRejectedValue(new Error('outside request scope'));
    mockPrisma.orgMember.findFirst.mockResolvedValue(null);

    await expect(resolveDbOrgId('user_1')).resolves.toBeNull();
  });
});
