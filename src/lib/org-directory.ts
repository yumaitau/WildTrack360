import 'server-only';

import { prisma } from './prisma';
import { orgSource } from './org-source';
import { isPendingUserId, upsertUserFromClerk } from './user-sync';

// Dual-path organisation directory (issue #56). Every read that used to hit
// Clerk's Organizations API goes through here so the ORG_SOURCE flag flips
// resolution in one place:
//   clerk — legacy: clerkClient() organisation/membership/user lookups.
//   db    — Postgres: organisations / users / org_members tables.

export interface OrganisationInfo {
  id: string;
  name: string;
  /** Subdomain slug (was Clerk publicMetadata.org_url). */
  slug: string | null;
  /** Australian jurisdiction code (was Clerk publicMetadata.jurisdiction). */
  jurisdiction: string | null;
  logoUrl: string | null;
}

export interface OrgRosterEntry {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  imageUrl: string | null;
  /** True for invited-but-not-yet-signed-up placeholder users (db mode only). */
  pending: boolean;
  joinedAt: Date | null;
}

export interface UserInfo {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  imageUrl: string | null;
}

function displayableSlug(value: unknown): string | null {
  return typeof value === 'string' && /^[a-zA-Z0-9-]+$/.test(value) ? value : null;
}

/** Look up an organisation's identity/metadata. Returns null when not found. */
export async function getOrganisationInfo(orgId: string): Promise<OrganisationInfo | null> {
  if (!orgId) return null;

  if (orgSource() === 'db') {
    const org = await prisma.organisation.findUnique({ where: { id: orgId } });
    if (!org) return null;
    return {
      id: org.id,
      name: org.name,
      // A slug equal to the org id is the migration placeholder, not a real subdomain
      slug: org.slug === org.id ? null : org.slug,
      jurisdiction: org.jurisdiction,
      logoUrl: org.logoUrl,
    };
  }

  try {
    const { clerkClient } = await import('@/lib/clerk-server');
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    const meta = (org.publicMetadata ?? {}) as Record<string, unknown>;
    return {
      id: org.id ?? orgId,
      name: org.name ?? orgId,
      slug: displayableSlug(meta.org_url),
      jurisdiction: typeof meta.jurisdiction === 'string' ? meta.jurisdiction : null,
      logoUrl: null,
    };
  } catch {
    return null;
  }
}

/** Look up an organisation by its subdomain slug (db-backed only). */
export async function getOrganisationBySlug(slug: string): Promise<OrganisationInfo | null> {
  if (!slug) return null;
  const org = await prisma.organisation.findUnique({ where: { slug } });
  if (!org || !org.isActive) return null;
  return {
    id: org.id,
    name: org.name,
    slug: org.slug === org.id ? null : org.slug,
    jurisdiction: org.jurisdiction,
    logoUrl: org.logoUrl,
  };
}

/**
 * Full membership roster for an organisation. In db mode pending placeholder
 * users are included with `pending: true` so invite UIs can surface them;
 * most callers should filter them out.
 */
export async function getOrgRoster(orgId: string): Promise<OrgRosterEntry[]> {
  if (!orgId) return [];

  if (orgSource() === 'db') {
    const members = await prisma.orgMember.findMany({
      where: { orgId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
    return members.map((m) => ({
      userId: m.userId,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      email: m.user.email,
      imageUrl: m.user.imageUrl,
      pending: isPendingUserId(m.userId),
      joinedAt: m.createdAt,
    }));
  }

  const { clerkClient } = await import('@/lib/clerk-server');
  const client = await clerkClient();
  const entries: OrgRosterEntry[] = [];
  const limit = 100;
  let offset = 0;
  while (true) {
    const batch = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit,
      offset,
    });
    for (const membership of batch.data as Array<{
      createdAt?: number | Date | null;
      publicUserData?: {
        userId?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        identifier?: string | null;
        imageUrl?: string | null;
      } | null;
    }>) {
      const data = membership.publicUserData;
      if (!data?.userId) continue;
      entries.push({
        userId: data.userId,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        email: data.identifier ?? null,
        imageUrl: data.imageUrl ?? null,
        pending: false,
        joinedAt: membership.createdAt ? new Date(membership.createdAt) : null,
      });
    }
    if (batch.data.length < limit) break;
    offset += limit;
  }
  return entries;
}

/** Whether a user is a member of an organisation. */
export async function isUserInOrg(userId: string, orgId: string): Promise<boolean> {
  if (!userId || !orgId) return false;

  if (orgSource() === 'db') {
    const membership = await prisma.orgMember.findUnique({
      where: { userId_orgId: { userId, orgId } },
      select: { id: true },
    });
    return Boolean(membership);
  }

  const { clerkClient } = await import('@/lib/clerk-server');
  const client = await clerkClient();
  const memberships = await client.users.getOrganizationMembershipList({ userId });
  return memberships.data.some(
    (m: { organization: { id: string } }) => m.organization.id === orgId
  );
}

/** All organisations a user belongs to (id/name/slug). */
export async function getUserOrganisations(
  userId: string
): Promise<Array<{ id: string; name: string; slug: string | null }>> {
  if (!userId) return [];

  if (orgSource() === 'db') {
    const memberships = await prisma.orgMember.findMany({
      where: { userId },
      include: { org: true },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => ({
      id: m.org.id,
      name: m.org.name,
      slug: m.org.slug === m.org.id ? null : m.org.slug,
    }));
  }

  const { clerkClient } = await import('@/lib/clerk-server');
  const client = await clerkClient();
  const memberships = await client.users.getOrganizationMembershipList({ userId });
  return memberships.data.map(
    (m: { organization: { id: string; name: string; slug: string | null } }) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
    })
  );
}

/**
 * Display info for a single user. In db mode reads the users table with a
 * lazy Clerk fallback (covers webhook gaps); in clerk mode reads Clerk.
 */
export async function getUserInfo(userId: string): Promise<UserInfo | null> {
  if (!userId) return null;

  if (orgSource() === 'db') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        imageUrl: user.imageUrl,
      };
    }
    if (isPendingUserId(userId)) return null;
    // Webhook-missed fallback: fetch from Clerk and persist for next time.
    const fetched = await fetchClerkUserInfo(userId);
    if (fetched) {
      await upsertUserFromClerk({
        id: fetched.id,
        email: fetched.email,
        firstName: fetched.firstName,
        lastName: fetched.lastName,
        imageUrl: fetched.imageUrl,
      }).catch((error) => console.error('org-directory: lazy user upsert failed:', error));
    }
    return fetched;
  }

  return fetchClerkUserInfo(userId);
}

async function fetchClerkUserInfo(userId: string): Promise<UserInfo | null> {
  try {
    const { clerkClient } = await import('@/lib/clerk-server');
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const primaryEmail =
      user.emailAddresses?.find(
        (e: { id: string }) => e.id === (user as { primaryEmailAddressId?: string | null }).primaryEmailAddressId
      ) ?? user.emailAddresses?.[0];
    return {
      id: user.id,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      email: primaryEmail?.emailAddress ?? null,
      imageUrl: user.imageUrl ?? null,
    };
  } catch {
    return null;
  }
}
