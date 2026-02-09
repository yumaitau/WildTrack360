import AnimalsClient from './animals-client';
import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getEnrichedCarers } from '@/lib/carer-helpers';

export default async function AnimalsPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  const organizationId = orgId || '';

  try {
    const [animals, speciesRows, enrichedCarers] = await Promise.all([
      prisma.animal.findMany({
        where: { clerkUserId: userId, clerkOrganizationId: organizationId },
        orderBy: { dateFound: 'desc' },
      }),
      prisma.species.findMany({
        where: { clerkUserId: userId, clerkOrganizationId: organizationId },
        orderBy: { name: 'asc' },
      }),
      getEnrichedCarers(organizationId),
    ]);

    const species = speciesRows.map(s => s.name);
    const carers = enrichedCarers.map(c => ({ value: c.id, label: c.name }));

    return (
      <Suspense fallback={<div>Loading...</div>}>
        <AnimalsClient initialAnimals={animals} species={species} carers={carers} />
      </Suspense>
    );
  } catch (error) {
    console.error('Error loading animals page:', error);
    throw new Error('Unable to load animals. Please try again later.');
  }
}
