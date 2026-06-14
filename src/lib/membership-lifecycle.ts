'server-only';

import { prisma } from './prisma';
import { isFeatureEnabled } from './features';
import { getOrgDisplayInfo } from './org-info';
import {
  DAY_MS,
  LAPSE_NOTICE_MAX_DAYS,
  daysSince,
  renewalKindFor,
  winbackKindFor,
} from './membership-lifecycle-schedule';
import {
  sendMembershipLifecycleEmail,
  type LifecycleOrg,
} from './email/membership-lifecycle-emails';
import type { MembershipNotificationKind } from '@prisma/client';

export { DAY_MS, daysSince, daysUntil, renewalKindFor, winbackKindFor } from './membership-lifecycle-schedule';

export interface LifecycleSummary {
  ranAt: string;
  expiredMemberships: number;
  lapsedMembers: number;
  emails: Record<MembershipNotificationKind, number>;
}

function emptyEmailCounts(): Record<MembershipNotificationKind, number> {
  return { RENEWAL_30: 0, RENEWAL_7: 0, RENEWAL_1: 0, LAPSED: 0, WINBACK_30: 0, WINBACK_90: 0 };
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Daily sweep: expire finished membership periods, lapse members no longer
// covered, and send renewal / lapse / win-back emails (idempotently). One-off
// (non-recurring) memberships drive the reminder emails; recurring memberships
// auto-renew and are handled by the billing/dunning worker instead.
export async function runMembershipLifecycle(
  now: Date = new Date(),
  opts: { sendEmails?: boolean } = {}
): Promise<LifecycleSummary> {
  const sendEmails = opts.sendEmails ?? true;
  const emails = emptyEmailCounts();

  // Per-org cache of display info + whether member emails should go out.
  const orgCache = new Map<string, { org: LifecycleOrg; emailsEnabled: boolean }>();
  async function orgFor(orgId: string) {
    let entry = orgCache.get(orgId);
    if (!entry) {
      const [org, enabled] = await Promise.all([
        getOrgDisplayInfo(orgId),
        isFeatureEnabled(orgId, 'MEMBERSHIP_PLATFORM'),
      ]);
      entry = { org, emailsEnabled: enabled };
      orgCache.set(orgId, entry);
    }
    return entry;
  }

  // True when the member has any membership still covering `now`.
  async function isCovered(memberId: string): Promise<boolean> {
    const count = await prisma.membership.count({
      where: { memberId, status: { in: ['ACTIVE', 'PENDING'] }, periodEnd: { gte: now } },
    });
    return count > 0;
  }

  // Send one lifecycle email + record it, but only once per (membership, kind).
  async function notifyOnce(
    kind: MembershipNotificationKind,
    membership: { id: string; clerkOrganizationId: string; memberId: string; periodEnd: Date },
    member: { email: string; firstName: string },
    tierName: string
  ) {
    if (!sendEmails) return;
    const { org, emailsEnabled } = await orgFor(membership.clerkOrganizationId);
    if (!emailsEnabled) return;

    const existing = await prisma.membershipNotification.findUnique({
      where: { membershipId_kind: { membershipId: membership.id, kind } },
    });
    if (existing) return;

    const sent = await sendMembershipLifecycleEmail(kind, member.email, org, {
      firstName: member.firstName,
      tierName,
      periodEndFormatted: formatDate(membership.periodEnd),
    });
    if (!sent) return;

    try {
      await prisma.membershipNotification.create({
        data: {
          clerkOrganizationId: membership.clerkOrganizationId,
          membershipId: membership.id,
          memberId: membership.memberId,
          kind,
        },
      });
      emails[kind] += 1;
    } catch {
      // Unique violation from a concurrent run — the email's already counted there.
    }
  }

  // ── 1. Find + expire finished membership periods ──────────────────────────
  const justEnded = await prisma.membership.findMany({
    where: { status: { in: ['ACTIVE', 'PENDING'] }, periodEnd: { lt: now } },
    include: { member: true, tier: true },
  });

  if (justEnded.length > 0) {
    await prisma.membership.updateMany({
      where: { id: { in: justEnded.map((m) => m.id) } },
      data: { status: 'EXPIRED' },
    });
  }

  // ── 2. Lapse members who are no longer covered, + send the lapse notice ────
  const affectedMemberIds = [...new Set(justEnded.map((m) => m.memberId))];
  const lapsedMemberIds = new Set<string>();
  for (const memberId of affectedMemberIds) {
    if (await isCovered(memberId)) continue;
    lapsedMemberIds.add(memberId);
    await prisma.member.updateMany({
      where: { id: memberId, status: 'ACTIVE' },
      data: { status: 'LAPSED' },
    });
  }

  // Lapse-notice email for the one-off membership that just ended (recently).
  for (const m of justEnded) {
    if (m.recurringSubscriptionId) continue; // recurring → dunning handles it
    if (!lapsedMemberIds.has(m.memberId)) continue; // still covered by a newer period
    if (daysSince(now, m.periodEnd) > LAPSE_NOTICE_MAX_DAYS) continue;
    await notifyOnce('LAPSED', m, m.member, m.tier.name);
  }

  // ── 3. Renewal reminders for active one-off memberships expiring soon ──────
  const upcoming = await prisma.membership.findMany({
    where: {
      status: 'ACTIVE',
      recurringSubscriptionId: null,
      periodEnd: { gte: now, lte: new Date(now.getTime() + 30 * DAY_MS) },
    },
    include: { member: true, tier: true },
  });
  for (const m of upcoming) {
    const kind = renewalKindFor(now, m.periodEnd);
    if (!kind) continue;
    await notifyOnce(kind, m, m.member, m.tier.name);
  }

  // ── 4. Win-back for one-off memberships lapsed 30 / 90 days ago ────────────
  const winbackFrom = new Date(now.getTime() - 120 * DAY_MS);
  const winbackTo = new Date(now.getTime() - 30 * DAY_MS);
  const lapsed = await prisma.membership.findMany({
    where: {
      status: 'EXPIRED',
      recurringSubscriptionId: null,
      periodEnd: { gte: winbackFrom, lte: winbackTo },
    },
    include: { member: true, tier: true },
  });
  for (const m of lapsed) {
    const kind = winbackKindFor(now, m.periodEnd);
    if (!kind) continue;
    if (await isCovered(m.memberId)) continue; // rejoined since — leave them be
    await notifyOnce(kind, m, m.member, m.tier.name);
  }

  return {
    ranAt: now.toISOString(),
    expiredMemberships: justEnded.length,
    lapsedMembers: lapsedMemberIds.size,
    emails,
  };
}
