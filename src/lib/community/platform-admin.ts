import 'server-only';

// Platform Community administration is deliberately decoupled from any
// organisation role: an organisation ADMIN is NOT a product-wide Community
// moderator or platform administrator. Platform admins are bootstrapped from a
// server-only allowlist of Clerk user IDs (COMMUNITY_PLATFORM_ADMIN_IDS,
// comma-separated). Platform admins may grant/revoke the audited, database-held
// `CommunityProfile.isModerator` flag and may sanction moderators/admins.
//
// This mirrors RangerOS's SUPERADMIN gate without inferring trust from a tenant
// role. Keep the allowlist small; hosted rollout manages it out of band.
export function platformAdminIds(): Set<string> {
  const raw = process.env.COMMUNITY_PLATFORM_ADMIN_IDS ?? '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export function isPlatformAdmin(clerkUserId: string): boolean {
  return platformAdminIds().has(clerkUserId);
}
