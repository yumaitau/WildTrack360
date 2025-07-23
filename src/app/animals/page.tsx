import { getAnimals, getSpecies, getCarers, initializeDataStores } from '@/lib/data-store';
import AnimalsClient from './animals-client';
import { Suspense } from 'react';

export default async function AnimalsPage() {
  // Initialize data stores on app startup
  await initializeDataStores();
  
  // Get initial data for fallback (in case client-side loading fails)
  const animals = await getAnimals();
  const species = await getSpecies();
  const carers = await getCarers();
  
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AnimalsClient initialAnimals={animals} species={species} carers={carers} />
    </Suspense>
  );
} 