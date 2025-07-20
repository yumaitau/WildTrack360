
export type AnimalStatus = 'In Care' | 'Released' | 'Deceased';

export type Animal = {
  id: string;
  name: string;
  species: string;
  photo: string;
  status: AnimalStatus;
  dateFound: string;
  carer: string;
};

export const recordTypes = ['Health Check', 'Growth', 'Feeding', 'Sighting', 'Release', 'General'] as const;
export type RecordType = typeof recordTypes[number];

export type Record = {
  id: string;
  animalId: string;
  type: RecordType;
  date: string;
  notes: string;
  details?: { [key: string]: string | number };
};

export type Photo = {
  id: string;
  animalId: string;
  url: string;
  date: string;
  description: string;
};

export type AssetStatus = 'Available' | 'In Use' | 'Maintenance';
export const assetTypes = ['Equipment', 'Cage', 'Tracker', 'Dataset', 'Other'] as const;
export type AssetType = typeof assetTypes[number];


export type Asset = {
    id: string;
    name: string;
    type: AssetType;
    status: AssetStatus;
}
