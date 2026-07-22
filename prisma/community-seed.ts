import { PrismaClient } from '@prisma/client';

// Idempotent seed for the Community beta's configurable categories and
// staff-managed chat rooms. Categories/rooms are DATA (platform moderators can
// create/edit/order/activate/archive them), so this seed only establishes the
// approved starter set for a fresh install or self-hoster. Safe to re-run:
// every row is upserted by its unique slug and existing edits to name/order are
// preserved on re-run (update: {}).
//
// Run with: pnpm db:seed:community

const prisma = new PrismaClient();

const CATEGORIES: Array<{ slug: string; name: string; description: string }> = [
  {
    slug: 'general-wildlife-community',
    name: 'General wildlife community',
    description:
      'Introductions, general discussion and anything that does not fit another category.',
  },
  {
    slug: 'rescue-triage-transport',
    name: 'Rescue, triage and transport',
    description: 'Rescue technique, initial triage decisions and safe transport of wildlife.',
  },
  {
    slug: 'rehabilitation-husbandry',
    name: 'Rehabilitation and husbandry',
    description: 'Day-to-day rehabilitation, housing and husbandry practice.',
  },
  {
    slug: 'species-care-behaviour',
    name: 'Species care and behaviour',
    description: 'Species-specific care, natural behaviour and enrichment.',
  },
  {
    slug: 'veterinary-clinical-care',
    name: 'Veterinary, medication and clinical care',
    description: 'General clinical care discussion. Not a substitute for veterinary advice.',
  },
  {
    slug: 'feeding-nutrition',
    name: 'Feeding and nutrition',
    description: 'Diets, feeding schedules, formulas and nutrition.',
  },
  {
    slug: 'release-post-release-monitoring',
    name: 'Release and post-release monitoring',
    description: 'Release readiness, soft/hard release and post-release monitoring.',
  },
  {
    slug: 'biosecurity-hygiene-safety-wellbeing',
    name: 'Biosecurity, hygiene, carer safety and wellbeing',
    description: 'Biosecurity, hygiene protocols, carer safety and wellbeing.',
  },
  {
    slug: 'equipment-facilities-technology',
    name: 'Equipment, facilities and field technology',
    description: 'Enclosures, equipment, facilities and useful field technology.',
  },
  {
    slug: 'training-volunteering-operations',
    name: 'Training, volunteering and organisation operations',
    description: 'Training pathways, volunteering and running a wildlife organisation.',
  },
  {
    slug: 'compliance-regulator-reporting',
    name: 'Compliance and regulator reporting',
    description: 'Licensing, compliance and regulator reporting questions.',
  },
  {
    slug: 'wildtrack360-help-beta-feedback',
    name: 'WildTrack360 help and beta feedback',
    description: 'Help using WildTrack360 and feedback on the Community beta.',
  },
];

const ROOMS: Array<{ slug: string; name: string; description: string; categorySlug?: string }> = [
  {
    slug: 'community-campfire',
    name: 'Community campfire',
    description: 'Casual chat for the whole community.',
    categorySlug: 'general-wildlife-community',
  },
  {
    slug: 'ask-carers-coordinators',
    name: 'Ask other carers and coordinators',
    description: 'Quick questions for other carers and coordinators.',
  },
  {
    slug: 'rescue-triage-transport-room',
    name: 'Rescue, triage and transport',
    description: 'Live discussion on rescue, triage and transport.',
    categorySlug: 'rescue-triage-transport',
  },
  {
    slug: 'rehabilitation-release',
    name: 'Rehabilitation and release',
    description: 'Rehabilitation and release chat.',
    categorySlug: 'rehabilitation-husbandry',
  },
  {
    slug: 'wildtrack360-beta-feedback',
    name: 'WildTrack360 beta feedback',
    description: 'Tell us what is working and what is not.',
    categorySlug: 'wildtrack360-help-beta-feedback',
  },
];

async function main() {
  console.log('🌱 Seeding Community categories…');
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    await prisma.communityCategory.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        sortOrder: i,
        isActive: true,
      },
      update: {},
    });
  }

  console.log('🌱 Seeding Community chat rooms…');
  const categoryBySlug = new Map(
    (await prisma.communityCategory.findMany({ select: { id: true, slug: true } })).map((c) => [
      c.slug,
      c.id,
    ])
  );
  for (const r of ROOMS) {
    await prisma.communityChatRoom.upsert({
      where: { slug: r.slug },
      create: {
        slug: r.slug,
        name: r.name,
        description: r.description,
        categoryId: r.categorySlug ? (categoryBySlug.get(r.categorySlug) ?? null) : null,
      },
      update: {},
    });
  }

  console.log(`✅ Seeded ${CATEGORIES.length} categories and ${ROOMS.length} rooms.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
