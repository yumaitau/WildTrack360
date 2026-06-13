import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('./prisma', () => ({
  prisma: {
    member: { findFirst: vi.fn(), update: vi.fn() },
    payment: { findFirst: vi.fn() },
  },
}));

const createInvitation = vi.fn();
const getOrganization = vi.fn();
vi.mock('@/lib/clerk-server', () => ({
  clerkClient: vi.fn(async () => ({
    invitations: { createInvitation },
    organizations: { getOrganization },
  })),
}));

import { invitePortalMember } from './portal-invite';
import { prisma } from './prisma';

const memberFind = prisma.member.findFirst as unknown as ReturnType<typeof vi.fn>;
const memberUpdate = prisma.member.update as unknown as ReturnType<typeof vi.fn>;
const paymentFind = prisma.payment.findFirst as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  getOrganization.mockResolvedValue({ publicMetadata: { org_url: 'rescue' } });
  createInvitation.mockResolvedValue({ id: 'inv_1' });
  memberUpdate.mockResolvedValue({});
});

describe('invitePortalMember', () => {
  it('returns not-found for an unknown member', async () => {
    memberFind.mockResolvedValue(null);
    expect(await invitePortalMember('m1', 'org_1')).toEqual({ sent: false, reason: 'not-found' });
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it('skips members who already have portal access', async () => {
    memberFind.mockResolvedValue({ id: 'm1', email: 'a@b.co', clerkUserId: 'user_1' });
    expect(await invitePortalMember('m1', 'org_1')).toEqual({ sent: false, reason: 'already-active' });
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it('refuses to invite a member with no paid membership (donors excluded)', async () => {
    memberFind.mockResolvedValue({ id: 'm1', email: 'a@b.co', clerkUserId: null });
    paymentFind.mockResolvedValue(null);
    expect(await invitePortalMember('m1', 'org_1')).toEqual({ sent: false, reason: 'payment-required' });
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it('only counts SUCCEEDED membership payments (not donations)', async () => {
    memberFind.mockResolvedValue({ id: 'm1', email: 'a@b.co', clerkUserId: null });
    paymentFind.mockResolvedValue({ id: 'pay_1' });
    await invitePortalMember('m1', 'org_1');
    expect(paymentFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          memberId: 'm1',
          status: 'SUCCEEDED',
          kind: { in: ['MEMBERSHIP_ONE_OFF', 'MEMBERSHIP_RECURRING'] },
        }),
      })
    );
  });

  it('invites a paid member and stores the invitation reference', async () => {
    memberFind.mockResolvedValue({ id: 'm1', email: 'a@b.co', clerkUserId: null });
    paymentFind.mockResolvedValue({ id: 'pay_1' });

    const res = await invitePortalMember('m1', 'org_1');

    expect(res).toEqual({ sent: true });
    expect(createInvitation).toHaveBeenCalledOnce();
    expect(memberUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'm1' },
        data: expect.objectContaining({ clerkInvitationId: 'inv_1' }),
      })
    );
  });
});
