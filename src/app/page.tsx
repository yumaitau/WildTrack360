import { getAnimals, getCarers, getSpecies, initializeDataStores, fixReleasedAnimalsWithoutOutcomeDate } from '@/lib/data-store';
import HomeClient from './home-client';
import { Suspense } from 'react';

export default async function Home() {
  // Initialize data stores on app startup
  await initializeDataStores();
  
  // Fix any released animals without outcomeDate
  await fixReleasedAnimalsWithoutOutcomeDate();
  
  // Get initial data for fallback (in case client-side loading fails)
  const animals = await getAnimals();
  const species = await getSpecies();
  const carers = await getCarers();
  
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeClient initialAnimals={animals} species={species} carers={carers} />
    </Suspense>
  );
}
