import 'server-only';

import type { OrgRole } from '@prisma/client';
import { auth, clerkClient } from '@/lib/clerk-server';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/rbac';
import { isFeatureEnabled } from '@/lib/features';
import { isPlatformAdmin } from './platform-admin';
import { resolveCommunityAccess, type CommunityAccessDecision } from './access-policy';

export { resolveCommunityAccess } from './access-policy';
export type { CommunityAccessDecision } from './access-policy';

// Versioned Community guidelines. Bump when the guidelines/moderation disclosure
// change materially; existing members must re-accept before writing.
export const COMMUNITY_GUIDELINES_VERSION = '2026-07-20';

export type CommunitySanctionState = 'none' | 'muted' | 'banned';

// An active sanction is one that has started, is not revoked, and either has no
// end (permanent) or has not yet expired. Timed mutes lapse automatically.
export function activeSanctionState(
  sanctions: Array<{ type: string; startsAt: Date; endsAt: Date | null; revokedAt: Date | null }>,
  now: Date
): CommunitySanctionState {
  let state: CommunitySanctionState = 'none';
  for (const s of sanctions) {
    if (s.revokedAt) continue;
    if (s.startsAt > now) continue;
    if (s.endsAt && s.endsAt <= now) continue;
    if (s.type === 'BAN') return 'banned';
    if (s.type === 'MUTE') state = 'muted';
  }
  return state;
}

// Verify the user still holds a Clerk membership of the given organisation, and
// return their WildTrack360 OrgMember role. Never trusts a request-supplied org.
async function verifyHomeMembership(
  userId: string,
  orgId: string
): Promise<{ isMember: boolean; role: OrgRole | null }> {
  try {
    const client = await clerkClient();
    const memberships = await client.users.getOrganizationMembershipList({ userId });
    const isMember = memberships.data.some(
      (m: { organization: { id: string } }) => m.organization.id === orgId
    );
    if (!isMember) return { isMember: false, role: null };
    const role = await getUserRole(userId, orgId);
    return { isMember: true, role };
  } catch {
    return { isMember: false, role: null };
  }
}

export interface CommunitySession {
  userId: string;
  activeOrgId: string | null;
  homeOrgId: string | null;
  role: OrgRole | null;
  // True when the caller is a bootstrapped platform Community admin (allowlist).
  // Distinct from profile.isModerator (a database-held, platform-granted role).
  isPlatformAdmin: boolean;
  access: CommunityAccessDecision;
  sanction: CommunitySanctionState;
  profile: Awaited<ReturnType<typeof loadProfile>>;
  hasAcceptedGuidelines: boolean;
}

function loadProfile(clerkUserId: string) {
  return prisma.communityProfile.findUnique({
    where: { clerkUserId },
    include: {
      sanctions: {
        where: { revokedAt: null },
        select: { type: true, startsAt: true, endsAt: true, revokedAt: true },
      },
    },
  });
}

/**
 * Resolve the caller's Community session. Re-checks membership + COMMUNITY_BOARD
 * on every call so a lost membership, disabled org or fresh sanction takes
 * effect immediately. Community identity is anchored to the profile's stored
 * home organisation and does not change when the active Clerk org changes.
 */
export async function getCommunitySession(): Promise<CommunitySession | null> {
  const { userId, orgId: activeOrgId } = await auth();
  if (!userId) return null;

  const profile = await loadProfile(userId);

  // Established members use their persisted home org; first-time visitors are
  // evaluated against their active Clerk org for onboarding eligibility.
  const homeOrgId = profile?.homeClerkOrganizationId ?? activeOrgId ?? null;

  let access: CommunityAccessDecision;
  let role: OrgRole | null = null;

  if (!homeOrgId) {
    access = resolveCommunityAccess({
      homeOrgId: null,
      isMember: false,
      betaEnabled: false,
      role: null,
    });
  } else {
    const [{ isMember, role: memberRole }, betaEnabled] = await Promise.all([
      verifyHomeMembership(userId, homeOrgId),
      isFeatureEnabled(homeOrgId, 'COMMUNITY_BOARD'),
    ]);
    role = memberRole;
    access = resolveCommunityAccess({ homeOrgId, isMember, betaEnabled, role: memberRole });
  }

  // Sanctions layer over the role/beta decision. A ban blocks reads and writes;
  // a mute blocks writes only. Enforced server-side, post-policy.
  const sanction: CommunitySanctionState = profile
    ? activeSanctionState(profile.sanctions, new Date())
    : 'none';
  const effectiveAccess: CommunityAccessDecision =
    sanction === 'banned'
      ? { ...access, canRead: false, canWrite: false, reason: 'banned' }
      : sanction === 'muted'
        ? { ...access, canWrite: false, reason: 'muted' }
        : access;

  return {
    userId,
    activeOrgId: activeOrgId ?? null,
    homeOrgId,
    role,
    isPlatformAdmin: isPlatformAdmin(userId),
    access: effectiveAccess,
    sanction,
    profile,
    hasAcceptedGuidelines:
      profile?.guidelinesVersion === COMMUNITY_GUIDELINES_VERSION &&
      Boolean(profile.guidelinesAcceptedAt),
  };
}

export function communityAccessMessage(reason: CommunityAccessDecision['reason']): string {
  switch (reason) {
    case 'beta_disabled':
      return 'Your organisation has not joined the Community beta.';
    case 'no_home_organisation':
      return 'You need an active WildTrack360 organisation to join the Community.';
    case 'not_a_member':
      return 'You are no longer a member of your home organisation.';
    case 'impersonating':
      return 'Leave organisation impersonation before opening Community.';
    case 'role_not_eligible':
      return 'Your role is not eligible for the Community beta.';
    case 'muted':
      return 'Your Community account is muted. You can read but not post right now.';
    case 'banned':
      return 'Your Community account has been suspended.';
    default:
      return 'Community is not available for this account.';
  }
}
