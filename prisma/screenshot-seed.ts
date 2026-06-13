import { PrismaClient, Prisma } from '@prisma/client';
import {
  DEMO_CLERK_USERS,
  SCREENSHOT_DEMO_ORG_ID,
  SCREENSHOT_DEMO_ORG_NAME,
  SCREENSHOT_DEMO_ORG_SLUG,
  SCREENSHOT_DEMO_USER_ID,
  assertScreenshotModeSafe,
  fixedScreenshotDate,
  isScreenshotMode,
} from '../src/lib/screenshot-mode';

const prisma = new PrismaClient();

const ORG = SCREENSHOT_DEMO_ORG_ID;
const ADMIN = SCREENSHOT_DEMO_USER_ID;
const fixedNow = fixedScreenshotDate();

function daysAgo(days: number) {
  const date = new Date(fixedNow);
  date.setDate(date.getDate() - days);
  return date;
}

function daysFromNow(days: number) {
  const date = new Date(fixedNow);
  date.setDate(date.getDate() + days);
  return date;
}

function photo(label: string, bg = 'e5f0dc', fg = '025d55') {
  return `https://placehold.co/960x640/${bg}/${fg}?text=${encodeURIComponent(label)}`;
}

async function resetPublicSchema() {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `;

  if (rows.length === 0) return;

  const tables = rows
    .map(({ tablename }) => `"public"."${tablename.replace(/"/g, '""')}"`)
    .join(', ');

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
}

async function main() {
  if (!isScreenshotMode()) {
    throw new Error('Set WILDTRACK360_SCREENSHOT_MODE=true before running the screenshot seed.');
  }
  assertScreenshotModeSafe();

  console.log('Resetting demo database...');
  await resetPublicSchema();

  console.log('Seeding organisation settings and users...');
  await prisma.organisationSettings.create({
    data: {
      clerkOrganisationId: ORG,
      orgUrl: SCREENSHOT_DEMO_ORG_SLUG,
      orgShortCode: 'IWR',
      animalIdTemplate: '{ORG_SHORT}-{YYYY}-{seq:4}',
      legalName: SCREENSHOT_DEMO_ORG_NAME,
      contactEmail: 'reports@illawarra-wildlife.example',
      contactPhone: '+61 2 4200 0198',
      licenseNumber: 'MWL000189',
      abn: '49 000 120 360',
      dgrEndorsed: true,
      receiptPrefix: 'IWR',
      donationThankYouMessage:
        'Thank you {name} for helping local wildlife get expert care and a safe release.',
      membershipThankYouMessage:
        'Welcome {name}. Your membership helps keep rescue phones, feed, and carers supported.',
    },
  });

  await prisma.orgFeatureFlag.create({
    data: {
      clerkOrganizationId: ORG,
      feature: 'MEMBERSHIP_PLATFORM',
      enabled: true,
    },
  });

  for (const user of DEMO_CLERK_USERS) {
    const role =
      user.id === ADMIN
        ? 'ADMIN'
        : user.id === 'demo-user-macropods'
          ? 'COORDINATOR_ALL'
          : user.id === 'demo-user-bats'
            ? 'COORDINATOR'
            : user.id === 'demo-user-reptiles'
              ? 'CARER_ALL'
              : 'CARER';

    await prisma.orgMember.create({
      data: {
        userId: user.id,
        orgId: ORG,
        role,
      },
    });
  }

  const species = [
    ['Eastern Grey Kangaroo', 'Macropus giganteus', 'Mammal', 'Macropod joeys and adults'],
    ['Swamp Wallaby', 'Wallabia bicolor', 'Mammal', 'Macropod rehabilitation'],
    ['Common Brushtail Possum', 'Trichosurus vulpecula', 'Mammal', 'Possum care'],
    ['Ringtail Possum', 'Pseudocheirus peregrinus', 'Mammal', 'Possum care'],
    ['Grey-headed Flying-fox', 'Pteropus poliocephalus', 'Mammal', 'Threatened flying fox care'],
    ['Little Red Flying-fox', 'Pteropus scapulatus', 'Mammal', 'Flying fox care'],
    ['Australian Magpie', 'Gymnorhina tibicen', 'Bird', 'Urban bird rehabilitation'],
    ['Laughing Kookaburra', 'Dacelo novaeguineae', 'Bird', 'Bird care'],
    ['Eastern Water Dragon', 'Intellagama lesueurii', 'Reptile', 'Reptile care'],
    ['Blue-tongue Lizard', 'Tiliqua scincoides', 'Reptile', 'Reptile care'],
    ['Eastern Long-necked Turtle', 'Chelodina longicollis', 'Reptile', 'Turtle care'],
    ['Short-beaked Echidna', 'Tachyglossus aculeatus', 'Mammal', 'Monotreme care'],
  ];

  await prisma.species.createMany({
    data: species.map(([name, scientificName, type, careRequirements]) => ({
      id: `species-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name,
      scientificName,
      type,
      description: `${type}. NSW rehabilitation species.`,
      careRequirements,
      clerkUserId: ADMIN,
      clerkOrganizationId: ORG,
    })),
  });

  const macropodGroup = await prisma.speciesGroup.create({
    data: {
      slug: 'macropods',
      name: 'Macropods',
      description: 'Kangaroos and wallabies requiring pouched-joey care.',
      speciesNames: ['Eastern Grey Kangaroo', 'Swamp Wallaby'],
      orgId: ORG,
    },
  });
  const batsGroup = await prisma.speciesGroup.create({
    data: {
      slug: 'flying-foxes',
      name: 'Flying Foxes',
      description: 'Flying fox pups, adults, heat-stress events, and release aviary cases.',
      speciesNames: ['Grey-headed Flying-fox', 'Little Red Flying-fox'],
      orgId: ORG,
    },
  });
  const batCoordinator = await prisma.orgMember.findUniqueOrThrow({
    where: { userId_orgId: { userId: 'demo-user-bats', orgId: ORG } },
  });
  await prisma.coordinatorSpeciesAssignment.create({
    data: {
      orgMemberId: batCoordinator.id,
      speciesGroupId: batsGroup.id,
    },
  });
  const macropodCoordinator = await prisma.orgMember.findUniqueOrThrow({
    where: { userId_orgId: { userId: 'demo-user-macropods', orgId: ORG } },
  });
  await prisma.coordinatorSpeciesAssignment.create({
    data: {
      orgMemberId: macropodCoordinator.id,
      speciesGroupId: macropodGroup.id,
    },
  });

  console.log('Seeding carers, training, and animals...');
  const carerProfiles = [
    {
      id: ADMIN,
      phone: '+61 400 800 123',
      licenseNumber: 'MWL000189-A',
      licenseExpiry: daysFromNow(410),
      specialties: ['Coordination', 'Possums', 'Birds'],
      streetAddress: '12 Banksia Circuit',
      suburb: 'Wollongong',
      postcode: '2500',
      executivePosition: 'President',
      trainingLevel: 'Advanced',
      memberId: 'IWR-001',
      memberSince: daysAgo(1500),
    },
    {
      id: 'demo-user-macropods',
      phone: '+61 411 320 880',
      licenseNumber: 'MWL000189-M',
      licenseExpiry: daysFromNow(95),
      specialties: ['Macropods', 'Emergency Care'],
      streetAddress: '48 Cedar Street',
      suburb: 'Dapto',
      postcode: '2530',
      speciesCoordinatorFor: 'Macropods',
      trainingLevel: 'Advanced',
      memberId: 'IWR-014',
      memberSince: daysAgo(900),
    },
    {
      id: 'demo-user-bats',
      phone: '+61 433 220 440',
      licenseNumber: 'MWL000189-F',
      licenseExpiry: daysFromNow(21),
      specialties: ['Flying Foxes', 'Heat Stress'],
      streetAddress: '7 Jacaranda Place',
      suburb: 'Woonona',
      postcode: '2517',
      speciesCoordinatorFor: 'Flying Foxes',
      rehabilitatesFlyingFox: true,
      trainingLevel: 'Specialist',
      memberId: 'IWR-028',
      memberSince: daysAgo(700),
    },
    {
      id: 'demo-user-reptiles',
      phone: '+61 477 900 221',
      licenseNumber: 'MWL000189-R',
      licenseExpiry: daysFromNow(240),
      specialties: ['Reptiles', 'Turtles'],
      streetAddress: '21 Cliff Road',
      suburb: 'Kiama',
      postcode: '2533',
      rehabilitatesMarineReptile: true,
      trainingLevel: 'Intermediate',
      memberId: 'IWR-044',
      memberSince: daysAgo(430),
    },
    {
      id: 'demo-user-birds',
      phone: '+61 488 712 010',
      licenseNumber: 'MWL000189-B',
      licenseExpiry: daysAgo(4),
      specialties: ['Birds', 'Nestlings'],
      streetAddress: '3 Ocean View Lane',
      suburb: 'Shellharbour',
      postcode: '2529',
      rehabilitatesBirdOfPrey: true,
      trainingLevel: 'Foundation',
      memberId: 'IWR-051',
      memberSince: daysAgo(180),
    },
  ];

  for (const carer of carerProfiles) {
    await prisma.carerProfile.create({
      data: {
        ...carer,
        state: 'NSW',
        active: true,
        clerkOrganizationId: ORG,
      },
    });
  }

  const trainingRows = [
    ['demo-user-bats', 'Flying Fox Handling and Vaccination', 'NSW Wildlife Council', 38, 11, 'Specialist', 8],
    ['demo-user-bats', 'Heat Stress Colony Response', 'WIRES Training', 140, 45, 'Refresher', 4],
    ['demo-user-macropods', 'Macropod Joey Intensive Care', 'TAFE NSW', 75, 320, 'Specialist', 12],
    ['demo-user-reptiles', 'Reptile Rescue and Transport', 'Reptile Rescue NSW', 210, 510, 'Specialist', 6],
    ['demo-user-birds', 'Wildlife First Aid', 'NSW Wildlife Council', 365, -2, 'Mandatory', 6],
    [ADMIN, 'Coordinator Compliance Workshop', 'DCCEEW', 30, 365, 'Mandatory', 5],
  ] as const;

  await prisma.carerTraining.createMany({
    data: trainingRows.map(([carerId, courseName, provider, completedAgo, expiryIn, trainingType, hours]) => ({
      carerId,
      courseName,
      provider,
      date: daysAgo(completedAgo),
      expiryDate: daysFromNow(expiryIn),
      certificateNumber: `CERT-${ORG.slice(-4)}-${completedAgo}`,
      certificateUrl: `demo://certificates/${carerId}/${completedAgo}`,
      trainingType,
      trainingHours: hours,
      notes: expiryIn < 30 ? 'Renewal reminder sent to coordinator.' : null,
      clerkUserId: ADMIN,
      clerkOrganizationId: ORG,
    })),
  });

  const animalRows = [
    {
      id: 'animal-luna',
      name: 'Luna',
      species: 'Grey-headed Flying-fox',
      sex: 'Female',
      ageClass: 'Juvenile',
      status: 'IN_CARE',
      dateFound: daysAgo(14),
      rescueLocation: 'Woonona fig trees',
      rescueAddress: 'Princes Highway near Campbell Street',
      rescueSuburb: 'Woonona',
      rescuePostcode: '2517',
      rescueCoordinates: { lat: -34.3471, lng: 150.9063 },
      initialWeightGrams: 312,
      animalCondition: 'Injured',
      encounterType: 'Injured',
      lifeStage: 'Juvenile',
      orgAnimalId: 'IWR-2026-0042',
      carerId: 'demo-user-bats',
      photo: photo('Luna flying-fox', 'd9ead8'),
      notes: 'Wing membrane tear healing well; suitable for release aviary next week.',
    },
    {
      id: 'animal-banksia',
      name: 'Banksia',
      species: 'Swamp Wallaby',
      sex: 'Male',
      ageClass: 'Pouch young',
      status: 'IN_CARE',
      dateFound: daysAgo(22),
      rescueLocation: 'Figtree roadside',
      rescueAddress: 'O\'Briens Road',
      rescueSuburb: 'Figtree',
      rescuePostcode: '2525',
      rescueCoordinates: { lat: -34.4355, lng: 150.8587 },
      initialWeightGrams: 890,
      animalCondition: 'Orphaned',
      encounterType: 'Orphaned',
      pouchCondition: 'Clean and dry',
      lifeStage: 'Dependent young',
      orgAnimalId: 'IWR-2026-0037',
      carerId: 'demo-user-macropods',
      photo: photo('Banksia wallaby joey', 'f4ecd8'),
      notes: 'Stable feed response, weight gain on target.',
    },
    {
      id: 'animal-pippin',
      name: 'Pippin',
      species: 'Common Brushtail Possum',
      sex: 'Female',
      ageClass: 'Adult',
      status: 'READY_FOR_RELEASE',
      dateFound: daysAgo(42),
      rescueLocation: 'Corrimal roof cavity',
      rescueAddress: 'Railway Street',
      rescueSuburb: 'Corrimal',
      rescuePostcode: '2518',
      rescueCoordinates: { lat: -34.3738, lng: 150.8965 },
      releaseLocation: 'Corrimal East reserve',
      releaseAddress: 'Robertson Street',
      releaseSuburb: 'Corrimal',
      releasePostcode: '2518',
      releaseCoordinates: { lat: -34.3713, lng: 150.9091 },
      initialWeightGrams: 1840,
      animalCondition: 'Displaced',
      encounterType: 'Displaced',
      lifeStage: 'Adult',
      orgAnimalId: 'IWR-2026-0026',
      carerId: ADMIN,
      photo: photo('Pippin possum', 'e8f3e2'),
      notes: 'Fitness indicators met, soft release box prepared.',
    },
    {
      id: 'animal-reef',
      name: 'Reef',
      species: 'Eastern Water Dragon',
      sex: 'Male',
      ageClass: 'Adult',
      status: 'RELEASED',
      dateFound: daysAgo(81),
      dateReleased: daysAgo(9),
      outcomeDate: daysAgo(9),
      outcome: 'Released at rescue location',
      fate: 'Released',
      rescueLocation: 'Minnamurra River picnic area',
      rescueAddress: 'Riverside Drive',
      rescueSuburb: 'Minnamurra',
      rescuePostcode: '2533',
      releaseLocation: 'Minnamurra River picnic area',
      releaseAddress: 'Riverside Drive',
      releaseSuburb: 'Minnamurra',
      releasePostcode: '2533',
      initialWeightGrams: 420,
      animalCondition: 'Injured',
      encounterType: 'Injured',
      lifeStage: 'Adult',
      orgAnimalId: 'IWR-2026-0011',
      carerId: 'demo-user-reptiles',
      photo: photo('Reef water dragon', 'dce8f7'),
      notes: 'Released after tail wound healed.',
    },
    {
      id: 'animal-casuarina',
      name: 'Casuarina',
      species: 'Australian Magpie',
      sex: 'Unknown',
      ageClass: 'Nestling',
      status: 'IN_CARE',
      dateFound: daysAgo(5),
      rescueLocation: 'Oak Flats school oval',
      rescueAddress: 'Central Avenue',
      rescueSuburb: 'Oak Flats',
      rescuePostcode: '2529',
      initialWeightGrams: 84,
      animalCondition: 'Fallen from nest',
      encounterType: 'Orphaned',
      lifeStage: 'Dependent young',
      orgAnimalId: 'IWR-2026-0048',
      carerId: 'demo-user-birds',
      photo: photo('Casuarina magpie', 'e4edf2'),
      notes: 'Warm, alert and feeding every 45 minutes.',
    },
    {
      id: 'animal-myrtle',
      name: 'Myrtle',
      species: 'Blue-tongue Lizard',
      sex: 'Female',
      ageClass: 'Adult',
      status: 'PERMANENT_CARE',
      dateFound: daysAgo(180),
      outcomeDate: daysAgo(31),
      outcome: 'Permanent care approved for education',
      rescueLocation: 'Albion Park garden',
      rescueAddress: 'Terry Street',
      rescueSuburb: 'Albion Park',
      rescuePostcode: '2527',
      initialWeightGrams: 520,
      animalCondition: 'Non-releasable',
      encounterType: 'Injured',
      lifeStage: 'Adult',
      orgAnimalId: 'IWR-2025-0188',
      carerId: 'demo-user-reptiles',
      photo: photo('Myrtle blue-tongue', 'edf0d7'),
      notes: 'Permanent care due to chronic jaw injury.',
    },
    {
      id: 'animal-koura',
      name: 'Koura',
      species: 'Eastern Long-necked Turtle',
      sex: 'Female',
      ageClass: 'Adult',
      status: 'TRANSFERRED',
      dateFound: daysAgo(64),
      outcomeDate: daysAgo(18),
      outcome: 'Transferred to reptile specialist facility',
      fate: 'Transferred to other wildlife rehabilitation organisation',
      rescueLocation: 'Lake Illawarra foreshore',
      rescueAddress: 'Reddall Parade',
      rescueSuburb: 'Lake Illawarra',
      rescuePostcode: '2528',
      initialWeightGrams: 780,
      animalCondition: 'Injured',
      encounterType: 'Injured',
      lifeStage: 'Adult',
      orgAnimalId: 'IWR-2026-0021',
      carerId: 'demo-user-reptiles',
      photo: photo('Koura turtle', 'dbeee8'),
      notes: 'Shell repair required specialist equipment.',
    },
    {
      id: 'animal-gully',
      name: 'Gully',
      species: 'Eastern Grey Kangaroo',
      sex: 'Female',
      ageClass: 'Juvenile',
      status: 'ADMITTED',
      dateFound: daysAgo(1),
      rescueLocation: 'Mount Keira track',
      rescueAddress: 'Queen Elizabeth Drive',
      rescueSuburb: 'Mount Keira',
      rescuePostcode: '2500',
      initialWeightGrams: 2200,
      animalCondition: 'Under observation',
      encounterType: 'Orphaned',
      lifeStage: 'Juvenile',
      orgAnimalId: 'IWR-2026-0051',
      carerId: null,
      photo: photo('Gully kangaroo', 'f0e5d6'),
      notes: 'New admission awaiting coordinator assignment.',
    },
    {
      id: 'animal-fern',
      name: 'Fern',
      species: 'Ringtail Possum',
      sex: 'Female',
      ageClass: 'Juvenile',
      status: 'DECEASED',
      dateFound: daysAgo(95),
      outcomeDate: daysAgo(92),
      outcome: 'Died in care',
      fate: 'Died in care',
      rescueLocation: 'Thirroul backyard',
      rescueAddress: 'George Street',
      rescueSuburb: 'Thirroul',
      rescuePostcode: '2515',
      initialWeightGrams: 112,
      animalCondition: 'Critical',
      encounterType: 'Injured',
      lifeStage: 'Juvenile',
      orgAnimalId: 'IWR-2026-0005',
      carerId: ADMIN,
      photo: photo('Fern ringtail', 'eee7e2'),
      notes: 'Severe cat attack injuries, preserved specimen retained for education record.',
    },
  ] as const;

  for (const animal of animalRows) {
    await prisma.animal.create({
      data: {
        ...animal,
        status: animal.status as any,
        interOrgTransferReceived: false,
        clerkUserId: ADMIN,
        clerkOrganizationId: ORG,
      },
    });
  }

  const records = [
    ['animal-luna', 'MEDICAL', 13, 'Wing membrane cleaned and dressed', 'Treatment room', 'No infection observed.'],
    ['animal-luna', 'FEEDING', 2, 'Evening nectar and fruit feed taken well', 'Aviary 2', 'Preparing for release aviary transfer.'],
    ['animal-banksia', 'WEIGHT', 20, 'Weight check 890 g', 'Macropod nursery', 'Gaining 22 g per day.'],
    ['animal-banksia', 'FEEDING', 1, 'Five scheduled feeds completed', 'Macropod nursery', 'No missed feeds.'],
    ['animal-pippin', 'RELEASE', 4, 'Soft release box installed', 'Corrimal East reserve', 'Release checklist ready.'],
    ['animal-reef', 'RELEASE', 9, 'Hard release completed at rescue site', 'Minnamurra River', 'Observed basking near release point.'],
    ['animal-casuarina', 'FEEDING', 1, 'Nestling feed logged every 45 minutes', 'Bird nursery', 'Strong feeding response.'],
    ['animal-myrtle', 'MEDICAL', 33, 'Permanent care review completed', 'Reptile enclosure', 'Education placement approved.'],
    ['animal-gully', 'MEDICAL', 1, 'Initial triage completed', 'Admission bay', 'Awaiting carer assignment.'],
  ] as const;

  await prisma.record.createMany({
    data: records.map(([animalId, type, days, description, location, notes]) => ({
      animalId,
      type: type as any,
      date: daysAgo(days),
      description,
      location,
      notes,
      clerkUserId: ADMIN,
      clerkOrganizationId: ORG,
    })),
  });

  await prisma.photo.createMany({
    data: animalRows.slice(0, 6).map((animal) => ({
      animalId: animal.id,
      url: animal.photo,
      description: `${animal.name} intake photo`,
      date: animal.dateFound,
      clerkUserId: ADMIN,
      clerkOrganizationId: ORG,
    })),
  });

  await prisma.growthMeasurement.createMany({
    data: [
      ['animal-banksia', 22, 820, 52, 43, 118, 'Initial joey measurements'],
      ['animal-banksia', 14, 910, 54, 45, 124, 'Growth curve tracking above minimum'],
      ['animal-banksia', 6, 1040, 57, 46, 130, 'Feed stage review due'],
      ['animal-casuarina', 5, 84, null, null, null, 'Nestling intake weight'],
      ['animal-casuarina', 1, 103, null, null, null, 'Steady gain after feeding schedule'],
    ].map(([animalId, days, weightGrams, headLengthMm, earLengthMm, tailLengthMm, notes]) => ({
      animalId: String(animalId),
      date: daysAgo(Number(days)),
      weightGrams: Number(weightGrams),
      headLengthMm: headLengthMm == null ? null : Number(headLengthMm),
      earLengthMm: earLengthMm == null ? null : Number(earLengthMm),
      tailLengthMm: tailLengthMm == null ? null : Number(tailLengthMm),
      notes: String(notes),
      clerkUserId: ADMIN,
      clerkOrganizationId: ORG,
    })),
  });

  await prisma.releaseChecklist.createMany({
    data: [
      {
        animalId: 'animal-pippin',
        releaseDate: daysFromNow(2),
        releaseLocation: 'Corrimal East reserve',
        releaseCoordinates: { lat: -34.3713, lng: 150.9091 },
        within10km: true,
        releaseType: 'SOFT',
        fitnessIndicators: ['climbing', 'self-feeding', 'weather-ready', 'site-safe'],
        vetSignOff: { signedBy: 'Dr A. Martin', date: daysAgo(2).toISOString() },
        photos: [photo('Soft release box')],
        completed: true,
        notes: 'Soft release box installed and monitored.',
        clerkUserId: ADMIN,
        clerkOrganizationId: ORG,
      },
      {
        animalId: 'animal-reef',
        releaseDate: daysAgo(9),
        releaseLocation: 'Minnamurra River picnic area',
        releaseCoordinates: { lat: -34.6328, lng: 150.8552 },
        within10km: true,
        releaseType: 'HARD',
        fitnessIndicators: ['mobility', 'feeding', 'wound-healed'],
        vetSignOff: { signedBy: 'Kiama Veterinary Clinic', date: daysAgo(10).toISOString() },
        photos: [photo('Release site')],
        completed: true,
        notes: 'Released at rescue site after final assessment.',
        clerkUserId: ADMIN,
        clerkOrganizationId: ORG,
      },
    ],
  });

  await prisma.postReleaseMonitoring.createMany({
    data: [
      {
        animalId: 'animal-reef',
        date: daysAgo(3),
        time: '15:40',
        location: 'Minnamurra River bank',
        coordinates: { lat: -34.6326, lng: 150.8555 },
        animalCondition: 'Healthy',
        notes: 'Basking and moving normally near the release point.',
        photos: [photo('Post release sighting')],
        clerkUserId: ADMIN,
        clerkOrganizationId: ORG,
      },
    ],
  });

  await prisma.animalTransfer.createMany({
    data: [
      {
        animalId: 'animal-koura',
        transferDate: daysAgo(18),
        transferType: 'INTER_ORGANISATION',
        reasonForTransfer: 'Specialist shell repair and aquatic recovery equipment required',
        fromCarerId: 'demo-user-reptiles',
        toCarerId: null,
        receivingEntity: 'South Coast Reptile Rehabilitation',
        receivingEntityType: 'organisation',
        receivingLicense: 'MWL002410',
        receivingContactName: 'Jules Harper',
        receivingContactPhone: '+61 400 100 221',
        receivingContactEmail: 'reptiles@example.org',
        receivingOrgAnimalId: 'SCRR-26-081',
        receivingAuthorityType: 'Rehabilitation authority',
        receivingAddress: '14 Wetlands Road',
        receivingSuburb: 'Nowra',
        receivingState: 'NSW',
        receivingPostcode: '2541',
        transferAuthorizedBy: 'Amelia Hart',
        verifiedByUserId: ADMIN,
        verifiedAt: daysAgo(18),
        transferNotes: 'Photos and treatment notes sent with transfer.',
        documents: ['demo://documents/koura-transfer.pdf'],
        clerkUserId: ADMIN,
        clerkOrganizationId: ORG,
      },
      {
        animalId: 'animal-banksia',
        transferDate: daysAgo(8),
        transferType: 'INTERNAL_CARER',
        reasonForTransfer: 'Moved to macropod nursery for intensive feeding roster',
        fromCarerId: ADMIN,
        toCarerId: 'demo-user-macropods',
        receivingEntity: 'Noah Singh',
        receivingEntityType: 'individual',
        transferAuthorizedBy: 'Amelia Hart',
        verifiedByUserId: ADMIN,
        verifiedAt: daysAgo(8),
        transferNotes: 'Internal handover completed at evening feed.',
        clerkUserId: ADMIN,
        clerkOrganizationId: ORG,
      },
    ],
  });

  const permanentCareApplication = await prisma.permanentCareApplication.create({
    data: {
      animalId: 'animal-myrtle',
      status: 'APPROVED',
      createdByUserId: 'demo-user-reptiles',
      submittedByUserId: 'demo-user-reptiles',
      submittedAt: daysAgo(40),
      nonReleasableReasons: 'Jaw injury prevents independent feeding in the wild.',
      euthanasiaJustification: 'Animal has good welfare in permanent care and education value.',
      vetReportUrl: 'demo://documents/myrtle-vet-report.pdf',
      vetName: 'Dr Sophie Chen',
      vetClinic: 'Shellharbour Veterinary Hospital',
      vetContact: '+61 2 4200 4444',
      npwsApprovalNumber: 'NPWS-PC-2026-118',
      npwsApprovalDate: daysAgo(31),
      keeperName: 'Ethan Cole',
      facilityName: 'Illawarra Wildlife Education Centre',
      facilityAddress: '40 Wildlife Lane',
      facilitySuburb: 'Kiama',
      facilityState: 'NSW',
      facilityPostcode: '2533',
      category: 'EDUCATION',
      reviewedByUserId: ADMIN,
      reviewedAt: daysAgo(31),
      notes: 'Approved for school education sessions with welfare review every six months.',
      clerkOrganizationId: ORG,
    },
  });

  await prisma.permanentCareApproval.create({
    data: {
      animalId: 'animal-myrtle',
      npwsApprovalDate: daysAgo(31),
      npwsApprovalNumber: 'NPWS-PC-2026-118',
      approvalCategory: 'EDUCATION',
      facilityName: 'Illawarra Wildlife Education Centre',
      licenseNumber: 'MWL000189',
      keeperName: 'Ethan Cole',
      address: '40 Wildlife Lane',
      suburb: 'Kiama',
      state: 'NSW',
      postcode: '2533',
      status: 'ALIVE',
      statusLastUpdated: daysAgo(31),
      approvalDocumentUrl: 'demo://documents/myrtle-approval.pdf',
      notes: `Linked application ${permanentCareApplication.id}`,
      clerkUserId: ADMIN,
      clerkOrganizationId: ORG,
    },
  });

  await prisma.preservedSpecimen.create({
    data: {
      animalId: 'animal-fern',
      species: 'Ringtail Possum',
      registerReferenceNumber: 'IWR-PS-2026-009',
      specimenDescription: 'Skull and tissue sample retained for education and training reference.',
      preservationMethod: 'Frozen tissue and cleaned skull',
      preservationDate: daysAgo(88),
      facilityName: 'Illawarra Wildlife Education Centre',
      facilityLicense: 'MWL000189',
      storageAddress: '40 Wildlife Lane',
      storageSuburb: 'Kiama',
      storageState: 'NSW',
      storagePostcode: '2533',
      scientificPurpose: 'Carer training on cat-attack injury identification.',
      authorizedBy: 'Amelia Hart',
      notes: 'Label printed and attached to storage container.',
      photos: [photo('Preserved specimen label')],
      clerkUserId: ADMIN,
      clerkOrganizationId: ORG,
    },
  });

  await prisma.incidentReport.createMany({
    data: [
      {
        date: daysAgo(6),
        type: 'Biosecurity',
        description: 'PPE station missing disposable gloves during morning feed round.',
        severity: 'MEDIUM',
        resolved: false,
        personInvolved: 'Morning roster team',
        reportedTo: 'Coordinator',
        actionTaken: 'Supplies ordered and interim PPE moved from treatment room.',
        location: 'Aviary 2',
        animalId: 'animal-luna',
        notes: 'Follow-up hygiene audit due Friday.',
        attachments: ['demo://photos/ppe-station.jpg'],
        clerkUserId: ADMIN,
        clerkOrganizationId: ORG,
      },
      {
        date: daysAgo(17),
        type: 'Carer Safety',
        description: 'Minor scratch during possum cage clean.',
        severity: 'LOW',
        resolved: true,
        resolution: 'First aid completed and handling procedure refreshed.',
        personInvolved: 'Volunteer carer',
        reportedTo: 'Roster lead',
        actionTaken: 'Glove protocol reinforced.',
        location: 'Possum room',
        animalId: 'animal-pippin',
        notes: 'No further action required.',
        clerkUserId: ADMIN,
        clerkOrganizationId: ORG,
      },
      {
        date: daysAgo(2),
        type: 'Animal Welfare',
        description: 'New macropod admission unsettled and unassigned overnight.',
        severity: 'HIGH',
        resolved: false,
        personInvolved: 'Admissions team',
        reportedTo: 'Macropod coordinator',
        actionTaken: 'Temporary feed roster added, carer assignment pending.',
        location: 'Admission bay',
        animalId: 'animal-gully',
        notes: 'Coordinator assignment needed today.',
        clerkUserId: ADMIN,
        clerkOrganizationId: ORG,
      },
    ],
  });

  await prisma.hygieneLog.createMany({
    data: [
      {
        date: daysAgo(1),
        type: 'Aviary clean',
        description: 'Flying fox aviary daily clean and feed station disinfect.',
        completed: true,
        enclosureCleaned: true,
        ppeUsed: true,
        handwashAvailable: true,
        feedingBowlsDisinfected: true,
        quarantineSignsPresent: true,
        photos: [photo('Aviary clean')],
        carerId: 'demo-user-bats',
        notes: 'No biosecurity gaps.',
        clerkUserId: ADMIN,
        clerkOrganizationId: ORG,
      },
      {
        date: daysAgo(2),
        type: 'Nursery clean',
        description: 'Macropod nursery bedding refresh and bottle station clean.',
        completed: true,
        enclosureCleaned: true,
        ppeUsed: true,
        handwashAvailable: true,
        feedingBowlsDisinfected: true,
        quarantineSignsPresent: false,
        carerId: 'demo-user-macropods',
        notes: 'Replacement quarantine sign ordered.',
        clerkUserId: ADMIN,
        clerkOrganizationId: ORG,
      },
      {
        date: daysAgo(5),
        type: 'Reptile enclosure',
        description: 'Water bowls, hides, and substrate check.',
        completed: false,
        enclosureCleaned: true,
        ppeUsed: true,
        handwashAvailable: false,
        feedingBowlsDisinfected: false,
        quarantineSignsPresent: true,
        carerId: 'demo-user-reptiles',
        notes: 'Incomplete due to water outage.',
        clerkUserId: ADMIN,
        clerkOrganizationId: ORG,
      },
    ],
  });

  console.log('Seeding call logs, reports, assets, and admin data...');
  await prisma.callLogReason.createMany({
    data: ['Injured animal', 'Orphaned young', 'Advice request', 'Transport needed'].map((label, index) => ({
      label,
      displayOrder: index + 1,
      active: true,
      clerkOrganizationId: ORG,
    })),
  });
  await prisma.callLogReferrer.createMany({
    data: ['Public caller', 'Council', 'Vet clinic', 'Police'].map((label, index) => ({
      label,
      displayOrder: index + 1,
      active: true,
      clerkOrganizationId: ORG,
    })),
  });
  await prisma.callLogAction.createMany({
    data: ['Rescue assigned', 'Advice provided', 'Pindrop sent', 'Transport arranged'].map((label, index) => ({
      label,
      displayOrder: index + 1,
      active: true,
      clerkOrganizationId: ORG,
    })),
  });
  await prisma.callLogOutcome.createMany({
    data: ['Animal admitted', 'Advice only', 'Caller monitoring', 'Transferred'].map((label, index) => ({
      label,
      displayOrder: index + 1,
      active: true,
      clerkOrganizationId: ORG,
    })),
  });

  const callLog = await prisma.callLog.create({
    data: {
      dateTime: daysAgo(0),
      status: 'OPEN',
      callerName: 'Grace Taylor',
      callerPhone: '+61 400 880 221',
      callerEmail: 'grace.taylor@example.net',
      species: 'Grey-headed Flying-fox',
      location: 'Backyard fig tree, Woonona',
      coordinates: { lat: -34.3476, lng: 150.9059 },
      suburb: 'Woonona',
      postcode: '2517',
      notes: 'Caller has contained dog and can see pup low in tree.',
      reason: 'Injured animal',
      referrer: 'Public caller',
      action: 'Pindrop sent',
      outcome: 'Rescue assigned',
      takenByUserId: ADMIN,
      takenByUserName: 'Amelia Hart',
      assignedToUserId: 'demo-user-bats',
      assignedToUserName: 'Maya Nguyen',
      animalId: 'animal-luna',
      clerkOrganizationId: ORG,
    },
  });

  await prisma.callLog.create({
    data: {
      dateTime: daysAgo(3),
      status: 'CLOSED',
      callerName: 'Dev Patel',
      callerPhone: '+61 411 990 114',
      species: 'Common Brushtail Possum',
      location: 'Corrimal roof cavity',
      suburb: 'Corrimal',
      postcode: '2518',
      notes: 'Advice provided and animal later admitted as Pippin.',
      reason: 'Advice request',
      referrer: 'Public caller',
      action: 'Advice provided',
      outcome: 'Animal admitted',
      takenByUserId: ADMIN,
      takenByUserName: 'Amelia Hart',
      assignedToUserId: ADMIN,
      assignedToUserName: 'Amelia Hart',
      animalId: 'animal-pippin',
      clerkOrganizationId: ORG,
    },
  });

  await prisma.pindropSession.create({
    data: {
      accessToken: 'demo-pindrop-token',
      status: 'SUBMITTED',
      callerName: 'Grace Taylor',
      callerEmail: 'grace.taylor@example.net',
      callerPhone: '+61 400 880 221',
      lat: -34.3476,
      lng: 150.9059,
      address: 'Campbell Street, Woonona NSW 2517',
      photoUrls: [photo('Pindrop flying-fox photo')],
      callerNotes: 'Pup is hanging low but still moving.',
      userAgent: 'Demo browser',
      submittedAt: daysAgo(0),
      expiresAt: daysFromNow(1),
      callLogId: callLog.id,
      clerkOrganizationId: ORG,
      clerkUserId: ADMIN,
    },
  });

  await prisma.asset.createMany({
    data: [
      {
        name: 'ICU Incubator 02',
        type: 'Medical Equipment',
        description: 'Temperature-controlled incubator for small mammals and nestlings.',
        status: 'IN_USE',
        location: 'Admission bay',
        assignedTo: 'animal-casuarina',
        purchaseDate: daysAgo(980),
        lastMaintenance: daysAgo(18),
        notes: 'Next calibration due in August.',
        clerkUserId: ADMIN,
        clerkOrganizationId: ORG,
      },
      {
        name: 'Flying Fox Release Aviary',
        type: 'Aviary',
        description: 'Soft-release aviary with feed station and flight conditioning space.',
        status: 'AVAILABLE',
        location: 'Woonona facility',
        lastMaintenance: daysAgo(11),
        notes: 'Booked for Luna next week.',
        clerkUserId: ADMIN,
        clerkOrganizationId: ORG,
      },
      {
        name: 'Pindrop Field Phone',
        type: 'Communications',
        description: 'Shared rescue phone used for SMS Pindrop links.',
        status: 'IN_USE',
        location: 'Coordinator kit',
        assignedTo: ADMIN,
        lastMaintenance: daysAgo(35),
        notes: 'Battery health 91%.',
        clerkUserId: ADMIN,
        clerkOrganizationId: ORG,
      },
    ],
  });

  await prisma.savedReportQuery.createMany({
    data: [
      {
        orgId: ORG,
        createdByUserId: ADMIN,
        name: 'Unresolved incidents by severity',
        query: 'count from incidents where resolved = false group by severity chart bar',
        visualization: 'bar',
        showOnDashboard: true,
      },
      {
        orgId: ORG,
        createdByUserId: ADMIN,
        name: 'Animals by care status',
        query: 'count from animals group by status chart pie',
        visualization: 'pie',
        showOnDashboard: true,
      },
      {
        orgId: ORG,
        createdByUserId: ADMIN,
        name: 'Training hours by type',
        query: 'sum trainingHours from carer_training group by trainingType chart bar',
        visualization: 'bar',
        showOnDashboard: false,
      },
    ],
  });

  await prisma.nSWReportMetadata.create({
    data: {
      reportYear: 2026,
      reportPeriodStart: new Date('2025-07-01T00:00:00+10:00'),
      reportPeriodEnd: new Date('2026-06-30T23:59:59+10:00'),
      organizationName: SCREENSHOT_DEMO_ORG_NAME,
      licenseNumber: 'MWL000189',
      contactName: 'Amelia Hart',
      contactEmail: 'reports@illawarra-wildlife.example',
      contactPhone: '+61 2 4200 0198',
      submittedDate: null,
      submittedBy: null,
      nilReturn: false,
      totalAnimals: animalRows.length,
      totalTransfers: 2,
      totalPermanentCare: 1,
      totalPreservedSpecimens: 1,
      totalMembers: 8,
      reportFileUrl: null,
      reportHash: null,
      clerkOrganizationId: ORG,
    },
  });

  const templateFields = [
    { id: 'member-interests', type: 'multiselect', label: 'Interests', options: ['Rescue transport', 'Fundraising', 'Education'] },
    { id: 'volunteer-area', type: 'text', label: 'Volunteer area' },
  ];
  await prisma.formTemplate.create({
    data: {
      clerkOrganizationId: ORG,
      entityType: 'MEMBER',
      name: 'Member onboarding',
      version: 1,
      fieldsJson: templateFields as Prisma.InputJsonValue,
      isActive: true,
    },
  });

  const supporterTier = await prisma.membershipTier.create({
    data: {
      clerkOrganizationId: ORG,
      name: 'Supporter',
      description: 'Annual supporter membership for rescue operations.',
      amountCents: 6500,
      currency: 'AUD',
      billingInterval: 'ANNUAL',
      gstHandling: 'NONE',
      active: true,
    },
  });
  const lifetimeTier = await prisma.membershipTier.create({
    data: {
      clerkOrganizationId: ORG,
      name: 'Lifetime Conservation Partner',
      description: 'One-off lifetime membership.',
      amountCents: 45000,
      currency: 'AUD',
      billingInterval: 'LIFETIME',
      gstHandling: 'NONE',
      active: true,
    },
  });

  const member = await prisma.member.create({
    data: {
      clerkOrganizationId: ORG,
      email: 'sam.rivera@example.net',
      firstName: 'Sam',
      lastName: 'Rivera',
      phone: '+61 402 440 900',
      addressLine1: '18 Marine Parade',
      suburb: 'Shellharbour',
      state: 'NSW',
      postcode: '2529',
      memberNumber: 'IWR-M-108',
      status: 'ACTIVE',
      joinedAt: daysAgo(45),
      customFieldsJson: {
        'member-interests': ['Fundraising', 'Education'],
        'volunteer-area': 'School talks',
      },
    },
  });

  const payment = await prisma.payment.create({
    data: {
      clerkOrganizationId: ORG,
      memberId: member.id,
      kind: 'MEMBERSHIP_ONE_OFF',
      squarePaymentId: 'demo-square-payment-001',
      squareOrderId: 'demo-square-order-001',
      amountCents: 6500,
      applicationFeeCents: 325,
      processingFeeCents: 117,
      currency: 'AUD',
      status: 'SUCCEEDED',
      receiptUrl: 'demo://receipts/IWR-2026-0001.pdf',
      receiptNumber: 'IWR-2026-0001',
      metadata: { demo: true },
      createdAt: daysAgo(45),
    },
  });

  await prisma.membership.create({
    data: {
      clerkOrganizationId: ORG,
      memberId: member.id,
      tierId: supporterTier.id,
      periodStart: daysAgo(45),
      periodEnd: daysFromNow(320),
      status: 'ACTIVE',
      paymentId: payment.id,
    },
  });

  const donorPayment = await prisma.payment.create({
    data: {
      clerkOrganizationId: ORG,
      kind: 'DONATION_ONE_OFF',
      squarePaymentId: 'demo-square-payment-002',
      squareOrderId: 'demo-square-order-002',
      amountCents: 12000,
      applicationFeeCents: 600,
      processingFeeCents: 198,
      currency: 'AUD',
      status: 'SUCCEEDED',
      receiptUrl: 'demo://receipts/IWR-2026-0002.pdf',
      receiptNumber: 'IWR-2026-0002',
      metadata: { demo: true },
      createdAt: daysAgo(12),
    },
  });

  await prisma.donation.create({
    data: {
      clerkOrganizationId: ORG,
      donorEmail: 'liam.chen@example.net',
      donorName: 'Liam Chen',
      amountCents: 12000,
      feeCents: 600,
      currency: 'AUD',
      isAnonymous: false,
      message: 'For flying fox rescue supplies.',
      paymentId: donorPayment.id,
      createdAt: daysAgo(12),
    },
  });

  await prisma.membershipTier.create({
    data: {
      clerkOrganizationId: ORG,
      name: 'Family',
      description: 'Family supporter membership.',
      amountCents: 9500,
      currency: 'AUD',
      billingInterval: 'ANNUAL',
      gstHandling: 'NONE',
      active: true,
    },
  });
  await prisma.membershipTier.update({
    where: { id: lifetimeTier.id },
    data: { active: true },
  });

  await prisma.receiptSequence.create({
    data: {
      clerkOrganizationId: ORG,
      year: 2026,
      lastNumber: 2,
    },
  });

  await prisma.wallyUsageSummary.create({
    data: {
      orgId: ORG,
      dateKey: '2026-06-10',
      messageCount: 2,
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        userId: ADMIN,
        userName: 'Amelia Hart',
        userEmail: 'amelia.hart@illawarra-wildlife.example',
        orgId: ORG,
        action: 'CREATE',
        entity: 'Animal',
        entityId: 'animal-luna',
        metadata: { name: 'Luna', species: 'Grey-headed Flying-fox' },
        createdAt: daysAgo(14),
      },
      {
        userId: 'demo-user-bats',
        userName: 'Maya Nguyen',
        userEmail: 'maya.nguyen@illawarra-wildlife.example',
        orgId: ORG,
        action: 'UPDATE',
        entity: 'HygieneLog',
        metadata: { type: 'Aviary clean', completed: true },
        createdAt: daysAgo(1),
      },
      {
        userId: ADMIN,
        userName: 'Amelia Hart',
        userEmail: 'amelia.hart@illawarra-wildlife.example',
        orgId: ORG,
        action: 'EXPORT',
        entity: 'NSWReportMetadata',
        metadata: { year: 2026, mode: 'demo' },
        createdAt: daysAgo(3),
      },
    ],
  });

  await prisma.animalIdSequence.create({
    data: {
      clerkOrganisationId: ORG,
      year: 2026,
      nextValue: 52,
    },
  });

  console.log('Demo seed complete.');
  console.log(`Org: ${SCREENSHOT_DEMO_ORG_NAME} (${ORG})`);
  console.log(`Animals: ${animalRows.length}, carers: ${carerProfiles.length}, call logs: 2`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
