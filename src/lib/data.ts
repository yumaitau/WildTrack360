import type { Animal, Record, Photo, Asset } from './types';

const animals: Animal[] = [
  {
    id: 'wombat-warren',
    name: 'Warren',
    species: 'Wombat',
    photo: 'https://placehold.co/600x400.png',
    status: 'In Care',
    dateFound: '2023-10-15',
    carer: 'Jane Doe',
  },
  {
    id: 'koala-kylie',
    name: 'Kylie',
    species: 'Koala',
    photo: 'https://placehold.co/600x400.png',
    status: 'Released',
    dateFound: '2023-11-01',
    carer: 'John Smith',
  },
  {
    id: 'kangaroo-kevin',
    name: 'Kevin',
    species: 'Kangaroo',
    photo: 'https://placehold.co/600x400.png',
    status: 'Released',
    dateFound: '2023-09-20',
    carer: 'Jane Doe',
  },
  {
    id: 'kookaburra-katie',
    name: 'Katie',
    species: 'Kookaburra',
    photo: 'https://placehold.co/600x400.png',
    status: 'In Care',
    dateFound: '2024-01-05',
    carer: 'Peter Jones',
  },
  {
    id: 'possum-penny',
    name: 'Penny',
    species: 'Possum',
    photo: 'https://placehold.co/600x400.png',
    status: 'In Care',
    dateFound: '2024-02-12',
    carer: 'Susan Williams',
  },
  {
    id: 'echidna-eddie',
    name: 'Eddie',
    species: 'Echidna',
    photo: 'https://placehold.co/600x400.png',
    status: 'Deceased',
    dateFound: '2023-12-25',
    carer: 'John Smith',
  },
    {
    id: 'turtle-tina',
    name: 'Tina',
    species: 'Turtle',
    photo: 'https://placehold.co/600x400.png',
    status: 'In Care',
    dateFound: '2024-03-10',
    carer: 'Jane Doe',
  },
  {
    id: 'koala-kimmy',
    name: 'Kimmy',
    species: 'Koala',
    photo: 'https://placehold.co/600x400.png',
    status: 'In Care',
    dateFound: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString().split('T')[0],
    carer: 'John Smith',
  },
  {
    id: 'possum-pete',
    name: 'Pete',
    species: 'Possum',
    photo: 'https://placehold.co/600x400.png',
    status: 'In Care',
    dateFound: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString().split('T')[0],
    carer: 'Susan Williams',
  },
  {
    id: 'wombat-willy',
    name: 'Willy',
    species: 'Wombat',
    photo: 'https://placehold.co/600x400.png',
    status: 'In Care',
    dateFound: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString().split('T')[0],
    carer: 'Jane Doe',
  },
];

const records: Record[] = [
  { id: 'rec-001', animalId: 'koala-kylie', type: 'Health Check', date: '2023-11-02', notes: 'Initial checkup. Mild dehydration and slight burns on paws. Administered fluids.' },
  { id: 'rec-002', animalId: 'koala-kylie', type: 'Feeding', date: '2023-11-03', notes: 'Started on a diet of fresh eucalyptus leaves. Eating well.' },
  { id: 'rec-003', animalId: 'koala-kylie', type: 'Growth', date: '2023-11-15', notes: 'Weight gain of 200g. Good progress.', details: { weight: '2.2kg' } },
  { id: 'rec-004', animalId: 'koala-kylie', type: 'Health Check', date: '2023-12-01', notes: 'Paws healing nicely. Burn ointment applied. Appears more active.' },
  { id: 'rec-005', animalId: 'koala-kylie', type: 'Release', date: '2024-01-20', notes: 'Released back into a protected habitat. Fitted with a temporary tracker.' },
  { id: 'rec-010', animalId: 'koala-kylie', type: 'Sighting', date: '2024-02-10', notes: 'Sighting reported by a member of the public. Animal appeared healthy and active in its natural habitat.' },
  { id: 'rec-006', animalId: 'wombat-warren', type: 'Health Check', date: '2023-10-16', notes: 'Suffering from mange. Started treatment course.' },
  { id: 'rec-007', animalId: 'wombat-warren', type: 'Feeding', date: '2023-10-17', notes: 'Eating a mix of grasses and supplements.' },
  { id: 'rec-008', animalId: 'kangaroo-kevin', type: 'Release', date: '2023-11-05', notes: 'Successfully released after leg injury healed.' },
  { id: 'rec-009', animalId: 'turtle-tina', type: 'Health Check', date: '2024-03-11', notes: 'Shell has a minor crack. Cleaned and sealed.' },
];

const photos: Photo[] = [
    { id: 'photo-001', animalId: 'koala-kylie', url: 'https://placehold.co/800x600.png', date: '2023-11-02', description: 'Kylie upon arrival, showing burns on paws.'},
    { id: 'photo-002', animalId: 'koala-kylie', url: 'https://placehold.co/800x600.png', date: '2023-12-01', description: 'Showing significant healing on paws.'},
    { id: 'photo-003', animalId: 'koala-kylie', url: 'https://placehold.co/800x600.png', date: '2024-01-18', description: 'Healthy and alert, just before release.'},
    { id: 'photo-004', animalId: 'wombat-warren', url: 'https://placehold.co/800x600.png', date: '2023-10-16', description: 'Initial photo showing effects of mange.'},
    { id: 'photo-005', animalId: 'turtle-tina', url: 'https://placehold.co/800x600.png', date: '2024-03-11', description: 'Close-up of the crack on Tina\'s shell.'},
];

const assets: Asset[] = [
    { id: 'cage-01', name: 'Large Mammal Cage', type: 'Cage', status: 'Available' },
    { id: 'cage-02', name: 'Reptile Terrarium', type: 'Cage', status: 'In Use' },
    { id: 'tracker-01', name: 'GPS Tracker #A45', type: 'Tracker', status: 'In Use' },
    { id: 'tracker-02', name: 'GPS Tracker #A46', type: 'Tracker', status: 'Available' },
    { id: 'equip-01', name: 'Incubator', type: 'Equipment', status: 'Maintenance' },
    { id: 'dataset-01', name: 'Koala Population Data 2023', type: 'Dataset', status: 'Available' },
]


export const getAnimals = async (): Promise<Animal[]> => {
  return animals.sort((a,b) => new Date(b.dateFound).getTime() - new Date(a.dateFound).getTime());
};

export const getAnimalById = async (id: string): Promise<Animal | undefined> => {
  return animals.find((animal) => animal.id === id);
};

export const getRecordsByAnimalId = async (animalId: string): Promise<Record[]> => {
    return records.filter((record) => record.animalId === animalId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getPhotosByAnimalId = async (animalId: string): Promise<Photo[]> => {
    return photos.filter((photo) => photo.animalId === animalId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getSpecies = async (): Promise<string[]> => {
    return [...new Set(animals.map(a => a.species))].sort();
}

export const getCarers = async (): Promise<string[]> => {
    return [...new Set(animals.map(a => a.carer))].sort();
}

export const getAssets = async (): Promise<Asset[]> => {
    return assets.sort((a,b) => a.name.localeCompare(b.name));
}
