import 'server-only';

import { clerkClient } from '@clerk/nextjs/server';
import type { Animal, OrgRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getServerJurisdiction } from '@/lib/server-config';
import { sendAdminNotification } from '@/lib/email/admin-notifications';
import type { NSWReminderBannerData, NSWReminderKey } from '@/lib/nsw-reminder-types';

const NSW_REMINDER_KIND = 'nsw-reminder';
const NSW_REPORT_CTA_HREF = '/compliance/nsw-report';
const NSW_OBLIGATION =
  'NSW wildlife rehabilitation providers must submit annual records as a condition of their Biodiversity Conservation Licence.';

type NSWReminderDefinition = {
  key: NSWReminderKey;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  title: string;
  message: string;
  emailBody: string;
};

const NSW_REMINDERS: NSWReminderDefinition[] = [
  {
    key: 'eofy-30-day',
    startMonth: 6,
    startDay: 1,
    endMonth: 6,
    endDay: 15,
    title: 'NSW reporting period closes in 30 days',
    message:
      'Your NSW reporting period closes in 30 days. Review and complete outstanding animal records now so nothing falls through the cracks.',
    emailBody:
      'Your NSW reporting period closes in 30 days. Review and complete outstanding animal records now so nothing falls through the cracks.',
  },
  {
    key: 'eofy-14-day',
    startMonth: 6,
    startDay: 16,
    endMonth: 6,
    endDay: 30,
    title: 'NSW EOFY is in 14 days',
    message:
      'NSW EOFY is in 14 days. Check your open animal records and carer data for gaps before the reporting window closes.',
    emailBody:
      'NSW EOFY is in 14 days. Check your open animal records and carer data for gaps before the reporting window closes.',
  },
  {
    key: 'submission-30-day',
    startMonth: 8,
    startDay: 31,
    endMonth: 9,
    endDay: 15,
    title: 'NSW annual return is due in 30 days',
    message:
      'Your NSW annual return is due in 30 days (30 September). Generate your Detailed and Combined reports now to catch data issues early.',
    emailBody:
      'Your NSW annual return is due in 30 days (30 September). Generate your Detailed and Combined reports now to catch data issues early.',
  },
  {
    key: 'submission-14-day',
    startMonth: 9,
    startDay: 16,
    endMonth: 9,
    endDay: 30,
    title: 'NSW annual return is due in 14 days',
    message:
      'NSW annual return is due in 14 days. Email your Detailed and Combined reports to wildlife.rehabilitation@environment.nsw.gov.au before 30 September.',
    emailBody:
      'NSW annual return is due in 14 days. Email your Detailed and Combined reports to wildlife.rehabilitation@environment.nsw.gov.au before 30 September.',
  },
];

type SydneyDateParts = {
  year: number;
  month: number;
  day: number;
};

function sydneyDateParts(now: Date): SydneyDateParts {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
  };
}

function dayNumber({ year, month, day }: SydneyDateParts): number {
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

function definitionStart(definition: NSWReminderDefinition, year: number): SydneyDateParts {
  return { year, month: definition.startMonth, day: definition.startDay };
}

function definitionEnd(definition: NSWReminderDefinition, year: number): SydneyDateParts {
  return { year, month: definition.endMonth, day: definition.endDay };
}

function reminderForDate(today: SydneyDateParts): NSWReminderDefinition | null {
  const todayNumber = dayNumber(today);
  return NSW_REMINDERS.find((reminder) => {
    const startNumber = dayNumber(definitionStart(reminder, today.year));
    const endNumber = dayNumber(definitionEnd(reminder, today.year));
    return todayNumber >= startNumber && todayNumber <= endNumber;
  }) ?? null;
}

export function canReceiveNSWReminder(role: OrgRole): boolean {
  return role === 'ADMIN' || role === 'COORDINATOR_ALL';
}

export function getNSWReportingPeriod(year: number) {
  return {
    startDate: new Date(Date.UTC(year - 1, 6, 1, 0, 0, 0, 0)),
    endDate: new Date(Date.UTC(year, 5, 30, 23, 59, 59, 999)),
    label: `1 July ${year - 1} to 30 June ${year}`,
  };
}

export function getActiveNSWReminder(now: Date = new Date()) {
  const today = sydneyDateParts(now);
  const definition = reminderForDate(today);

  if (!definition) return null;

  return {
    ...definition,
    year: today.year,
  };
}

export function getNSWReminderDueForEmail(now: Date = new Date()) {
  const today = sydneyDateParts(now);
  const definition = reminderForDate(today);

  if (!definition) return null;

  return {
    ...definition,
    year: today.year,
  };
}

type NSWRequiredAnimalFields = Pick<
  Animal,
  'encounterType' | 'fate' | 'rescueCoordinates' | 'initialWeightGrams'
>;

function missingText(value: string | null): boolean {
  return !value || value.trim().length === 0;
}

function missingCoordinates(value: unknown): boolean {
  if (!value || typeof value !== 'object') return true;
  const coords = value as { lat?: unknown; lng?: unknown };
  return typeof coords.lat !== 'number' || typeof coords.lng !== 'number';
}

export function hasMissingNSWRequiredFields(animal: NSWRequiredAnimalFields): boolean {
  return (
    missingText(animal.encounterType) ||
    missingText(animal.fate) ||
    missingCoordinates(animal.rescueCoordinates) ||
    animal.initialWeightGrams == null
  );
}

export async function countNSWAnimalsMissingRequiredFields(orgId: string, year: number): Promise<number> {
  const period = getNSWReportingPeriod(year);
  const animals = await prisma.animal.findMany({
    where: {
      clerkOrganizationId: orgId,
      dateFound: {
        gte: period.startDate,
        lte: period.endDate,
      },
    },
    select: {
      encounterType: true,
      fate: true,
      rescueCoordinates: true,
      initialWeightGrams: true,
    },
  });

  return animals.filter(hasMissingNSWRequiredFields).length;
}

export async function getNSWReminderBannerForUser({
  userId,
  orgId,
  role,
  now = new Date(),
}: {
  userId: string;
  orgId: string;
  role: OrgRole;
  now?: Date;
}): Promise<NSWReminderBannerData | null> {
  if (!canReceiveNSWReminder(role)) return null;

  const reminder = getActiveNSWReminder(now);
  if (!reminder) return null;

  const jurisdiction = await getServerJurisdiction(orgId);
  if (jurisdiction !== 'NSW') return null;

  const dismissal = await prisma.adminNotificationDismissal.findUnique({
    where: {
      orgId_userId_kind_reminderKey_year: {
        orgId,
        userId,
        kind: NSW_REMINDER_KIND,
        reminderKey: reminder.key,
        year: reminder.year,
      },
    },
  });

  if (dismissal) return null;

  const missingRequiredFieldCount = await countNSWAnimalsMissingRequiredFields(orgId, reminder.year);
  const period = getNSWReportingPeriod(reminder.year);

  return {
    kind: NSW_REMINDER_KIND,
    reminderKey: reminder.key,
    year: reminder.year,
    title: reminder.title,
    message: reminder.message,
    obligation: NSW_OBLIGATION,
    ctaHref: NSW_REPORT_CTA_HREF,
    ctaLabel: 'Open NSW report',
    missingRequiredFieldCount,
    reportingPeriodLabel: period.label,
  };
}

export async function dismissNSWReminder({
  userId,
  orgId,
  reminderKey,
  year,
}: {
  userId: string;
  orgId: string;
  reminderKey: NSWReminderKey;
  year: number;
}) {
  return prisma.adminNotificationDismissal.upsert({
    where: {
      orgId_userId_kind_reminderKey_year: {
        orgId,
        userId,
        kind: NSW_REMINDER_KIND,
        reminderKey,
        year,
      },
    },
    create: {
      orgId,
      userId,
      kind: NSW_REMINDER_KIND,
      reminderKey,
      year,
    },
    update: {
      dismissedAt: new Date(),
    },
  });
}

export async function sendDueNSWReminderNotifications(now: Date = new Date()) {
  const reminder = getNSWReminderDueForEmail(now);
  if (!reminder) {
    return { reminder: null, orgsChecked: 0, orgsNotified: 0, results: [] };
  }

  const client = await clerkClient();
  const orgRows = await prisma.orgMember.findMany({
    where: { role: { in: ['ADMIN', 'COORDINATOR_ALL'] } },
    distinct: ['orgId'],
    select: { orgId: true },
    orderBy: { orgId: 'asc' },
  });

  const period = getNSWReportingPeriod(reminder.year);
  const results: {
    orgId: string;
    status: 'sent' | 'skipped' | 'error';
    reason?: 'non-nsw' | 'org_lookup_failed';
    error?: string;
    sentCount?: number;
    skippedCount?: number;
  }[] = [];

  for (const row of orgRows) {
    let org;
    try {
      org = await client.organizations.getOrganization({ organizationId: row.orgId });
    } catch (error) {
      results.push({
        orgId: row.orgId,
        status: 'error',
        reason: 'org_lookup_failed',
        error: error instanceof Error ? error.message : 'Unknown organization lookup error',
      });
      continue;
    }

    const jurisdiction = org?.publicMetadata?.jurisdiction;

    if (jurisdiction !== 'NSW') {
      results.push({ orgId: row.orgId, status: 'skipped', reason: 'non-nsw' });
      continue;
    }

    const missingRequiredFieldCount = await countNSWAnimalsMissingRequiredFields(row.orgId, reminder.year);
    const notificationResults = await sendAdminNotification({
      orgId: row.orgId,
      kind: NSW_REMINDER_KIND,
      title: reminder.title,
      body: `${reminder.emailBody}\n\n${NSW_OBLIGATION}`,
      cta: { label: 'Open NSW report', href: NSW_REPORT_CTA_HREF },
      dedupeKey: `${reminder.key}:${reminder.year}`,
      info: [
        { label: 'Reporting period', value: period.label },
        { label: 'Data gaps', value: `${missingRequiredFieldCount} animals are missing NSW-required fields.` },
        { label: 'Required fields', value: 'Encounter type, fate, location coordinates, and initial weight.' },
      ],
    });

    results.push({
      orgId: row.orgId,
      status: 'sent',
      sentCount: notificationResults.filter((result) => result.status === 'sent').length,
      skippedCount: notificationResults.filter((result) => result.status === 'skipped').length,
    });
  }

  return {
    reminder: { key: reminder.key, year: reminder.year },
    orgsChecked: orgRows.length,
    orgsNotified: results.filter((result) => result.status === 'sent' && (result.sentCount ?? 0) > 0).length,
    results,
  };
}
