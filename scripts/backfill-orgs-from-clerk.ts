// Issue #56 Phase 1: backfill the organisations / users / org_members tables
// from Clerk. Idempotent and re-runnable — safe to run repeatedly while Clerk
// is still authoritative (ORG_SOURCE=clerk).
//
//   - Each Clerk org upserts an Organisation (id, name, slug ← publicMetadata
//     .org_url, jurisdiction ← publicMetadata.jurisdiction). Also mirrors the
//     slug into OrganisationSettings.orgUrl (kept in sync during transition).
//   - Each membership upserts a User (from Clerk) and an OrgMember —
//     PRESERVING an existing OrgMember.role. Where no row exists: Clerk
//     org:admin → ADMIN, anything else → CARER (matches getUserRole default).
//   - Reports orphans: DB org_members rows whose org/user no longer exists in
//     Clerk (never deleted automatically).
//
// Usage:
//   npx tsx scripts/backfill-orgs-from-clerk.ts            # dry-run
//   npx tsx scripts/backfill-orgs-from-clerk.ts --apply    # write
//
// Requires CLERK_SECRET_KEY and DATABASE_URL.

import { PrismaClient } from '@prisma/client';
import { createClerkClient } from '@clerk/backend';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');
const pageSize = 100;

function log(message: string) {
  console.log(`${apply ? '' : '[dry-run] '}${message}`);
}

async function main() {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

  const clerkOrgIds = new Set<string>();
  const clerkUserIds = new Set<string>();
  let orgCount = 0;
  let memberCount = 0;

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
      // Placeholder slug = org id (unique, never a real subdomain) until the
      // org has org_url metadata.
      const slug = orgUrl ?? org.id;

      log(`org ${org.id}: name="${org.name}" slug=${slug} jurisdiction=${jurisdiction ?? '-'}`);
      if (apply) {
        await prisma.organisation.upsert({
          where: { id: org.id },
          create: {
            id: org.id,
            name: org.name,
            slug,
            jurisdiction,
            logoUrl: org.imageUrl ?? null,
          },
          update: {
            name: org.name,
            slug,
            jurisdiction,
            logoUrl: org.imageUrl ?? null,
          },
        });
        if (orgUrl) {
          // Keep the legacy public routing mirror in sync during transition.
          await prisma.organisationSettings
            .upsert({
              where: { clerkOrganisationId: org.id },
              create: { clerkOrganisationId: org.id, orgUrl },
              update: { orgUrl },
            })
            .catch((error) =>
              console.error(`  ! could not sync OrganisationSettings.orgUrl for ${org.id}:`, error)
            );
        }
      }
      orgCount += 1;

      let memberOffset = 0;
      while (true) {
        const members = await clerk.organizations.getOrganizationMembershipList({
          organizationId: org.id,
          limit: pageSize,
          offset: memberOffset,
        });

        for (const membership of members.data) {
          const data = membership.publicUserData;
          if (!data?.userId) continue;
          clerkUserIds.add(data.userId);

          const existingMember = await prisma.orgMember.findUnique({
            where: { userId_orgId: { userId: data.userId, orgId: org.id } },
            select: { role: true },
          });
          const newRole = membership.role === 'org:admin' ? 'ADMIN' : 'CARER';
          const finalRole = existingMember?.role ?? newRole;

          log(
            `  member ${data.userId} (${data.identifier ?? 'no email'}): ` +
              (existingMember ? `keeping role ${existingMember.role}` : `new role ${newRole}`)
          );

          if (apply) {
            // Email/name enrichment comes from the users API to get verified
            // status; publicUserData.identifier is a fallback only.
            let email: string | null = data.identifier ?? null;
            let firstName = data.firstName ?? null;
            let lastName = data.lastName ?? null;
            let imageUrl = data.imageUrl ?? null;
            try {
              const user = await clerk.users.getUser(data.userId);
              const primary =
                user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ??
                user.emailAddresses[0];
              email = primary?.emailAddress ?? email;
              firstName = user.firstName ?? firstName;
              lastName = user.lastName ?? lastName;
              imageUrl = user.imageUrl ?? imageUrl;
            } catch {
              // keep publicUserData values
            }

            await prisma.user.upsert({
              where: { id: data.userId },
              create: { id: data.userId, firstName, lastName, imageUrl },
              update: { firstName, lastName, imageUrl, isActive: true },
            });
            if (email) {
              await prisma.user
                .update({ where: { id: data.userId }, data: { email } })
                .catch(() => console.error(`  ! email conflict for ${data.userId} (${email})`));
            }

            await prisma.orgMember.upsert({
              where: { userId_orgId: { userId: data.userId, orgId: org.id } },
              create: { userId: data.userId, orgId: org.id, role: finalRole },
              update: {}, // preserve existing role
            });
          }
          memberCount += 1;
        }

        if (members.data.length < pageSize) break;
        memberOffset += pageSize;
      }
    }

    if (orgPage.data.length < pageSize) break;
    orgOffset += pageSize;
  }

  // Orphan report: DB rows Clerk no longer knows about.
  const dbMembers = await prisma.orgMember.findMany({
    select: { userId: true, orgId: true },
  });
  const orphanOrgRows = dbMembers.filter(
    (m) => !clerkOrgIds.has(m.orgId) && !m.orgId.startsWith('worg_')
  );
  const orphanUserRows = dbMembers.filter(
    (m) => !clerkUserIds.has(m.userId) && !m.userId.startsWith('pending_')
  );

  console.log('\n─── Summary ───');
  console.log(`Organisations processed: ${orgCount}`);
  console.log(`Memberships processed:   ${memberCount}`);
  console.log(`Orphan rows (org gone from Clerk):  ${orphanOrgRows.length}`);
  for (const row of orphanOrgRows) console.log(`  org=${row.orgId} user=${row.userId}`);
  console.log(`Orphan rows (user gone from Clerk): ${orphanUserRows.length}`);
  for (const row of orphanUserRows) console.log(`  org=${row.orgId} user=${row.userId}`);
  if (!apply) console.log('\nDry-run only. Re-run with --apply to write.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
