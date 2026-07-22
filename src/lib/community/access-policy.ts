import type { OrgRole } from '@prisma/client';

// Every active WildTrack360 workspace role is eligible to read and write in the
// Community beta when their home organisation has COMMUNITY_BOARD enabled and
// they have accepted the current guidelines. Portal/public accounts are never
// eligible (they never reach this resolver — they have no OrgMember role).
const CONTRIBUTOR_ROLES = new Set<OrgRole>([
  'ADMIN',
  'COORDINATOR_ALL',
  'COORDINATOR',
  'CARER_ALL',
  'CARER',
]);

export interface CommunityAccessDecision {
  enabled: boolean;
  canRead: boolean;
  canWrite: boolean;
  reason:
    | 'enabled'
    | 'no_home_organisation'
    | 'beta_disabled'
    | 'not_a_member'
    | 'role_not_eligible'
    | 'impersonating'
    // Applied post-policy in access.ts from active sanctions, not here.
    | 'muted'
    | 'banned';
}

/**
 * Pure access policy. Identity has already been resolved server-side:
 *   - homeOrgId: the verified home organisation (from CommunityProfile, or the
 *     active Clerk org during onboarding). Never taken from a request body.
 *   - isMember: whether the user still holds a Clerk membership of homeOrgId.
 *   - betaEnabled: whether COMMUNITY_BOARD is on for homeOrgId.
 *   - role: the user's OrgMember role in homeOrgId (null if none).
 */
export function resolveCommunityAccess(input: {
  homeOrgId: string | null;
  isMember: boolean;
  betaEnabled: boolean;
  role: OrgRole | null;
  isImpersonating?: boolean;
}): CommunityAccessDecision {
  if (!input.homeOrgId) {
    return { enabled: false, canRead: false, canWrite: false, reason: 'no_home_organisation' };
  }
  if (!input.betaEnabled) {
    return { enabled: false, canRead: false, canWrite: false, reason: 'beta_disabled' };
  }
  // Losing the home-org membership (removed from the org) revokes access even
  // though Community history is preserved.
  if (!input.isMember) {
    return { enabled: true, canRead: false, canWrite: false, reason: 'not_a_member' };
  }
  // Impersonation/platform-viewer sessions are denied Community participation.
  if (input.isImpersonating) {
    return { enabled: true, canRead: false, canWrite: false, reason: 'impersonating' };
  }
  if (input.role && CONTRIBUTOR_ROLES.has(input.role)) {
    return { enabled: true, canRead: true, canWrite: true, reason: 'enabled' };
  }
  return { enabled: true, canRead: false, canWrite: false, reason: 'role_not_eligible' };
}
