import type { OrgRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getClerkOrganization, getClerkUser } from '@/lib/clerk-management';
import { isDbOrg } from '@/lib/org-source';
import { tenantBaseUrlFromSlug } from '@/lib/tenant-url';
import { sendEmail } from './resend';
import { AdminNotificationEmail } from './templates/admin-notification';

const DEFAULT_RECIPIENT_ROLES: OrgRole[] = ['ADMIN', 'COORDINATOR_ALL'];

type AdminNotificationInput = {
  orgId: string;
  kind: 'nsw-reminder' | (string & {});
  title: string;
  body: string;
  cta: { label: string; href: string };
  info?: { label: string; value: string }[];
  recipientRoles?: OrgRole[];
  dedupeKey: string;
};

type SendResult =
  | { userId: string; email: string; status: 'sent'; resendMessageId: string | null }
  | { userId: string; email: string; status: 'sent-unlogged'; resendMessageId: string | null }
  | { userId: string; status: 'failed'; reason: 'clerk-user-lookup-failed' }
  | {
      userId: string;
      email?: string;
      status: 'skipped';
      reason: 'duplicate' | 'missing-email' | 'missing-user';
    };

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

function clerkErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
}

// Org display name + subdomain slug for the email body/links, resolved from
// the DB in db mode and Clerk's REST API in clerk mode (issue #56).
async function resolveOrgForEmail(orgId: string): Promise<{ name: string; slug: string | undefined }> {
  if (await isDbOrg(orgId)) {
    const org = await prisma.organisation.findUnique({ where: { id: orgId } });
    return {
      name: org?.name ?? '',
      slug: org && org.slug !== org.id ? org.slug : undefined,
    };
  }
  const org = await getClerkOrganization(orgId);
  return {
    name: org.name,
    slug: (org.public_metadata?.org_url as string | undefined) ?? undefined,
  };
}

export async function sendAdminNotification(input: AdminNotificationInput): Promise<SendResult[]> {
  const recipientRoles = input.recipientRoles?.length
    ? input.recipientRoles
    : DEFAULT_RECIPIENT_ROLES;
  const [org, recipients] = await Promise.all([
    resolveOrgForEmail(input.orgId),
    prisma.orgMember.findMany({
      where: {
        orgId: input.orgId,
        role: { in: recipientRoles },
      },
      select: { userId: true },
      orderBy: { userId: 'asc' },
    }),
  ]);

  const dedupeKey = input.dedupeKey.trim();
  const base = tenantBaseUrlFromSlug(org.slug);
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

    let email: string | null = null;
    if (await isDbOrg(input.orgId)) {
      const user = await prisma.user.findUnique({
        where: { id: recipient.userId },
        select: { email: true },
      });
      if (!user) {
        results.push({ userId: recipient.userId, status: 'skipped', reason: 'missing-user' });
        continue;
      }
      email = user.email;
    } else {
      let clerkUser: Awaited<ReturnType<typeof getClerkUser>>;
      try {
        clerkUser = await getClerkUser(recipient.userId);
      } catch (error) {
        if (clerkErrorStatus(error) === 404) {
          results.push({ userId: recipient.userId, status: 'skipped', reason: 'missing-user' });
        } else {
          console.error('Failed to resolve admin notification recipient from Clerk:', {
            error,
            orgId: input.orgId,
            userId: recipient.userId,
            kind: input.kind,
          });
          results.push({
            userId: recipient.userId,
            status: 'failed',
            reason: 'clerk-user-lookup-failed',
          });
        }
        continue;
      }

      if (!clerkUser) {
        results.push({ userId: recipient.userId, status: 'skipped', reason: 'missing-user' });
        continue;
      }

      email = primaryEmailForUser(clerkUser);
    }

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
