import 'server-only';

import { NextResponse } from 'next/server';
import { requireCommunitySession } from './api';

// A community moderator is a platform-wide role (CommunityProfile.isModerator)
// or a bootstrapped platform admin acting under their real identity.
// Organisation ADMIN does NOT grant community moderation — that boundary is
// deliberate.
export async function requireCommunityModerator() {
  const auth = await requireCommunitySession({ profile: true });
  if ('error' in auth) return auth;
  if (!auth.session.profile!.isModerator && !auth.session.isPlatformAdmin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return auth;
}

// Staff-admin actions that must never be delegated to a per-org moderator:
// granting/revoking moderators and triaging beta feedback. Platform admin only.
export async function requireCommunityStaffAdmin() {
  const auth = await requireCommunitySession({ profile: true });
  if ('error' in auth) return auth;
  if (!auth.session.isPlatformAdmin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return auth;
}
