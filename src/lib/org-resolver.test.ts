import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Hoisted mocks ──────────────────────────────────────────────────────────
const { mockPrisma, mockHeaders } = vi.hoisted(() => ({
  mockPrisma: {
    organisation: { findUnique: vi.fn() },
    orgMember: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    orgFeatureFlag: { findUnique: vi.fn() },
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

import { resolveOrgIdForRequest } from './org-resolver';

function withHost(host: string | null) {
  mockHeaders.mockResolvedValue({
    get: (name: string) => (name === 'host' ? host : null),
  });
}

// The DB_ORG_SOURCE feature flag row for a given org (admin-panel toggle).
function setDbFlag(enabled: boolean) {
  mockPrisma.orgFeatureFlag.findUnique.mockResolvedValue(enabled ? { enabled: true } : null);
}

const ROOT = 'localhost:3000';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_ROOT_DOMAIN = ROOT;
  delete process.env.ORG_SOURCE;
  setDbFlag(false);
  mockPrisma.orgMember.findMany.mockResolvedValue([]);
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  delete process.env.ORG_SOURCE;
});

describe('resolveOrgIdForRequest', () => {
  it('returns null without a user id', async () => {
    await expect(resolveOrgIdForRequest('', null)).resolves.toBeNull();
  });

  it('keeps the Clerk session orgId for a legacy (flag off) subdomain org', async () => {
    withHost(`rescue.${ROOT}`);
    mockPrisma.organisation.findUnique.mockResolvedValue({ id: 'org_1', isActive: true });
    setDbFlag(false);

    await expect(resolveOrgIdForRequest('user_1', 'org_session')).resolves.toBe('org_session');
    expect(mockPrisma.orgMember.findUnique).not.toHaveBeenCalled();
  });

  it('keeps the Clerk session orgId when the subdomain has no mirror row yet', async () => {
    withHost(`rescue.${ROOT}`);
    mockPrisma.organisation.findUnique.mockResolvedValue(null);

    await expect(resolveOrgIdForRequest('user_1', 'org_session')).resolves.toBe('org_session');
  });

  it('resolves subdomain → organisation → membership when the org flag is on', async () => {
    withHost(`rescue.${ROOT}`);
    mockPrisma.organisation.findUnique.mockResolvedValue({ id: 'org_1', isActive: true });
    setDbFlag(true);
    mockPrisma.orgMember.findUnique.mockResolvedValue({ id: 'member_1' });

    await expect(resolveOrgIdForRequest('user_1', null)).resolves.toBe('org_1');
    expect(mockPrisma.organisation.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: 'rescue' } })
    );
    expect(mockPrisma.orgMember.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId_orgId: { userId: 'user_1', orgId: 'org_1' } } })
    );
  });

  it('returns null (not the session org) for a flagged org when the user is not a member', async () => {
    withHost(`rescue.${ROOT}`);
    mockPrisma.organisation.findUnique.mockResolvedValue({ id: 'org_1', isActive: true });
    setDbFlag(true);
    mockPrisma.orgMember.findUnique.mockResolvedValue(null);

    await expect(resolveOrgIdForRequest('user_1', 'org_session')).resolves.toBeNull();
  });

  it('treats DB-native worg_ organisations as database-managed without a flag row', async () => {
    withHost(`native.${ROOT}`);
    mockPrisma.organisation.findUnique.mockResolvedValue({ id: 'worg_abc', isActive: true });
    setDbFlag(false);
    mockPrisma.orgMember.findUnique.mockResolvedValue({ id: 'member_1' });

    await expect(resolveOrgIdForRequest('user_1', null)).resolves.toBe('worg_abc');
  });

  it('returns null for an inactive database-managed organisation', async () => {
    withHost(`rescue.${ROOT}`);
    mockPrisma.organisation.findUnique.mockResolvedValue({ id: 'org_1', isActive: false });
    setDbFlag(true);

    await expect(resolveOrgIdForRequest('user_1', 'org_session')).resolves.toBeNull();
    expect(mockPrisma.orgMember.findUnique).not.toHaveBeenCalled();
  });

  it('forces db resolution everywhere when ORG_SOURCE=db', async () => {
    process.env.ORG_SOURCE = 'db';
    withHost(`rescue.${ROOT}`);
    mockPrisma.organisation.findUnique.mockResolvedValue({ id: 'org_1', isActive: true });
    setDbFlag(false); // flag off — env override wins
    mockPrisma.orgMember.findUnique.mockResolvedValue({ id: 'member_1' });

    await expect(resolveOrgIdForRequest('user_1', null)).resolves.toBe('org_1');
  });

  it('root domain: keeps the Clerk session orgId for legacy sessions', async () => {
    withHost(ROOT);

    await expect(resolveOrgIdForRequest('user_1', 'org_session')).resolves.toBe('org_session');
    expect(mockPrisma.orgMember.findMany).not.toHaveBeenCalled();
  });

  it('root domain: falls back to the first database-managed membership without a session org', async () => {
    withHost(ROOT);
    mockPrisma.orgMember.findMany.mockResolvedValue([
      { orgId: 'org_legacy' },
      { orgId: 'worg_native' },
    ]);
    setDbFlag(false); // org_legacy flag off; worg_ is db-native by prefix

    await expect(resolveOrgIdForRequest('user_1', null)).resolves.toBe('worg_native');
  });

  it('root domain with ORG_SOURCE=db: first membership wins', async () => {
    process.env.ORG_SOURCE = 'db';
    withHost(ROOT);
    mockPrisma.orgMember.findMany.mockResolvedValue([{ orgId: 'org_first' }]);

    await expect(resolveOrgIdForRequest('user_1', 'org_session')).resolves.toBe('org_first');
  });

  it('returns the session org when headers are unavailable', async () => {
    mockHeaders.mockRejectedValue(new Error('outside request scope'));

    await expect(resolveOrgIdForRequest('user_1', 'org_session')).resolves.toBe('org_session');
  });
});
