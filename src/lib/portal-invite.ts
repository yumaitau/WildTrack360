'server-only';

import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from './prisma';
import { tenantBaseUrl } from './tenant-url';

export type InviteReason = 'already-active' | 'payment-required' | 'not-found' | 'error';
export interface InviteResult {
  sent: boolean;
  reason?: InviteReason;
}

// Provision a member's portal login via an application-level Clerk invitation —
// they become a Clerk user (NOT an org member). Two guards:
//   1. Anti-spam / members-only: only invite a member who has a SUCCEEDED
//      MEMBERSHIP payment. Donors never get a portal invite, and no Clerk
//      account is ever created without a paid membership.
//   2. Skip if already activated (clerkUserId set).
// On success the Clerk invitation id is stored on the org-scoped Member row so
// the org can track invite status and manage/revoke the Clerk account. Never
// throws, so a failed invite can't void a completed payment.
export async function invitePortalMember(memberId: string, orgId: string): Promise<InviteResult> {
  const member = await prisma.member.findFirst({
    where: { id: memberId, clerkOrganizationId: orgId, archivedAt: null },
    select: { id: true, email: true, clerkUserId: true },
  });
  if (!member) return { sent: false, reason: 'not-found' };
  if (member.clerkUserId) return { sent: false, reason: 'already-active' };

  const paidMembership = await prisma.payment.findFirst({
    where: {
      memberId: member.id,
      status: 'SUCCEEDED',
      kind: { in: ['MEMBERSHIP_ONE_OFF', 'MEMBERSHIP_RECURRING'] },
    },
    select: { id: true },
  });
  if (!paidMembership) return { sent: false, reason: 'payment-required' };

  try {
    const clerk = await clerkClient();
    const base = await tenantBaseUrl(orgId, clerk);
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: member.email,
      redirectUrl: `${base}/portal/sign-up`,
      ignoreExisting: true,
      notify: true,
    });
    await prisma.member.update({
      where: { id: member.id },
      data: { clerkInvitationId: invitation.id, portalInvitedAt: new Date() },
    });
    return { sent: true };
  } catch (error) {
    // Already a Clerk user, or invitations disabled — non-fatal.
    console.error('Failed to send portal invitation:', error);
    return { sent: false, reason: 'error' };
  }
}
