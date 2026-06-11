import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma, mockSendAdminNotification } = vi.hoisted(() => ({
  mockPrisma: {
    payment: {
      findFirst: vi.fn(),
    },
    membership: {
      findFirst: vi.fn(),
    },
    recurringSubscription: {
      findUnique: vi.fn(),
    },
  },
  mockSendAdminNotification: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('./admin-notifications', () => ({ sendAdminNotification: mockSendAdminNotification }));

import { sendPaymentActivityAdminNotification } from './payment-admin-notifications';

const updatedAt = new Date('2026-06-11T02:00:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = 'test-key';
  mockPrisma.membership.findFirst.mockResolvedValue(null);
  mockPrisma.recurringSubscription.findUnique.mockResolvedValue(null);
});

describe('sendPaymentActivityAdminNotification', () => {
  it('does not hit the database when email is not configured', async () => {
    delete process.env.RESEND_API_KEY;

    await sendPaymentActivityAdminNotification('pay-1', 'org-1');

    expect(mockPrisma.payment.findFirst).not.toHaveBeenCalled();
    expect(mockSendAdminNotification).not.toHaveBeenCalled();
  });

  it('sends a donation notification to organisation admins', async () => {
    mockPrisma.payment.findFirst.mockResolvedValue({
      id: 'pay-1',
      clerkOrganizationId: 'org-1',
      status: 'SUCCEEDED',
      kind: 'DONATION_ONE_OFF',
      amountCents: 5000,
      currency: 'AUD',
      receiptNumber: 'RCPT-2026-00001',
      updatedAt,
      metadata: { adminNotificationEvent: 'donation-received' },
      donations: [
        {
          donorEmail: 'donor@example.com',
          donorName: 'Dina Donor',
          isAnonymous: false,
          message: 'For the joeys',
        },
      ],
      member: null,
    });

    await sendPaymentActivityAdminNotification('pay-1', 'org-1');

    expect(mockSendAdminNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        kind: 'payment.donation',
        recipientRoles: ['ADMIN'],
        title: 'New donation: $50.00',
        cta: { label: 'Review payment', href: '/admin/payments' },
        dedupeKey: 'payment:pay-1',
        info: expect.arrayContaining([
          { label: 'Amount', value: '$50.00 AUD' },
          { label: 'Donor', value: 'Dina Donor' },
          { label: 'Receipt email', value: 'donor@example.com' },
          { label: 'Donor message', value: 'For the joeys' },
        ]),
      })
    );
  });

  it('sends a new member signup notification with tier and period details', async () => {
    mockPrisma.payment.findFirst.mockResolvedValue({
      id: 'pay-2',
      clerkOrganizationId: 'org-1',
      status: 'SUCCEEDED',
      kind: 'MEMBERSHIP_RECURRING',
      amountCents: 12000,
      currency: 'AUD',
      receiptNumber: 'RCPT-2026-00002',
      updatedAt,
      metadata: {
        adminNotificationEvent: 'membership-signup',
        recurringSubscriptionId: 'sub-1',
        donorEmail: 'jane@example.com',
      },
      donations: [],
      member: {
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Member',
        memberNumber: 'M-100',
      },
    });
    mockPrisma.membership.findFirst.mockResolvedValue({
      periodStart: new Date('2026-06-11T00:00:00.000Z'),
      periodEnd: new Date('2027-06-11T00:00:00.000Z'),
      recurringSubscriptionId: 'sub-1',
      tier: { name: 'Adult', billingInterval: 'ANNUAL' },
    });
    mockPrisma.recurringSubscription.findUnique.mockResolvedValue({
      interval: 'ANNUAL',
      lastChargedAt: null,
    });

    await sendPaymentActivityAdminNotification('pay-2', 'org-1');

    expect(mockSendAdminNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        kind: 'membership.signup',
        recipientRoles: ['ADMIN'],
        title: 'New member signup: Jane Member',
        cta: { label: 'Review members', href: '/admin/members' },
        dedupeKey: 'payment:pay-2',
        info: expect.arrayContaining([
          { label: 'Member', value: 'Jane Member' },
          { label: 'Email', value: 'jane@example.com' },
          { label: 'Member number', value: 'M-100' },
          { label: 'Tier', value: 'Adult' },
          { label: 'Billing', value: 'Annual' },
        ]),
      })
    );
  });

  it('sends a membership renewal notification for renewal payments', async () => {
    mockPrisma.payment.findFirst.mockResolvedValue({
      id: 'pay-3',
      clerkOrganizationId: 'org-1',
      status: 'SUCCEEDED',
      kind: 'MEMBERSHIP_RECURRING',
      amountCents: 12000,
      currency: 'AUD',
      receiptNumber: 'RCPT-2026-00003',
      updatedAt,
      metadata: {
        adminNotificationEvent: 'membership-renewed',
        recurringSubscriptionId: 'sub-1',
      },
      donations: [],
      member: {
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Member',
        memberNumber: 'M-100',
      },
    });
    mockPrisma.membership.findFirst.mockResolvedValue({
      periodStart: new Date('2027-06-11T00:00:00.000Z'),
      periodEnd: new Date('2028-06-11T00:00:00.000Z'),
      recurringSubscriptionId: 'sub-1',
      tier: { name: 'Adult', billingInterval: 'ANNUAL' },
    });
    mockPrisma.recurringSubscription.findUnique.mockResolvedValue({
      interval: 'ANNUAL',
      lastChargedAt: new Date('2026-06-11T00:00:00.000Z'),
    });

    await sendPaymentActivityAdminNotification('pay-3', 'org-1');

    expect(mockSendAdminNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        kind: 'membership.renewal',
        recipientRoles: ['ADMIN'],
        title: 'Membership renewed: Jane Member',
        cta: { label: 'Review members', href: '/admin/members' },
        dedupeKey: 'payment:pay-3',
      })
    );
  });
});
