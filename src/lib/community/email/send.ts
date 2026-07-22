import type { CommunityEmailFrequency } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getEmailConfig } from './config';
import { getEmailProvider } from './provider';
import { resolveRecipientEmail } from './recipient';
import { digestDayKey, isDigestDue } from './frequency';
import {
  buildDigestForProfile,
  resolveDeliverableNotifications,
  type DigestSection,
} from './digest';
import { communityDigestEmail } from './templates';
import { buildUnsubscribeToken } from './unsubscribe-token';

export type DigestSendMode = 'daily' | 'weekly';

export interface CommunitySendResult {
  ran: boolean;
  sent: number;
  skipped: number;
  suppressed: number;
  failed: number;
}

// How far back an unread notification can be and still trigger an immediate
// email (covers a cron run the scheduler missed), plus the per-user rolling cap.
const IMMEDIATE_LOOKBACK_MS = 2 * 24 * 60 * 60 * 1000;
const IMMEDIATE_CEILING_WINDOW_MS = 24 * 60 * 60 * 1000;
const IMMEDIATE_DAILY_CEILING = 10;

const SETTINGS_PATH = '/community/settings/notifications';
const UNSUBSCRIBE_PATH = '/community/notifications/unsubscribe';

const RECIPIENT_SELECT = {
  status: true,
  displayName: true,
  clerkUserId: true,
} as const;

function emptyResult(ran: boolean): CommunitySendResult {
  return { ran, sent: 0, skipped: 0, suppressed: 0, failed: 0 };
}

function isUniqueViolation(err: unknown): boolean {
  return !!err && typeof err === 'object' && (err as { code?: string }).code === 'P2002';
}

function resolveAppUrl(): string {
  return getEmailConfig()?.appUrl ?? 'http://localhost:3000';
}

function abs(appUrl: string, path: string): string {
  return `${appUrl.replace(/\/$/, '')}${path}`;
}

function footerUrls(appUrl: string, profileId: string, now: Date) {
  const unsubscribeAllToken = buildUnsubscribeToken({ profileId, scope: 'all' }, now);
  const downgradeToken = buildUnsubscribeToken({ profileId, scope: 'downgrade' }, now);
  return {
    settingsUrl: abs(appUrl, SETTINGS_PATH),
    unsubscribeAllUrl: abs(appUrl, `${UNSUBSCRIBE_PATH}?token=${unsubscribeAllToken}`),
    digestDowngradeUrl: abs(appUrl, `${UNSUBSCRIBE_PATH}?token=${downgradeToken}`),
  };
}

// Returns the sendable address, or null when the recipient is ineligible
// (inactive user, no email, or a banned/left community profile). The address is
// resolved from Clerk at send time rather than stored on the profile.
async function recipientEmail(profile: {
  status: string;
  clerkUserId: string;
}): Promise<string | null> {
  if (profile.status === 'BANNED' || profile.status === 'LEFT') return null;
  const { email, isActive } = await resolveRecipientEmail(profile.clerkUserId);
  if (!isActive || !email) return null;
  return email;
}

async function markSent(id: string, now: Date, messageId?: string): Promise<void> {
  await prisma.communityEmailDelivery.update({
    where: { id },
    data: { status: 'SENT', providerMessageId: messageId ?? null, sentAt: now },
  });
}

async function markFailed(id: string, error?: string): Promise<void> {
  await prisma.communityEmailDelivery.update({
    where: { id },
    data: { status: 'FAILED', errorCode: error ?? 'send-failed' },
  });
}

async function markSuppressed(id: string, reason: string): Promise<void> {
  await prisma.communityEmailDelivery.update({
    where: { id },
    data: { status: 'SUPPRESSED', errorCode: reason },
  });
}

// Preference may have changed between selection and send; re-read it so a switch
// to OFF or a different frequency suppresses instead of mailing.
async function preferenceStillWants(
  profileId: string,
  frequency: CommunityEmailFrequency
): Promise<boolean> {
  const fresh = await prisma.communityNotificationPreference.findUnique({
    where: { profileId },
    select: { emailEnabled: true, frequency: true },
  });
  return !!fresh && fresh.emailEnabled && fresh.frequency === frequency;
}

export async function sendCommunityDigests(
  mode: DigestSendMode,
  now: Date
): Promise<CommunitySendResult> {
  const provider = getEmailProvider();
  if (!provider) return emptyResult(false);

  const appUrl = resolveAppUrl();
  const wantFrequency: CommunityEmailFrequency = mode === 'weekly' ? 'WEEKLY' : 'DAILY';

  const prefs = await prisma.communityNotificationPreference.findMany({
    where: { emailEnabled: true, frequency: wantFrequency },
    select: {
      profileId: true,
      timezone: true,
      digestDay: true,
      digestHour: true,
      frequency: true,
      preferenceVersion: true,
      profile: { select: RECIPIENT_SELECT },
    },
  });

  const result = emptyResult(true);

  for (const pref of prefs) {
    if (!isDigestDue(pref, now)) {
      result.skipped++;
      continue;
    }

    const dayKey = digestDayKey(now, pref.timezone);
    const kind = `digest:${mode}:${dayKey}`;
    // dedupeKey is globally @unique, so it must include the profile — the daily
    // key alone would let only one recipient per day exist.
    const dedupeKey = `${kind}:${pref.profileId}`;

    let deliveryId: string;
    try {
      const created = await prisma.communityEmailDelivery.create({
        data: {
          recipientId: pref.profileId,
          kind,
          dedupeKey,
          preferenceVersion: pref.preferenceVersion,
          status: 'PENDING',
        },
        select: { id: true },
      });
      deliveryId = created.id;
    } catch (err) {
      if (isUniqueViolation(err)) {
        result.skipped++;
        continue;
      }
      console.error(`[community-email] digest create failed for ${pref.profileId}:`, err);
      result.failed++;
      continue;
    }

    if (!(await preferenceStillWants(pref.profileId, wantFrequency))) {
      await markSuppressed(deliveryId, 'preference-changed');
      result.suppressed++;
      continue;
    }

    const digestEmail = await recipientEmail(pref.profile);
    if (!digestEmail) {
      await markSuppressed(deliveryId, 'ineligible-recipient');
      result.suppressed++;
      continue;
    }

    const digest = await buildDigestForProfile(pref.profileId, { now, appUrl });
    if (digest.itemCount === 0) {
      await markSuppressed(deliveryId, 'empty');
      result.suppressed++;
      continue;
    }

    const rendered = communityDigestEmail({
      displayName: pref.profile.displayName,
      sections: digest.sections,
      itemCount: digest.itemCount,
      appUrl,
      ...footerUrls(appUrl, pref.profileId, now),
    });

    const send = await provider.sendEmail({
      to: [digestEmail],
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });
    if (send.ok) {
      await markSent(deliveryId, now, send.messageId);
      result.sent++;
    } else {
      await markFailed(deliveryId, send.error);
      result.failed++;
    }
  }

  return result;
}

export async function sendCommunityImmediate(now: Date): Promise<CommunitySendResult> {
  const provider = getEmailProvider();
  if (!provider) return emptyResult(false);

  const appUrl = resolveAppUrl();
  const cutoff = new Date(now.getTime() - IMMEDIATE_LOOKBACK_MS);
  const ceilingSince = new Date(now.getTime() - IMMEDIATE_CEILING_WINDOW_MS);

  const prefs = await prisma.communityNotificationPreference.findMany({
    where: { emailEnabled: true, frequency: 'IMMEDIATE' },
    select: {
      profileId: true,
      preferenceVersion: true,
      profile: { select: RECIPIENT_SELECT },
    },
  });

  const result = emptyResult(true);

  for (const pref of prefs) {
    const email = await recipientEmail(pref.profile);
    if (!email) continue;
    if (!(await preferenceStillWants(pref.profileId, 'IMMEDIATE'))) continue;

    // Rolling 24h ceiling approximates a daily cap without per-timezone day math;
    // anything over the cap rolls into the user's next digest instead.
    const alreadySent = await prisma.communityEmailDelivery.count({
      where: {
        recipientId: pref.profileId,
        status: 'SENT',
        kind: { startsWith: 'immediate:' },
        sentAt: { gte: ceilingSince },
      },
    });
    let budget = IMMEDIATE_DAILY_CEILING - alreadySent;
    if (budget <= 0) {
      result.skipped++;
      continue;
    }

    const notifications = await prisma.communityNotification.findMany({
      where: { recipientId: pref.profileId, readAt: null, createdAt: { gte: cutoff } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        type: true,
        targetType: true,
        targetId: true,
        title: true,
        createdAt: true,
      },
    });
    if (notifications.length === 0) continue;

    const deliverable = await resolveDeliverableNotifications(notifications, appUrl);

    for (const { notification, href } of deliverable) {
      if (budget <= 0) break;

      const dedupeKey = `immediate:${notification.id}`;
      const kind = `immediate:${notification.type.toLowerCase()}:${notification.id}`;

      let deliveryId: string;
      try {
        const created = await prisma.communityEmailDelivery.create({
          data: {
            recipientId: pref.profileId,
            kind,
            dedupeKey,
            preferenceVersion: pref.preferenceVersion,
            status: 'PENDING',
          },
          select: { id: true },
        });
        deliveryId = created.id;
      } catch (err) {
        if (isUniqueViolation(err)) {
          result.skipped++;
          continue;
        }
        console.error(`[community-email] immediate create failed for ${pref.profileId}:`, err);
        result.failed++;
        continue;
      }

      const section: DigestSection = {
        type: notification.type,
        count: 1,
        items: [{ title: notification.title, href }],
      };
      const rendered = communityDigestEmail({
        displayName: pref.profile.displayName,
        sections: [section],
        itemCount: 1,
        appUrl,
        ...footerUrls(appUrl, pref.profileId, now),
      });

      const send = await provider.sendEmail({
        to: [email],
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      });
      if (send.ok) {
        await markSent(deliveryId, now, send.messageId);
        result.sent++;
        budget--;
      } else {
        await markFailed(deliveryId, send.error);
        result.failed++;
      }
    }
  }

  return result;
}
