import { isScreenshotMode } from '@/lib/screenshot-mode';

// Issue #56: which system is authoritative for an organisation's identity,
// membership, and metadata.
//
// The cutover is controlled per organisation by the DB_ORG_SOURCE feature
// flag, toggled from the WildTrack360-Admin app (OrgFeatureFlag table), so
// orgs migrate off Clerk Organizations one at a time:
//
//   flag off (default) — legacy behaviour: Clerk Organizations resolve the
//                        tenant (auth().orgId, membership lists, metadata).
//   flag on            — Postgres is authoritative: the tenant resolves from
//                        the request subdomain → Organisation.slug →
//                        OrgMember, and rosters/metadata read from the
//                        organisations/users tables. Requires the org to be
//                        backfilled (scripts/backfill-orgs-from-clerk.ts).
//
// Two overrides sit on top of the flag:
//   - ORG_SOURCE=db     env var forces db mode globally (final state / the
//                       original deployment-wide kill switch).
//   - "worg_" org ids   are DB-native (created post-Clerk by orgs:create) and
//                       are always db-sourced — they have no Clerk counterpart.
//
// Rollback for a flagged org is turning its flag off in the admin panel.
export type OrgSource = 'clerk' | 'db';

/** Deployment-wide source override from the ORG_SOURCE env var. */
export function orgSource(): OrgSource {
  // Screenshot/demo mode fakes the Clerk client, so it always follows the
  // legacy clerk path regardless of the env flag.
  if (isScreenshotMode()) return 'clerk';
  return process.env.ORG_SOURCE === 'db' ? 'db' : 'clerk';
}

export function isDbOrgSource(): boolean {
  return orgSource() === 'db';
}

/** DB-native organisation id (created by orgs:create, no Clerk counterpart). */
export function isDbNativeOrgId(orgId: string | null | undefined): boolean {
  return typeof orgId === 'string' && orgId.startsWith('worg_');
}

/**
 * Whether THIS organisation is database-managed: the global env override, a
 * DB-native id, or the DB_ORG_SOURCE feature flag set from the admin panel.
 *
 * The flag lookup is fail-closed to clerk mode: if the flag table can't be
 * read the org behaves legacy, which is always the safe direction during the
 * migration window.
 */
export async function isDbOrg(orgId: string | null | undefined): Promise<boolean> {
  if (isScreenshotMode()) return false;
  if (process.env.ORG_SOURCE === 'db') return true;
  if (!orgId) return false;
  if (isDbNativeOrgId(orgId)) return true;
  try {
    const { isFeatureEnabled } = await import('./features');
    return await isFeatureEnabled(orgId, 'DB_ORG_SOURCE');
  } catch (error) {
    console.error(`org-source: DB_ORG_SOURCE flag lookup failed for ${orgId}:`, error);
    return false;
  }
}

export async function orgSourceForOrg(orgId: string | null | undefined): Promise<OrgSource> {
  return (await isDbOrg(orgId)) ? 'db' : 'clerk';
}
