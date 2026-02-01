import { PrismaClient } from '@prisma/client';
import { speciesSeedData } from './species-seed-data';

const prisma = new PrismaClient();

async function seedSpeciesForOrganization(clerkUserId: string, clerkOrganizationId: string) {
  console.log(`  📚 Seeding ${speciesSeedData.length} species...`);
  
  const species = await Promise.all(
    speciesSeedData.map(async (speciesData) => {
      const id = `species-${speciesData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      
      // Build description with category and type info
      let description = `${speciesData.type}`;
      if (speciesData.subtype) {
        description += ` - ${speciesData.subtype}`;
      }
      description += `. Category: ${speciesData.category}`;
      if (speciesData.speciesCode) {
        description += `. Species Code: ${speciesData.speciesCode}`;
      }
      
      return prisma.species.upsert({
        where: { id },
        update: {},
        create: {
          id,
          name: speciesData.name,
          scientificName: speciesData.scientificName,
          description,
          careRequirements: null, // Can be added later based on species type
          clerkUserId,
          clerkOrganizationId,
        },
      });
    })
  );
  
  console.log(`  ✅ Created ${species.length} species`);
  return species;
}

async function main() {
  console.log('🌱 Starting database seed...');

  // These are placeholder IDs used to satisfy the clerkUserId and
  // clerkOrganizationId fields required on every model. In production,
  // these values come from Clerk authentication. For seeding, we use
  // fixed strings so the demo data is consistent and queryable.
  const defaultUserId = 'seed-demo-user';
  const defaultOrgId = 'seed-demo-org';

  // Seed all species for the default organization
  const species = await seedSpeciesForOrganization(defaultUserId, defaultOrgId);

  // Create sample carers
  const carers = await Promise.all([
    prisma.carer.upsert({
      where: { id: 'carer-1' },
      update: {},
      create: {
        id: 'carer-1',
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@wildtrack360.com.au',
        phone: '+61 400 123 456',
        licenseNumber: 'ACT-WC-001',
        jurisdiction: 'ACT',
        specialties: ['Koalas', 'Marsupials', 'Emergency Care'],
        active: true,
        clerkUserId: defaultUserId,
        clerkOrganizationId: defaultOrgId,
      },
    }),
    prisma.carer.upsert({
      where: { id: 'carer-2' },
      update: {},
      create: {
        id: 'carer-2',
        name: 'Michael Chen',
        email: 'michael.chen@wildtrack360.com.au',
        phone: '+61 400 234 567',
        licenseNumber: 'ACT-WC-002',
        jurisdiction: 'ACT',
        specialties: ['Kangaroos', 'Large Mammals', 'Rehabilitation'],
        active: true,
        clerkUserId: defaultUserId,
        clerkOrganizationId: defaultOrgId,
      },
    }),
  ]);

  // Create sample animals
  const animals = await Promise.all([
    prisma.animal.create({
      data: {
        name: 'Kip',
        species: 'Koala',
        status: 'IN_CARE',
        dateFound: new Date('2024-01-15'),
        notes: 'Found dehydrated near road, responding well to treatment',
        photo: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=400&fit=crop&crop=center',
        clerkUserId: defaultUserId,
        clerkOrganizationId: defaultOrgId,
        carerId: carers[0].id,
      },
    }),
    prisma.animal.create({
      data: {
        name: 'Joey',
        species: 'Eastern Grey Kangaroo',
        status: 'IN_CARE',
        dateFound: new Date('2024-01-20'),
        notes: 'Orphaned joey found in pouch after mother hit by car',
        photo: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=400&fit=crop&crop=center',
        clerkUserId: defaultUserId,
        clerkOrganizationId: defaultOrgId,
        carerId: carers[1].id,
      },
    }),
    prisma.animal.create({
      data: {
        name: 'Pip',
        species: 'Common Brushtail Possum',
        status: 'READY_FOR_RELEASE',
        dateFound: new Date('2024-01-10'),
        notes: 'Young possum found in garden, ready for release',
        photo: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=400&fit=crop&crop=center',
        clerkUserId: defaultUserId,
        clerkOrganizationId: defaultOrgId,
        carerId: carers[0].id,
      },
    }),
  ]);

  // Create sample records
  await Promise.all([
    prisma.record.create({
      data: {
        type: 'MEDICAL',
        date: new Date('2024-01-15'),
        description: 'Initial health assessment - dehydrated, started IV fluids',
        location: 'Admission Room A',
        notes: 'Patient responding well to treatment',
        clerkUserId: defaultUserId,
        clerkOrganizationId: defaultOrgId,
        animalId: animals[0].id,
      },
    }),
    prisma.record.create({
      data: {
        type: 'FEEDING',
        date: new Date('2024-01-16'),
        description: 'First solid food - eucalyptus leaves',
        location: 'Enclosure 1',
        notes: 'Good appetite, eating well',
        clerkUserId: defaultUserId,
        clerkOrganizationId: defaultOrgId,
        animalId: animals[0].id,
      },
    }),
  ]);

  // Create sample assets
  await Promise.all([
    prisma.asset.create({
      data: {
        name: 'GPS Tracker A45',
        type: 'Tracking Device',
        description: 'GPS collar for wildlife tracking',
        status: 'IN_USE',
        location: 'Enclosure 1',
        assignedTo: animals[0].id,
        purchaseDate: new Date('2023-12-01'),
        clerkUserId: defaultUserId,
        clerkOrganizationId: defaultOrgId,
      },
    }),
    prisma.asset.create({
      data: {
        name: 'Incubator Unit 1',
        type: 'Medical Equipment',
        description: 'Temperature-controlled incubator for young animals',
        status: 'AVAILABLE',
        location: 'Medical Room',
        purchaseDate: new Date('2023-11-15'),
        clerkUserId: defaultUserId,
        clerkOrganizationId: defaultOrgId,
      },
    }),
  ]);

  console.log('✅ Database seeded successfully!');
  console.log(`📊 Summary:`);
  console.log(`   - ${species.length} species (native Australian wildlife)`);
  console.log(`   - ${carers.length} carers`);
  console.log(`   - ${animals.length} sample animals`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
