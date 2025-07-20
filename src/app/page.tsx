import { getAnimals, getCarers, getSpecies } from '@/lib/data';
import HomeClient from './home-client';

export default async function Home() {
  const animals = await getAnimals();
  const species = await getSpecies();
  const carers = await getCarers();
  
  return <HomeClient initialAnimals={animals} species={species} carers={carers} />;
}
