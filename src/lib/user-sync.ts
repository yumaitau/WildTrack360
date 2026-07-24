import 'server-only';

import { prisma } from './prisma';
import type { Prisma } from '@prisma/client';

// Mirrors Clerk users/organisations into the DB (issue #56 design decision
// D4/D5). Two write paths share this module:
//   1. The Clerk webhook (src/app/api/webhooks/clerk/route.ts) — primary.
//   2. Lazy upserts on sign-in (src/lib/database.ts createOrUpdateClerkUser,
//      called from the home page) — fallback for missed webhook deliveries.
//
// Invited-but-not-yet-signed-up users exist as `pending_` placeholder rows
// (created by /api/admin/invite). On first sign-in the placeholder is claimed
// by verified-email match: its memberships move to the real Clerk user id and
// the placeholder row is deleted, all in one transaction.

export const PENDING_USER_PREFIX = 'pending_';

export function isPendingUserId(id: string): boolean {
  return id.startsWith(PENDING_USER_PREFIX);
}

export interface ClerkUserData {
  id: string;
  // Only pass emails Clerk reports as verified — the claim flow trusts this
  // value to hand over pending memberships.
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
}

type Tx = Prisma.TransactionClient;

async function claimPendingUser(tx: Tx, realUserId: string, email: string): Promise<boolean> {
  const pending = await tx.user.findFirst({
    where: { email, id: { startsWith: PENDING_USER_PREFIX } },
    include: { memberships: true },
  });
  if (!pending) return false;

  for (const membership of pending.memberships) {
    await tx.orgMember.upsert({
      where: { userId_orgId: { userId: realUserId, orgId: membership.orgId } },
      // Preserve the role the admin picked at invite time
      create: { userId: realUserId, orgId: membership.orgId, role: membership.role },
      // Never downgrade an existing membership from a stale pending row
      update: {},
    });
  }

  // Deleting the placeholder cascades its OrgMember rows and frees the unique
  // email for the real user row.
  await tx.user.delete({ where: { id: pending.id } });

  if (pending.invitedAt) {
    await tx.user.update({
      where: { id: realUserId },
      data: { invitedAt: pending.invitedAt },
    });
  }
  return true;
}

/**
 * Idempotent upsert of a Clerk user into the users table. Claims any
 * `pending_` placeholder row matching the user's verified email.
 */
export async function upsertUserFromClerk(user: ClerkUserData): Promise<void> {
  if (!user.id || isPendingUserId(user.id)) return;

  await prisma.$transaction(async (tx) => {
    // Create/refresh the row without the email first: the email may still be
    // held by a pending placeholder (unique constraint), and the claim step
    // needs the real user row to exist for the OrgMember FKs.
    await tx.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        imageUrl: user.imageUrl ?? null,
      },
      update: {
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        imageUrl: user.imageUrl ?? null,
        isActive: true,
      },
    });

    if (user.email) {
      await claimPendingUser(tx, user.id, user.email);
      try {
        await tx.user.update({ where: { id: user.id }, data: { email: user.email } });
      } catch (error) {
        // Another (non-pending) row already holds this email. Clerk enforces
        // unique emails, so this only happens with stale data — keep the row
        // usable rather than failing the whole sync.
        console.error(`user-sync: could not set email for ${user.id}:`, error);
      }
    }
  });
}

/** Soft-delete: keep the row (audit logs and FKs reference it), mark inactive. */
export async function deactivateUser(userId: string): Promise<void> {
  await prisma.user.updateMany({ where: { id: userId }, data: { isActive: false } });
}

export interface ClerkOrganisationData {
  id: string;
  name?: string | null;
  slug?: string | null; // Clerk publicMetadata.org_url
  jurisdiction?: string | null; // Clerk publicMetadata.jurisdiction
  logoUrl?: string | null;
}

/**
 * Idempotent upsert of a Clerk organisation. The slug (subdomain) is the
 * routing key: only overwrite it when Clerk actually has org_url metadata,
 * and never clobber another org's slug (unique constraint).
 */
export async function upsertOrganisationFromClerk(org: ClerkOrganisationData): Promise<void> {
  if (!org.id) return;

  const existing = await prisma.organisation.findUnique({ where: { id: org.id } });

  const slug = org.slug?.trim() || existing?.slug || org.id;
  const name = org.name?.trim() || existing?.name || org.id;

  try {
    await prisma.organisation.upsert({
      where: { id: org.id },
      create: {
        id: org.id,
        name,
        slug,
        jurisdiction: org.jurisdiction ?? null,
        logoUrl: org.logoUrl ?? null,
      },
      update: {
        name,
        slug,
        jurisdiction: org.jurisdiction ?? existing?.jurisdiction ?? null,
        logoUrl: org.logoUrl ?? existing?.logoUrl ?? null,
      },
    });
  } catch (error) {
    console.error(`user-sync: could not upsert organisation ${org.id}:`, error);
  }
}
