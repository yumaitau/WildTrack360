// Backfills Member records from existing CarerProfile rows. For wildlife orgs
// that opt in, every active CarerProfile becomes a linked Member so the same
// person can use the member portal, receive receipts, and pay membership fees
// without admins re-entering their contact details.
//
// Usage:
//   npx tsx scripts/backfill-carer-members.ts --org <clerkOrganizationId>           # dry-run
//   npx tsx scripts/backfill-carer-members.ts --org <clerkOrganizationId> --apply   # write
//
// The script:
//   1. Lists CarerProfile rows in the org with active=true and no linked Member.
//   2. Fetches each carer's Clerk user (email + name).
//   3. If a Member already exists for that email (case-insensitive), links it
//      by setting Member.carerProfileId.
//   4. Otherwise creates a new Member with status=ACTIVE, joinedAt=carer.createdAt,
//      and the same clerkUserId so the portal claim is automatic on first sign-in.
//
// Dry-run prints what would happen but writes nothing. Re-running is safe —
// linked carers are skipped via the @unique constraint on Member.carerProfileId.

import { PrismaClient } from '@prisma/client';
import { createClerkClient } from '@clerk/backend';

interface Args {
  orgId: string;
  apply: boolean;
}

function parseArgs(argv: string[]): Args {
  let orgId: string | undefined;
  let apply = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--org') orgId = argv[++i];
    else if (arg === '--apply') apply = true;
  }
  if (!orgId) {
    throw new Error('Missing --org <clerkOrganizationId>');
  }
  return { orgId, apply };
}

interface ClerkUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

async function fetchClerkUser(
  clerk: ReturnType<typeof createClerkClient>,
  userId: string
): Promise<ClerkUser | null> {
  try {
    const user = await clerk.users.getUser(userId);
    return {
      id: user.id,
      email: user.emailAddresses?.[0]?.emailAddress ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
    };
  } catch (err) {
    console.warn(`  ⚠️  Failed to fetch Clerk user ${userId}: ${(err as Error).message}`);
    return null;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) throw new Error('CLERK_SECRET_KEY env var is required');
  const clerk = createClerkClient({ secretKey: secret });

  console.log(`Mode: ${args.apply ? 'APPLY' : 'DRY-RUN'} · Org: ${args.orgId}`);

  const carers = await prisma.carerProfile.findMany({
    where: {
      clerkOrganizationId: args.orgId,
      active: true,
      linkedMember: null,
    },
  });

  console.log(`Found ${carers.length} active CarerProfile rows with no linked Member.\n`);

  let linked = 0;
  let created = 0;
  let skipped = 0;

  for (const carer of carers) {
    const user = await fetchClerkUser(clerk, carer.id);
    if (!user || !user.email) {
      console.log(`  ⏭  Skip ${carer.id} — no Clerk email`);
      skipped++;
      continue;
    }

    const existing = await prisma.member.findFirst({
      where: {
        clerkOrganizationId: args.orgId,
        email: { equals: user.email, mode: 'insensitive' },
      },
    });

    if (existing) {
      if (existing.carerProfileId === carer.id) {
        skipped++;
        continue;
      }
      console.log(`  🔗 Link Member ${existing.id} → CarerProfile ${carer.id} (${user.email})`);
      if (args.apply) {
        await prisma.member.update({
          where: { id: existing.id },
          data: { carerProfileId: carer.id },
        });
      }
      linked++;
    } else {
      console.log(`  ＋ Create Member for ${user.email} (carer ${carer.id})`);
      if (args.apply) {
        await prisma.member.create({
          data: {
            clerkOrganizationId: args.orgId,
            clerkUserId: carer.id,
            carerProfileId: carer.id,
            email: user.email,
            firstName: user.firstName ?? '(unknown)',
            lastName: user.lastName ?? '',
            joinedAt: carer.createdAt,
            status: 'ACTIVE',
          },
        });
      }
      created++;
    }
  }

  console.log('\nSummary:');
  console.log(`  Created: ${created}`);
  console.log(`  Linked:  ${linked}`);
  console.log(`  Skipped: ${skipped}`);
  if (!args.apply) {
    console.log('\nNo changes written. Re-run with --apply to commit.');
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
