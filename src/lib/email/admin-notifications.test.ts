import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma, mockClerk, mockSendEmail, mockEmailTemplate } = vi.hoisted(() => ({
  mockPrisma: {
    orgMember: {
      findMany: vi.fn(),
    },
    adminNotificationLog: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
  mockClerk: {
    organizations: {
      getOrganization: vi.fn(),
    },
    users: {
      getUser: vi.fn(),
    },
  },
  mockSendEmail: vi.fn(),
  mockEmailTemplate: vi.fn(() => null),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@clerk/nextjs/server', () => ({ clerkClient: vi.fn(async () => mockClerk) }));
vi.mock('./resend', () => ({ sendEmail: mockSendEmail }));
vi.mock('./templates/admin-notification', () => ({ AdminNotificationEmail: mockEmailTemplate }));

import { sendAdminNotification } from './admin-notifications';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_ROOT_DOMAIN = 'wildtrack360.com.au';
  mockClerk.organizations.getOrganization.mockResolvedValue({
    name: 'Wildlife NSW',
    publicMetadata: { org_url: 'wildlife-nsw' },
  });
  mockPrisma.adminNotificationLog.findUnique.mockResolvedValue(null);
  mockPrisma.adminNotificationLog.create.mockResolvedValue({});
  mockSendEmail.mockResolvedValue({ id: 'email_123' });
});

describe('sendAdminNotification', () => {
  it('fans out admin notifications and records each send', async () => {
    mockPrisma.orgMember.findMany.mockResolvedValue([{ userId: 'admin-1' }, { userId: 'coord-1' }]);
    mockClerk.users.getUser
      .mockResolvedValueOnce({
        primaryEmailAddressId: 'email-1',
        emailAddresses: [{ id: 'email-1', emailAddress: 'admin@example.com' }],
      })
      .mockResolvedValueOnce({
        primaryEmailAddressId: 'email-2',
        emailAddresses: [{ id: 'email-2', emailAddress: 'coord@example.com' }],
      });

    const results = await sendAdminNotification({
      orgId: 'org-1',
      kind: 'nsw-reminder',
      title: 'NSW annual return is due',
      body: 'Generate reports now.',
      cta: { label: 'Open NSW report', href: '/compliance/nsw-report' },
      dedupeKey: 'submission-14-day:2026',
      info: [{ label: 'Data gaps', value: '3 animals need review.' }],
    });

    expect(results).toEqual([
      { userId: 'admin-1', email: 'admin@example.com', status: 'sent', resendMessageId: 'email_123' },
      { userId: 'coord-1', email: 'coord@example.com', status: 'sent', resendMessageId: 'email_123' },
    ]);
    expect(mockPrisma.orgMember.findMany).toHaveBeenCalledWith({
      where: { orgId: 'org-1', role: { in: ['ADMIN', 'COORDINATOR_ALL'] } },
      select: { userId: true },
      orderBy: { userId: 'asc' },
    });
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@example.com',
        subject: 'NSW annual return is due',
        tags: [
          { name: 'kind', value: 'admin-notification' },
          { name: 'feature', value: 'nsw-reminder' },
        ],
      })
    );
    // Email links resolve against the org's OWN tenant subdomain, not a
    // baked-in site URL.
    expect(mockEmailTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        cta: expect.objectContaining({
          href: 'https://wildlife-nsw.wildtrack360.com.au/compliance/nsw-report',
        }),
        manageNotificationsHref: 'https://wildlife-nsw.wildtrack360.com.au/admin',
      })
    );
    expect(mockPrisma.adminNotificationLog.create).toHaveBeenCalledWith({
      data: {
        orgId: 'org-1',
        userId: 'admin-1',
        kind: 'nsw-reminder',
        dedupeKey: 'submission-14-day:2026',
        resendMessageId: 'email_123',
      },
    });
  });

  it('skips recipients that already have a matching dedupe log', async () => {
    mockPrisma.orgMember.findMany.mockResolvedValue([{ userId: 'admin-1' }]);
    mockPrisma.adminNotificationLog.findUnique.mockResolvedValue({ id: 'existing' });

    const results = await sendAdminNotification({
      orgId: 'org-1',
      kind: 'nsw-reminder',
      title: 'NSW EOFY is in 14 days',
      body: 'Check records.',
      cta: { label: 'Open NSW report', href: '/compliance/nsw-report' },
      dedupeKey: 'eofy-14-day:2026',
    });

    expect(results).toEqual([{ userId: 'admin-1', status: 'skipped', reason: 'duplicate' }]);
    expect(mockClerk.users.getUser).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockPrisma.adminNotificationLog.create).not.toHaveBeenCalled();
  });

  it('reports sent-unlogged when the email sends but audit persistence fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockPrisma.orgMember.findMany.mockResolvedValue([{ userId: 'admin-1' }]);
    mockClerk.users.getUser.mockResolvedValue({
      primaryEmailAddressId: 'email-1',
      emailAddresses: [{ id: 'email-1', emailAddress: 'admin@example.com' }],
    });
    mockPrisma.adminNotificationLog.create.mockRejectedValue(new Error('write failed'));

    const results = await sendAdminNotification({
      orgId: 'org-1',
      kind: 'nsw-reminder',
      title: 'NSW annual return is due',
      body: 'Generate reports now.',
      cta: { label: 'Open NSW report', href: '/compliance/nsw-report' },
      dedupeKey: 'submission-14-day:2026',
    });

    expect(results).toEqual([
      { userId: 'admin-1', email: 'admin@example.com', status: 'sent-unlogged', resendMessageId: 'email_123' },
    ]);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to log admin notification after email send:',
      expect.objectContaining({ resendMessageId: 'email_123' })
    );

    errorSpy.mockRestore();
  });
});
