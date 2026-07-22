import { test } from 'vitest';
import assert from 'node:assert/strict';
import type { OrgRole } from '@prisma/client';
import { resolveCommunityAccess } from '@/lib/community/access-policy';

// Locks in the WildTrack360 identity adaptation of the RangerOS access policy:
// eligibility is decided from a verified home org, live Clerk membership, the
// COMMUNITY_BOARD flag and the OrgMember role — never a request-supplied org.

const ENABLED = { homeOrgId: 'org_1', isMember: true, betaEnabled: true } as const;
const ALL_ROLES: OrgRole[] = ['ADMIN', 'COORDINATOR_ALL', 'COORDINATOR', 'CARER_ALL', 'CARER'];

test('every active workspace role may read and write when enabled', () => {
  for (const role of ALL_ROLES) {
    const d = resolveCommunityAccess({ ...ENABLED, role });
    assert.equal(d.canRead, true, role);
    assert.equal(d.canWrite, true, role);
    assert.equal(d.reason, 'enabled', role);
  }
});

test('no home organisation denies everything', () => {
  const d = resolveCommunityAccess({
    homeOrgId: null,
    isMember: false,
    betaEnabled: false,
    role: null,
  });
  assert.equal(d.canRead, false);
  assert.equal(d.canWrite, false);
  assert.equal(d.reason, 'no_home_organisation');
});

test('a disabled home org is not readable (feature cannot be probed)', () => {
  const d = resolveCommunityAccess({
    homeOrgId: 'org_1',
    isMember: true,
    betaEnabled: false,
    role: 'ADMIN',
  });
  assert.equal(d.canRead, false);
  assert.equal(d.reason, 'beta_disabled');
});

test('losing home-org membership revokes access even while enabled', () => {
  const d = resolveCommunityAccess({ ...ENABLED, isMember: false, role: 'CARER' });
  assert.equal(d.canRead, false);
  assert.equal(d.canWrite, false);
  assert.equal(d.reason, 'not_a_member');
});

test('impersonation/platform-viewer sessions are denied participation', () => {
  const d = resolveCommunityAccess({ ...ENABLED, role: 'ADMIN', isImpersonating: true });
  assert.equal(d.canRead, false);
  assert.equal(d.canWrite, false);
  assert.equal(d.reason, 'impersonating');
});

test('a member with no OrgMember role is not eligible', () => {
  const d = resolveCommunityAccess({ ...ENABLED, role: null });
  assert.equal(d.canRead, false);
  assert.equal(d.canWrite, false);
  assert.equal(d.reason, 'role_not_eligible');
});
