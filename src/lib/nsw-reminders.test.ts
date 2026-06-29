import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma, mockClerk, mockGetServerJurisdiction, mockSendAdminNotification } = vi.hoisted(() => ({
  mockPrisma: {
    animal: {
      findMany: vi.fn(),
    },
    adminNotificationDismissal: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    orgMember: {
      findMany: vi.fn(),
    },
  },
  mockClerk: {
    organizations: {
      getOrganization: vi.fn(),
    },
  },
  mockGetServerJurisdiction: vi.fn(),
  mockSendAdminNotification: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/server-config', () => ({ getServerJurisdiction: mockGetServerJurisdiction }));
vi.mock('@/lib/email/admin-notifications', () => ({ sendAdminNotification: mockSendAdminNotification }));
vi.mock('@/lib/clerk-server', () => ({ clerkClient: vi.fn(async () => mockClerk) }));

import {
  countNSWAnimalsMissingRequiredFields,
  getActiveNSWReminder,
  getNSWReminderBannerForUser,
  getNSWReminderDueForEmail,
  getNSWReportingPeriod,
  hasMissingNSWRequiredFields,
  sendDueNSWReminderNotifications,
} from './nsw-reminders';

type NSWRequiredFields = Parameters<typeof hasMissingNSWRequiredFields>[0];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerJurisdiction.mockResolvedValue('NSW');
  mockPrisma.adminNotificationDismissal.findUnique.mockResolvedValue(null);
  mockPrisma.animal.findMany.mockResolvedValue([]);
  mockSendAdminNotification.mockResolvedValue([{ status: 'sent' }]);
});

describe('NSW reminder date windows', () => {
  it('returns the active 30-day EOFY reminder during its window', () => {
    const reminder = getActiveNSWReminder(new Date('2026-06-10T02:00:00.000Z'));
    expect(reminder?.key).toBe('eofy-30-day');
    expect(reminder?.year).toBe(2026);
  });

  it('returns an email reminder throughout the active window in Sydney', () => {
    expect(getNSWReminderDueForEmail(new Date('2026-09-16T02:00:00.000Z'))?.key).toBe('submission-14-day');
    expect(getNSWReminderDueForEmail(new Date('2026-09-17T02:00:00.000Z'))?.key).toBe('submission-14-day');
    expect(getNSWReminderDueForEmail(new Date('2026-10-01T02:00:00.000Z'))).toBeNull();
  });

  it('counts down to the real EOFY deadline rather than a fixed label', () => {
    // 14-day window opens on 16 June — exactly 14 days before 30 June.
    expect(getActiveNSWReminder(new Date('2026-06-16T02:00:00.000Z'))?.title).toBe('NSW EOFY is in 14 days');
    // Late in the window the count shrinks instead of staying stuck at 14.
    expect(getActiveNSWReminder(new Date('2026-06-29T02:00:00.000Z'))?.title).toBe('NSW EOFY is in 1 day');
    expect(getActiveNSWReminder(new Date('2026-06-29T02:00:00.000Z'))?.message).toBe(
      'NSW EOFY is in 1 day. Check your open animal records and carer data for gaps before the reporting window closes.'
    );
    // On the deadline itself the copy reads "today".
    expect(getActiveNSWReminder(new Date('2026-06-30T02:00:00.000Z'))?.title).toBe('NSW EOFY is today');
  });

  it('counts down to 30 September for submission email reminders', () => {
    expect(getNSWReminderDueForEmail(new Date('2026-09-16T02:00:00.000Z'))?.emailBody).toContain('in 14 days');
    expect(getNSWReminderDueForEmail(new Date('2026-09-29T02:00:00.000Z'))?.emailBody).toContain('in 1 day');
    expect(getNSWReminderDueForEmail(new Date('2026-09-30T02:00:00.000Z'))?.title).toBe('NSW annual return is due today');
  });

  it('reports the NSW financial year for the annual return year', () => {
    const period = getNSWReportingPeriod(2026);
    expect(period.label).toBe('1 July 2025 to 30 June 2026');
    expect(period.startDate.toISOString()).toBe('2025-07-01T00:00:00.000Z');
    expect(period.endDate.toISOString()).toBe('2026-06-30T23:59:59.999Z');
  });
});

describe('NSW missing required field counts', () => {
  it('detects missing encounter type, fate, coordinates, or initial weight', () => {
    expect(
      hasMissingNSWRequiredFields({
        encounterType: 'Rescue',
        fate: 'Released',
        rescueCoordinates: { lat: -33.86, lng: 151.2 },
        initialWeightGrams: 120,
      } as NSWRequiredFields)
    ).toBe(false);
    expect(
      hasMissingNSWRequiredFields({
        encounterType: '',
        fate: 'Released',
        rescueCoordinates: { lat: -33.86, lng: 151.2 },
        initialWeightGrams: 120,
      } as NSWRequiredFields)
    ).toBe(true);
    expect(
      hasMissingNSWRequiredFields({
        encounterType: 'Rescue',
        fate: 'Released',
        rescueCoordinates: { lat: -33.86 },
        initialWeightGrams: 120,
      } as NSWRequiredFields)
    ).toBe(true);
  });

  it('counts animals in the reporting period with any missing field', async () => {
    mockPrisma.animal.findMany.mockResolvedValue([
      { encounterType: 'Rescue', fate: 'Released', rescueCoordinates: { lat: -33, lng: 151 }, initialWeightGrams: 100 },
      { encounterType: null, fate: 'Released', rescueCoordinates: { lat: -33, lng: 151 }, initialWeightGrams: 100 },
      { encounterType: 'Rescue', fate: null, rescueCoordinates: null, initialWeightGrams: null },
    ]);

    await expect(countNSWAnimalsMissingRequiredFields('org-1', 2026)).resolves.toBe(2);
    expect(mockPrisma.animal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clerkOrganizationId: 'org-1',
          dateFound: {
            gte: new Date('2025-07-01T00:00:00.000Z'),
            lte: new Date('2026-06-30T23:59:59.999Z'),
          },
        }),
      })
    );
  });
});

describe('NSW reminder banner targeting', () => {
  it('returns a banner for NSW admin users when not dismissed', async () => {
    mockPrisma.animal.findMany.mockResolvedValue([
      { encounterType: null, fate: 'Released', rescueCoordinates: { lat: -33, lng: 151 }, initialWeightGrams: 100 },
    ]);

    const banner = await getNSWReminderBannerForUser({
      userId: 'user-1',
      orgId: 'org-1',
      role: 'ADMIN',
      now: new Date('2026-06-01T02:00:00.000Z'),
    });

    expect(banner).toMatchObject({
      kind: 'nsw-reminder',
      reminderKey: 'eofy-30-day',
      missingRequiredFieldCount: 1,
      ctaHref: '/compliance/nsw-report',
    });
  });

  it('does not return a banner for carers or non-NSW orgs', async () => {
    await expect(
      getNSWReminderBannerForUser({
        userId: 'user-1',
        orgId: 'org-1',
        role: 'CARER',
        now: new Date('2026-06-01T02:00:00.000Z'),
      })
    ).resolves.toBeNull();

    mockGetServerJurisdiction.mockResolvedValue('ACT');
    await expect(
      getNSWReminderBannerForUser({
        userId: 'user-1',
        orgId: 'org-1',
        role: 'ADMIN',
        now: new Date('2026-06-01T02:00:00.000Z'),
      })
    ).resolves.toBeNull();
  });
});

describe('sendDueNSWReminderNotifications', () => {
  it('sends scheduled reminders to NSW orgs on trigger dates', async () => {
    mockPrisma.orgMember.findMany.mockResolvedValue([{ orgId: 'org-nsw' }, { orgId: 'org-act' }]);
    mockClerk.organizations.getOrganization
      .mockResolvedValueOnce({ publicMetadata: { jurisdiction: 'NSW' } })
      .mockResolvedValueOnce({ publicMetadata: { jurisdiction: 'ACT' } });
    mockPrisma.animal.findMany.mockResolvedValue([]);

    const result = await sendDueNSWReminderNotifications(new Date('2026-08-31T02:00:00.000Z'));

    expect(result).toMatchObject({
      reminder: { key: 'submission-30-day', year: 2026 },
      orgsChecked: 2,
      orgsNotified: 1,
    });
    expect(mockSendAdminNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-nsw',
        kind: 'nsw-reminder',
        dedupeKey: 'submission-30-day:2026',
        cta: { label: 'Open NSW report', href: '/compliance/nsw-report' },
      })
    );
  });

  it('surfaces Clerk organization lookup errors separately from non-NSW skips', async () => {
    mockPrisma.orgMember.findMany.mockResolvedValue([{ orgId: 'org-bad' }, { orgId: 'org-act' }]);
    mockClerk.organizations.getOrganization
      .mockRejectedValueOnce(new Error('Clerk unavailable'))
      .mockResolvedValueOnce({ publicMetadata: { jurisdiction: 'ACT' } });

    const result = await sendDueNSWReminderNotifications(new Date('2026-09-17T02:00:00.000Z'));

    expect(result.results).toEqual([
      {
        orgId: 'org-bad',
        status: 'error',
        reason: 'org_lookup_failed',
        error: 'Clerk unavailable',
      },
      { orgId: 'org-act', status: 'skipped', reason: 'non-nsw' },
    ]);
    expect(mockSendAdminNotification).not.toHaveBeenCalled();
  });

  it('does nothing when today is not a trigger date', async () => {
    await expect(sendDueNSWReminderNotifications(new Date('2026-08-30T02:00:00.000Z'))).resolves.toEqual({
      reminder: null,
      orgsChecked: 0,
      orgsNotified: 0,
      results: [],
    });
    expect(mockPrisma.orgMember.findMany).not.toHaveBeenCalled();
  });
});
