// Issue #56 Phase 0: snapshot Clerk organisation data (orgs, memberships,
// users) to a JSON file for backfill input and post-migration audit. Run this
// BEFORE flipping ORG_SOURCE=db and again before disabling Clerk Organizations.
//
// Usage:
//   npx tsx scripts/snapshot-clerk-orgs.ts [--out clerk-snapshot.json]
//
// Requires CLERK_SECRET_KEY.

import { writeFileSync } from 'node:fs';
import { createClerkClient } from '@clerk/backend';

interface SnapshotOrganisation {
  id: string;
  name: string;
  slug: string | null;
  orgUrl: string | null;
  jurisdiction: string | null;
  imageUrl: string | null;
  memberships: Array<{
    userId: string;
    role: string;
    firstName: string | null;
    lastName: string | null;
    identifier: string | null;
    imageUrl: string | null;
  }>;
}

interface SnapshotUser {
  id: string;
  email: string | null;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
}

async function main() {
  const outIndex = process.argv.indexOf('--out');
  const outFile = outIndex >= 0 ? process.argv[outIndex + 1] : 'clerk-snapshot.json';

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

  const organisations: SnapshotOrganisation[] = [];
  const users = new Map<string, SnapshotUser>();

  let orgOffset = 0;
  const pageSize = 100;
  while (true) {
    const orgPage = await clerk.organizations.getOrganizationList({
      limit: pageSize,
      offset: orgOffset,
      includeMembersCount: true,
    });
    for (const org of orgPage.data) {
      const meta = (org.publicMetadata ?? {}) as Record<string, unknown>;
      const snapshot: SnapshotOrganisation = {
        id: org.id,
        name: org.name,
        slug: org.slug ?? null,
        orgUrl: typeof meta.org_url === 'string' ? meta.org_url : null,
        jurisdiction: typeof meta.jurisdiction === 'string' ? meta.jurisdiction : null,
        imageUrl: org.imageUrl ?? null,
        memberships: [],
      };

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
          snapshot.memberships.push({
            userId: data.userId,
            role: membership.role,
            firstName: data.firstName ?? null,
            lastName: data.lastName ?? null,
            identifier: data.identifier ?? null,
            imageUrl: data.imageUrl ?? null,
          });
          if (!users.has(data.userId)) {
            try {
              const user = await clerk.users.getUser(data.userId);
              const primary =
                user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ??
                user.emailAddresses[0];
              users.set(data.userId, {
                id: user.id,
                email: primary?.emailAddress ?? null,
                emailVerified: primary?.verification?.status === 'verified',
                firstName: user.firstName ?? null,
                lastName: user.lastName ?? null,
                imageUrl: user.imageUrl ?? null,
              });
            } catch {
              users.set(data.userId, {
                id: data.userId,
                email: data.identifier ?? null,
                emailVerified: false,
                firstName: data.firstName ?? null,
                lastName: data.lastName ?? null,
                imageUrl: data.imageUrl ?? null,
              });
            }
          }
        }
        if (members.data.length < pageSize) break;
        memberOffset += pageSize;
      }

      organisations.push(snapshot);
      console.log(`Snapshotted ${org.id} (${org.name}) — ${snapshot.memberships.length} members`);
    }
    if (orgPage.data.length < pageSize) break;
    orgOffset += pageSize;
  }

  const payload = {
    takenAt: new Date().toISOString(),
    organisations,
    users: [...users.values()],
  };
  writeFileSync(outFile, JSON.stringify(payload, null, 2));
  console.log(
    `\nWrote ${organisations.length} organisations and ${users.size} users to ${outFile}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
