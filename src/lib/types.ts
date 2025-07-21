
export type AnimalStatus = 'In Care' | 'Released' | 'Deceased' | 'Transferred';

export type Sex = 'Male' | 'Female' | 'Unknown';
export type AgeClass = 'Neonate' | 'Juvenile' | 'Adult' | 'Unknown';
export type ReleaseType = 'Hard' | 'Soft' | 'Passive';
export type IncidentType = 'Escape' | 'Injury' | 'Disease Outbreak' | 'Improper Handling';

export type Animal = {
  id: string;
  name: string;
  species: string;
  photo: string;
  status: AnimalStatus;
  dateFound: string;
  carer: string;
  // ACT Compliance fields
  animalId: string; // UUID
  sex: Sex;
  ageClass: AgeClass;
  rescueLocation: string;
  rescueCoordinates?: { lat: number; lng: number };
  rescueDate: string;
  reasonForAdmission: string;
  carerId: string;
  finalOutcome?: string;
  outcomeDate?: string;
  notes?: string;
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

// ACT Compliance Types

export type User = {
  id: string;
  fullName: string;
  email: string;
  jurisdiction: 'ACT' | 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'NT';
  licenceNumber?: string;
  licenceExpiry?: string;
  authorisedSpecies: string[];
  trainingHistory: TrainingRecord[];
  role: 'Carer' | 'Coordinator' | 'Vet' | 'Admin';
};

export type TrainingRecord = {
  id: string;
  courseName: string;
  date: string;
  provider: string;
  expiryDate?: string;
  certificateUrl?: string;
};

export type ReleaseChecklist = {
  id: string;
  animalId: string;
  releaseDate: string;
  releaseLocation: string;
  releaseCoordinates?: { lat: number; lng: number };
  within10km: boolean;
  fitnessIndicators: string[];
  releaseType: ReleaseType;
  vetSignOff: {
    name: string;
    signature: string;
    date: string;
  };
  photos: string[];
  notes?: string;
};

export type HygieneLog = {
  id: string;
  carerId: string;
  date: string;
  enclosureCleaned: boolean;
  ppeUsed: boolean;
  handwashAvailable: boolean;
  feedingBowlsDisinfected: boolean;
  quarantineSignsPresent: boolean;
  notes?: string;
  photos?: string[];
};

export type IncidentReport = {
  id: string;
  animalId?: string;
  type: IncidentType;
  date: string;
  description: string;
  personInvolved: string;
  actionTaken: string;
  reportedTo?: string;
  attachments?: string[];
  notes?: string;
};

// Jurisdiction Configuration
export type JurisdictionConfig = {
  enabledForms: string[];
  templates: string[];
  enforceReleaseDistance: boolean;
  requireVetSignOff: boolean;
  maxRetentionYears: number;
};

// Jurisdiction configuration is now handled by src/lib/config.ts
// This allows for environment-based configuration per organization
