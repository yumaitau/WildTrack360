// Issue #56 Phase 3: create a DB-native organisation (post-Clerk-Organizations).
// Replaces the Clerk Dashboard / WildTrack360-Admin "create Clerk org" step:
// orgs are now Postgres rows with a "worg_" id prefix so provenance is obvious.
//
// Creates:
//   - Organisation (id worg_<uuid>, name, slug, jurisdiction)
//   - OrganisationSettings (orgUrl mirror of the slug for public donate/join)
//   - optionally a pending ADMIN invite (pending User + OrgMember + Clerk
//     application-level invitation email)
//
// Usage:
//   npx tsx scripts/create-organisation.ts --name "Rescue Org" --slug rescue \
//     [--jurisdiction NSW] [--admin-email admin@example.org] [--apply]
//
// Requires DATABASE_URL; CLERK_SECRET_KEY only when --admin-email is given.

import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { createClerkClient } from '@clerk/backend';

const prisma = new PrismaClient();

interface Args {
  name: string;
  slug: string;
  jurisdiction: string | null;
  adminEmail: string | null;
  apply: boolean;
}

function parseArgs(argv: string[]): Args {
  let name: string | undefined;
  let slug: string | undefined;
  let jurisdiction: string | null = null;
  let adminEmail: string | null = null;
  let apply = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--name') name = argv[++i];
    else if (arg === '--slug') slug = argv[++i];
    else if (arg === '--jurisdiction') jurisdiction = argv[++i];
    else if (arg === '--admin-email') adminEmail = argv[++i];
    else if (arg === '--apply') apply = true;
  }
  if (!name) throw new Error('Missing --name');
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    throw new Error('Missing or invalid --slug (lowercase letters, digits, hyphens)');
  }
  return { name, slug, jurisdiction, adminEmail, apply };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prefix = args.apply ? '' : '[dry-run] ';

  const slugTaken = await prisma.organisation.findUnique({ where: { slug: args.slug } });
  if (slugTaken) throw new Error(`Slug "${args.slug}" is already used by ${slugTaken.id}`);

  const orgId = `worg_${randomUUID().replace(/-/g, '')}`;
  console.log(`${prefix}create Organisation ${orgId}: name="${args.name}" slug=${args.slug} jurisdiction=${args.jurisdiction ?? '-'}`);

  if (args.apply) {
    await prisma.organisation.create({
      data: {
        id: orgId,
        name: args.name,
        slug: args.slug,
        jurisdiction: args.jurisdiction,
      },
    });
    await prisma.organisationSettings.create({
      data: { clerkOrganisationId: orgId, orgUrl: args.slug },
    });
  }

  if (args.adminEmail) {
    const pendingUserId = `pending_${randomUUID()}`;
    console.log(`${prefix}invite initial ADMIN ${args.adminEmail} (pending user ${pendingUserId})`);
    if (args.apply) {
      await prisma.user.create({
        data: { id: pendingUserId, email: args.adminEmail, invitedAt: new Date() },
      });
      await prisma.orgMember.create({
        data: { userId: pendingUserId, orgId, role: 'ADMIN' },
      });

      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';
      const protocol = rootDomain.startsWith('localhost') ? 'http' : 'https';
      const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
      await clerk.invitations.createInvitation({
        emailAddress: args.adminEmail,
        redirectUrl: `${protocol}://${args.slug}.${rootDomain}/sign-up`,
        ignoreExisting: true,
        notify: true,
        publicMetadata: { wildtrack_org_id: orgId, wildtrack_role: 'ADMIN' },
      });
    }
  }

  if (!args.apply) console.log('\nDry-run only. Re-run with --apply to write.');
  else console.log(`\nDone. Organisation ${orgId} is live at ${args.slug}.<root-domain>.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
