import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import type { OrgRole } from '@prisma/client';
import { auth, clerkClient } from '@/lib/clerk-server';
import { prisma } from '@/lib/prisma';
import { getOrganisationInfo } from '@/lib/org-directory';
import { orgSource } from '@/lib/org-source';
import { getUserRole } from '@/lib/rbac';
import { tenantBaseUrlFromSlug } from '@/lib/tenant-url';
import { PENDING_USER_PREFIX } from '@/lib/user-sync';
import { logAudit } from '@/lib/audit';
import { route } from '@/lib/openapi/route';
import { inviteUserContract, listInvitesContract, revokeInviteContract } from '../openapi';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

function clerkErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
}

async function requireAdmin(): Promise<
  { userId: string; orgId: string } | NextResponse
> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = await getUserRole(userId, orgId);
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return { userId, orgId };
}

async function signUpRedirectUrl(orgId: string): Promise<string> {
  const org = await getOrganisationInfo(orgId);
  const slug = org?.slug ?? undefined;
  if (slug && /^[a-zA-Z0-9-]+$/.test(slug)) {
    return `${tenantBaseUrlFromSlug(slug)}/sign-up`;
  }
  const protocol = ROOT_DOMAIN.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${ROOT_DOMAIN}/sign-up`;
}

// Issue #56 design decision D5: in db mode an invite is (a) a pending User
// placeholder + OrgMember row carrying the admin-chosen role, and (b) a Clerk
// *application-level* invitation (free, unlimited — creates a Clerk user, not
// an org membership). On first sign-in the placeholder is claimed by verified
// email match (src/lib/user-sync.ts). No seat caps.
async function createDbInvite(
  actorUserId: string,
  orgId: string,
  emailAddress: string,
  role: OrgRole
): Promise<NextResponse | { data: { id: string } }> {
  const existingUser = await prisma.user.findUnique({
    where: { email: emailAddress },
    include: { memberships: { where: { orgId }, select: { id: true } } },
  });
  if (existingUser?.memberships.length) {
    return NextResponse.json(
      { error: 'This user is already a member or has a pending invitation' },
      { status: 409 }
    );
  }

  const pendingUser =
    existingUser ??
    (await prisma.user.create({
      data: {
        id: `${PENDING_USER_PREFIX}${randomUUID()}`,
        email: emailAddress,
        invitedAt: new Date(),
      },
    }));

  await prisma.orgMember.upsert({
    where: { userId_orgId: { userId: pendingUser.id, orgId } },
    create: { userId: pendingUser.id, orgId, role },
    update: {},
  });

  try {
    const clerk = await clerkClient();
    const redirectUrl = await signUpRedirectUrl(orgId);
    await clerk.invitations.createInvitation({
      emailAddress,
      redirectUrl,
      ignoreExisting: true,
      notify: true,
      publicMetadata: { wildtrack_org_id: orgId, wildtrack_role: role },
    });
  } catch (error) {
    // The DB rows are the membership grant; a failed Clerk email is retryable
    // via revoke + re-invite, but surface it so the admin knows.
    console.error('Clerk application invitation failed:', error);
    if (pendingUser.id.startsWith(PENDING_USER_PREFIX) && !existingUser) {
      await prisma.user.delete({ where: { id: pendingUser.id } }).catch(() => undefined);
    }
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 502 });
  }

  logAudit({
    userId: actorUserId,
    orgId,
    action: 'CREATE',
    entity: 'OrgMember',
    entityId: pendingUser.id,
    metadata: { invitedEmail: emailAddress, role, pending: true },
  });

  return { data: { id: pendingUser.id } };
}

export const POST = route(inviteUserContract, async ({ body }) => {
  const adminOrError = await requireAdmin();
  if (adminOrError instanceof NextResponse) return adminOrError;
  const { userId, orgId } = adminOrError;

  const { emailAddress, role } = body;
  if (!emailAddress) return NextResponse.json({ error: 'Email address is required' }, { status: 400 });

  if (orgSource() === 'db') {
    return createDbInvite(userId, orgId, emailAddress, (role as OrgRole) ?? 'CARER');
  }

  try {
    const clerk = await clerkClient();
    const redirectUrl = await signUpRedirectUrl(orgId);

    const invitation = await clerk.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress,
      role: 'org:member',
      redirectUrl,
    });

    return { data: { id: invitation.id } };
  } catch (error) {
    console.error('Clerk API error during invitation:', error);
    if (clerkErrorStatus(error) === 403) {
      return NextResponse.json(
        { error: 'Invitation is not permitted for this organisation' },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 502 });
  }
});

export const GET = route(listInvitesContract, async () => {
  const adminOrError = await requireAdmin();
  if (adminOrError instanceof NextResponse) return adminOrError;
  const { orgId } = adminOrError;

  if (orgSource() === 'db') {
    const pendingMembers = await prisma.orgMember.findMany({
      where: { orgId, userId: { startsWith: PENDING_USER_PREFIX } },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    return {
      data: pendingMembers.map((m) => ({
        id: m.userId,
        emailAddress: m.user.email ?? '',
        role: m.role,
        createdAt: (m.user.invitedAt ?? m.createdAt).toISOString(),
      })),
    };
  }

  try {
    const clerk = await clerkClient();
    const invitations = await clerk.organizations.getOrganizationInvitationList({
      organizationId: orgId,
      status: ['pending'],
    });
    return {
      data: invitations.data.map(
        (inv: { id: string; emailAddress: string; createdAt: number | null }) => ({
          id: inv.id,
          emailAddress: inv.emailAddress,
          role: null,
          createdAt: inv.createdAt ? new Date(inv.createdAt).toISOString() : null,
        })
      ),
    };
  } catch (error) {
    console.error('Failed to list organisation invitations:', error);
    return NextResponse.json({ error: 'Failed to list invitations' }, { status: 502 });
  }
});

export const DELETE = route(revokeInviteContract, async ({ query }) => {
  const adminOrError = await requireAdmin();
  if (adminOrError instanceof NextResponse) return adminOrError;
  const { userId, orgId } = adminOrError;

  const inviteId = query.id;
  if (!inviteId) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  if (orgSource() === 'db') {
    if (!inviteId.startsWith(PENDING_USER_PREFIX)) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }
    const membership = await prisma.orgMember.findUnique({
      where: { userId_orgId: { userId: inviteId, orgId } },
      include: { user: true },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // If the placeholder only belongs to this org, remove the whole row;
    // otherwise just this org's membership.
    const otherMemberships = await prisma.orgMember.count({
      where: { userId: inviteId, NOT: { orgId } },
    });
    if (otherMemberships === 0) {
      await prisma.user.delete({ where: { id: inviteId } });
    } else {
      await prisma.orgMember.delete({ where: { id: membership.id } });
    }

    // Best-effort revoke of the matching Clerk application invitation so the
    // emailed link stops working.
    if (membership.user.email) {
      try {
        const clerk = await clerkClient();
        const pending = await clerk.invitations.getInvitationList({
          status: 'pending',
          query: membership.user.email,
        });
        for (const inv of pending.data as Array<{ id: string; emailAddress: string }>) {
          if (inv.emailAddress === membership.user.email) {
            await clerk.invitations.revokeInvitation(inv.id);
          }
        }
      } catch (error) {
        console.error('Best-effort Clerk invitation revoke failed:', error);
      }
    }

    logAudit({
      userId,
      orgId,
      action: 'DELETE',
      entity: 'OrgMember',
      entityId: inviteId,
      metadata: { revokedInvite: true, invitedEmail: membership.user.email },
    });
    return { data: { ok: true } };
  }

  try {
    const clerk = await clerkClient();
    await clerk.organizations.revokeOrganizationInvitation({
      organizationId: orgId,
      invitationId: inviteId,
      requestingUserId: userId,
    });
    return { data: { ok: true } };
  } catch (error) {
    console.error('Failed to revoke organisation invitation:', error);
    if (clerkErrorStatus(error) === 404) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 502 });
  }
});
