import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ──────────────────────────────────────────────────────────
const { mockGetOrgMember, mockClerkClient, mockPrisma } = vi.hoisted(() => ({
  mockGetOrgMember: vi.fn(),
  mockClerkClient: {
    users: {
      getOrganizationMembershipList: vi.fn(),
    },
  },
  mockPrisma: {
    orgMember: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    orgFeatureFlag: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('./rbac', () => ({
  getOrgMember: mockGetOrgMember,
}));

vi.mock('@/lib/clerk-server', () => ({
  clerkClient: vi.fn().mockResolvedValue(mockClerkClient),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { ensureUserInOrg, getFirstUserOrgId, isOrgAdmin } from './authz';

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.ORG_SOURCE;
  // DB_ORG_SOURCE feature flag off by default (legacy clerk mode)
  mockPrisma.orgFeatureFlag.findUnique.mockResolvedValue(null);
  mockPrisma.orgMember.findMany.mockResolvedValue([]);
});

// ─── isOrgAdmin ──────────────────────────────────────────────────────────────

describe('isOrgAdmin', () => {
  it('returns true when OrgMember record has ADMIN role', async () => {
    mockGetOrgMember.mockResolvedValue({ role: 'ADMIN' });

    const result = await isOrgAdmin('user1', 'org1');
    expect(result).toBe(true);
    expect(mockClerkClient.users.getOrganizationMembershipList).not.toHaveBeenCalled();
  });

  it('returns false when OrgMember record has COORDINATOR role', async () => {
    mockGetOrgMember.mockResolvedValue({ role: 'COORDINATOR' });

    const result = await isOrgAdmin('user1', 'org1');
    expect(result).toBe(false);
    expect(mockClerkClient.users.getOrganizationMembershipList).not.toHaveBeenCalled();
  });

  it('returns false when OrgMember record has CARER role', async () => {
    mockGetOrgMember.mockResolvedValue({ role: 'CARER' });

    const result = await isOrgAdmin('user1', 'org1');
    expect(result).toBe(false);
    expect(mockClerkClient.users.getOrganizationMembershipList).not.toHaveBeenCalled();
  });

  it('falls back to Clerk when no OrgMember record exists and user is Clerk admin', async () => {
    mockGetOrgMember.mockResolvedValue(null);
    mockClerkClient.users.getOrganizationMembershipList.mockResolvedValue({
      data: [{ organization: { id: 'org1' }, role: 'org:admin' }],
    });

    const result = await isOrgAdmin('user1', 'org1');
    expect(result).toBe(true);
  });

  it('falls back to Clerk when no OrgMember record exists and user is Clerk member', async () => {
    mockGetOrgMember.mockResolvedValue(null);
    mockClerkClient.users.getOrganizationMembershipList.mockResolvedValue({
      data: [{ organization: { id: 'org1' }, role: 'org:member' }],
    });

    const result = await isOrgAdmin('user1', 'org1');
    expect(result).toBe(false);
  });

  it('returns false when no OrgMember record and no Clerk membership found', async () => {
    mockGetOrgMember.mockResolvedValue(null);
    mockClerkClient.users.getOrganizationMembershipList.mockResolvedValue({
      data: [],
    });

    const result = await isOrgAdmin('user1', 'org1');
    expect(result).toBe(false);
  });

  it('does NOT use Clerk fallback when RBAC record exists — prevents bypass', async () => {
    // User was demoted from ADMIN to CARER in RBAC
    // but still holds org:admin in Clerk
    mockGetOrgMember.mockResolvedValue({ role: 'CARER' });
    mockClerkClient.users.getOrganizationMembershipList.mockResolvedValue({
      data: [{ organization: { id: 'org1' }, role: 'org:admin' }],
    });

    const result = await isOrgAdmin('user1', 'org1');
    expect(result).toBe(false);
    expect(mockClerkClient.users.getOrganizationMembershipList).not.toHaveBeenCalled();
  });

  it('db mode: never falls back to Clerk when no OrgMember record exists', async () => {
    process.env.ORG_SOURCE = 'db';
    mockGetOrgMember.mockResolvedValue(null);

    const result = await isOrgAdmin('user1', 'org1');
    expect(result).toBe(false);
    expect(mockClerkClient.users.getOrganizationMembershipList).not.toHaveBeenCalled();
  });

  it('DB_ORG_SOURCE flag: a flagged org never falls back to Clerk', async () => {
    mockGetOrgMember.mockResolvedValue(null);
    mockPrisma.orgFeatureFlag.findUnique.mockResolvedValue({ enabled: true });

    const result = await isOrgAdmin('user1', 'org1');
    expect(result).toBe(false);
    expect(mockClerkClient.users.getOrganizationMembershipList).not.toHaveBeenCalled();
  });
});

// ─── ensureUserInOrg (db mode) ──────────────────────────────────────────────

describe('ensureUserInOrg in db mode', () => {
  beforeEach(() => {
    process.env.ORG_SOURCE = 'db';
  });

  it('passes when an OrgMember row exists', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue({ id: 'member1' });

    await expect(ensureUserInOrg('user1', 'org1')).resolves.toBe('org1');
    expect(mockClerkClient.users.getOrganizationMembershipList).not.toHaveBeenCalled();
  });

  it('throws Forbidden when no OrgMember row exists', async () => {
    mockPrisma.orgMember.findUnique.mockResolvedValue(null);

    await expect(ensureUserInOrg('user1', 'org1')).rejects.toThrow('Forbidden');
    expect(mockClerkClient.users.getOrganizationMembershipList).not.toHaveBeenCalled();
  });
});

// ─── getFirstUserOrgId (db mode) ────────────────────────────────────────────

describe('getFirstUserOrgId in db mode', () => {
  beforeEach(() => {
    process.env.ORG_SOURCE = 'db';
  });

  it('returns the earliest membership org', async () => {
    mockPrisma.orgMember.findFirst.mockResolvedValue({ orgId: 'org_first' });

    await expect(getFirstUserOrgId('user1')).resolves.toBe('org_first');
    expect(mockPrisma.orgMember.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'asc' } })
    );
  });

  it('returns null with no memberships', async () => {
    mockPrisma.orgMember.findFirst.mockResolvedValue(null);
    await expect(getFirstUserOrgId('user1')).resolves.toBeNull();
  });
});
