import { getAnimals, getCarers, getSpecies } from '@/lib/data';
import HomeClient from './home-client';
import { Suspense } from 'react';

export default async function Home() {
  const animals = await getAnimals();
  const species = await getSpecies();
  const carers = await getCarers();
  
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeClient initialAnimals={animals} species={species} carers={carers} />
    </Suspense>
  );
}
