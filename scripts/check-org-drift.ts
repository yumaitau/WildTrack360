// Issue #56 Phase 1 exit gate: compare the DB organisation mirror against
// Clerk and report drift. Run on cron/CI from backfill until Phase 3
// completes; a clean run for several days is the signal to flip ORG_SOURCE=db.
//
// Checks:
//   - every Clerk org has an Organisation row with matching name/slug/jurisdiction
//   - every Clerk membership has an OrgMember row (role is NOT compared —
//     the DB role is authoritative and intentionally diverges from Clerk's)
//   - every non-pending OrgMember row still exists in Clerk
//
// Exits 1 when drift is found (cron/CI friendly).
//
// Usage: npx tsx scripts/check-org-drift.ts

import { PrismaClient } from '@prisma/client';
import { createClerkClient } from '@clerk/backend';

const prisma = new PrismaClient();
const pageSize = 100;

async function main() {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const drift: string[] = [];

  const clerkMembershipKeys = new Set<string>();
  const clerkOrgIds = new Set<string>();

  let orgOffset = 0;
  while (true) {
    const orgPage = await clerk.organizations.getOrganizationList({
      limit: pageSize,
      offset: orgOffset,
    });

    for (const org of orgPage.data) {
      clerkOrgIds.add(org.id);
      const meta = (org.publicMetadata ?? {}) as Record<string, unknown>;
      const orgUrl = typeof meta.org_url === 'string' && meta.org_url.trim() ? meta.org_url.trim() : null;
      const jurisdiction = typeof meta.jurisdiction === 'string' ? meta.jurisdiction : null;
      const expectedSlug = orgUrl ?? org.id;

      const dbOrg = await prisma.organisation.findUnique({ where: { id: org.id } });
      if (!dbOrg) {
        drift.push(`organisation ${org.id} (${org.name}) missing from DB`);
      } else {
        if (dbOrg.name !== org.name)
          drift.push(`organisation ${org.id}: name "${dbOrg.name}" != Clerk "${org.name}"`);
        if (dbOrg.slug !== expectedSlug)
          drift.push(`organisation ${org.id}: slug "${dbOrg.slug}" != Clerk "${expectedSlug}"`);
        if ((dbOrg.jurisdiction ?? null) !== jurisdiction)
          drift.push(
            `organisation ${org.id}: jurisdiction "${dbOrg.jurisdiction}" != Clerk "${jurisdiction}"`
          );
      }

      let memberOffset = 0;
      while (true) {
        const members = await clerk.organizations.getOrganizationMembershipList({
          organizationId: org.id,
          limit: pageSize,
          offset: memberOffset,
        });
        for (const membership of members.data) {
          const userId = membership.publicUserData?.userId;
          if (!userId) continue;
          clerkMembershipKeys.add(`${userId}::${org.id}`);
          const dbMember = await prisma.orgMember.findUnique({
            where: { userId_orgId: { userId, orgId: org.id } },
            select: { id: true },
          });
          if (!dbMember) drift.push(`membership ${userId} @ ${org.id} missing from DB`);
        }
        if (members.data.length < pageSize) break;
        memberOffset += pageSize;
      }
    }

    if (orgPage.data.length < pageSize) break;
    orgOffset += pageSize;
  }

  // Reverse direction: DB rows Clerk doesn't have. Pending invite placeholders
  // and post-Clerk orgs (worg_) are DB-native and expected to be absent.
  const dbMembers = await prisma.orgMember.findMany({ select: { userId: true, orgId: true } });
  for (const member of dbMembers) {
    if (member.userId.startsWith('pending_')) continue;
    if (member.orgId.startsWith('worg_')) continue;
    if (!clerkOrgIds.has(member.orgId)) {
      drift.push(`DB membership ${member.userId} @ ${member.orgId}: org gone from Clerk`);
      continue;
    }
    if (!clerkMembershipKeys.has(`${member.userId}::${member.orgId}`)) {
      drift.push(`DB membership ${member.userId} @ ${member.orgId}: gone from Clerk`);
    }
  }

  if (drift.length) {
    console.error(`DRIFT DETECTED (${drift.length} issue${drift.length === 1 ? '' : 's'}):`);
    for (const line of drift) console.error(`  - ${line}`);
    process.exit(1);
  }
  console.log('No drift: Clerk and DB organisation data match.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
