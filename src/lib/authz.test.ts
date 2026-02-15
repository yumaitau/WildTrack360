import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ──────────────────────────────────────────────────────────
const { mockGetOrgMember, mockClerkClient } = vi.hoisted(() => ({
  mockGetOrgMember: vi.fn(),
  mockClerkClient: {
    users: {
      getOrganizationMembershipList: vi.fn(),
    },
  },
}));

vi.mock('./rbac', () => ({
  getOrgMember: mockGetOrgMember,
}));

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn().mockResolvedValue(mockClerkClient),
}));

import { isOrgAdmin } from './authz';

beforeEach(() => {
  vi.clearAllMocks();
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
});
