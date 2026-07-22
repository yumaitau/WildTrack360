import { isScreenshotMode } from '@/lib/screenshot-mode';

// Issue #56 kill switch: which system is authoritative for organisation
// identity, membership, and metadata.
//
//   clerk (default) — legacy behaviour: Clerk Organizations resolve the
//                     tenant (auth().orgId, membership lists, org metadata).
//   db              — Postgres is authoritative: the tenant resolves from the
//                     request subdomain → Organisation.slug → OrgMember, and
//                     rosters/metadata read from the organisations/users
//                     tables. Requires scripts/backfill-orgs-from-clerk.ts to
//                     have run first.
//
// Rollback at any point before Clerk org data is deleted is a flag flip.
export type OrgSource = 'clerk' | 'db';

export function orgSource(): OrgSource {
  // Screenshot/demo mode fakes the Clerk client, so it always follows the
  // legacy clerk path regardless of the env flag.
  if (isScreenshotMode()) return 'clerk';
  return process.env.ORG_SOURCE === 'db' ? 'db' : 'clerk';
}

export function isDbOrgSource(): boolean {
  return orgSource() === 'db';
}
