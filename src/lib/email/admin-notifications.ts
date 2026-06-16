import 'server-only';

import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { tenantBaseUrlFromSlug } from '@/lib/tenant-url';
import { sendEmail } from './resend';
import { AdminNotificationEmail } from './templates/admin-notification';

type AdminNotificationInput = {
  orgId: string;
  kind: 'nsw-reminder' | (string & {});
  title: string;
  body: string;
  cta: { label: string; href: string };
  info?: { label: string; value: string }[];
  dedupeKey: string;
};

type SendResult =
  | { userId: string; email: string; status: 'sent'; resendMessageId: string | null }
  | { userId: string; email: string; status: 'sent-unlogged'; resendMessageId: string | null }
  | { userId: string; email?: string; status: 'skipped'; reason: 'duplicate' | 'missing-email' | 'missing-user' };

type ClerkUserWithEmailAddresses = {
  primaryEmailAddressId?: string | null;
  emailAddresses?: { id: string; emailAddress: string }[];
};

function primaryEmailForUser(user: ClerkUserWithEmailAddresses): string | null {
  const primary = user.emailAddresses?.find((email) => email.id === user.primaryEmailAddressId);
  return primary?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress ?? null;
}

// Make a relative href absolute against the recipient org's own tenant
// subdomain. Email links can't use the request origin (sent from a cron job,
// no request) nor a baked-in site URL (wrong for a multi-tenant app), so we
// resolve against the org's subdomain.
function toAbsoluteAppUrl(href: string, base: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  return `${base}${href.startsWith('/') ? href : `/${href}`}`;
}

function tagValue(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 256) || 'unknown';
}

export async function sendAdminNotification(input: AdminNotificationInput): Promise<SendResult[]> {
  const client = await clerkClient();
  const [org, recipients] = await Promise.all([
    client.organizations.getOrganization({ organizationId: input.orgId }),
    prisma.orgMember.findMany({
      where: {
        orgId: input.orgId,
        role: { in: ['ADMIN', 'COORDINATOR_ALL'] },
      },
      select: { userId: true },
      orderBy: { userId: 'asc' },
    }),
  ]);

  const dedupeKey = input.dedupeKey.trim();
  const base = tenantBaseUrlFromSlug(
    (org.publicMetadata as Record<string, unknown> | null)?.org_url as string | undefined
  );
  const cta = { ...input.cta, href: toAbsoluteAppUrl(input.cta.href, base) };
  const manageNotificationsHref = toAbsoluteAppUrl('/admin', base);
  const results: SendResult[] = [];

  for (const recipient of recipients) {
    if (dedupeKey) {
      const existing = await prisma.adminNotificationLog.findUnique({
        where: {
          orgId_userId_kind_dedupeKey: {
            orgId: input.orgId,
            userId: recipient.userId,
            kind: input.kind,
            dedupeKey,
          },
        },
      });

      if (existing) {
        results.push({ userId: recipient.userId, status: 'skipped', reason: 'duplicate' });
        continue;
      }
    }

    const clerkUser = await client.users.getUser(recipient.userId).catch(() => null);
    if (!clerkUser) {
      results.push({ userId: recipient.userId, status: 'skipped', reason: 'missing-user' });
      continue;
    }

    const email = primaryEmailForUser(clerkUser);
    if (!email) {
      results.push({ userId: recipient.userId, status: 'skipped', reason: 'missing-email' });
      continue;
    }

    const sent = await sendEmail({
      to: email,
      subject: input.title,
      react: AdminNotificationEmail({
        orgName: org.name,
        title: input.title,
        body: input.body,
        cta,
        info: input.info,
        manageNotificationsHref,
      }),
      tags: [
        { name: 'kind', value: 'admin-notification' },
        { name: 'feature', value: tagValue(input.kind) },
      ],
    });

    if (dedupeKey) {
      try {
        await prisma.adminNotificationLog.create({
          data: {
            orgId: input.orgId,
            userId: recipient.userId,
            kind: input.kind,
            dedupeKey,
            resendMessageId: sent.id,
          },
        });
      } catch (error) {
        console.error('Failed to log admin notification after email send:', {
          error,
          orgId: input.orgId,
          userId: recipient.userId,
          kind: input.kind,
          dedupeKey,
          resendMessageId: sent.id,
        });
        results.push({
          userId: recipient.userId,
          email,
          status: 'sent-unlogged',
          resendMessageId: sent.id,
        });
        continue;
      }
    }

    results.push({
      userId: recipient.userId,
      email,
      status: 'sent',
      resendMessageId: sent.id,
    });
  }

  return results;
}
