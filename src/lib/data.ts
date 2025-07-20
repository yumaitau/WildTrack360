import type { Animal, Record, Photo, Asset, User, ReleaseChecklist, HygieneLog, IncidentReport, TrainingRecord } from './types';

const animals: Animal[] = [
  {
    id: 'wombat-warren',
    name: 'Warren',
    species: 'Wombat',
    photo: 'https://placehold.co/600x400.png',
    status: 'In Care',
    dateFound: '2023-10-15',
    carer: 'Jane Doe',
    // ACT Compliance fields
    animalId: 'uuid-wombat-warren-001',
    sex: 'Male',
    ageClass: 'Adult',
    rescueLocation: 'Tidbinbilla Nature Reserve, ACT',
    rescueCoordinates: { lat: -35.4592, lng: 148.9274 },
    rescueDate: '2023-10-15',
    reasonForAdmission: 'Vehicle strike, suspected internal injuries',
    carerId: 'user-jane-doe',
    notes: 'Responding well to treatment, eating normally',
  },
  {
    id: 'koala-kylie',
    name: 'Kylie',
    species: 'Koala',
    photo: 'https://placehold.co/600x400.png',
    status: 'Released',
    dateFound: '2023-11-01',
    carer: 'John Smith',
    // ACT Compliance fields
    animalId: 'uuid-koala-kylie-002',
    sex: 'Female',
    ageClass: 'Juvenile',
    rescueLocation: 'Mount Majura Nature Reserve, ACT',
    rescueCoordinates: { lat: -35.2189, lng: 149.1619 },
    rescueDate: '2023-11-01',
    reasonForAdmission: 'Orphaned joey, mother deceased',
    carerId: 'user-john-smith',
    finalOutcome: 'Successfully released',
    outcomeDate: '2024-01-20',
    notes: 'Reached appropriate weight and independence for release',
  },
  {
    id: 'kangaroo-kevin',
    name: 'Kevin',
    species: 'Kangaroo',
    photo: 'https://placehold.co/600x400.png',
    status: 'Released',
    dateFound: '2023-09-20',
    carer: 'Jane Doe',
    // ACT Compliance fields
    animalId: 'uuid-kangaroo-kevin-003',
    sex: 'Male',
    ageClass: 'Adult',
    rescueLocation: 'Molonglo River Reserve, ACT',
    rescueCoordinates: { lat: -35.2809, lng: 149.0099 },
    rescueDate: '2023-09-20',
    reasonForAdmission: 'Leg injury, unable to hop properly',
    carerId: 'user-jane-doe',
    finalOutcome: 'Successfully released',
    outcomeDate: '2023-11-05',
    notes: 'Leg fully healed, strong and healthy',
  },
  {
    id: 'kookaburra-katie',
    name: 'Katie',
    species: 'Kookaburra',
    photo: 'https://placehold.co/600x400.png',
    status: 'In Care',
    dateFound: '2024-01-05',
    carer: 'Peter Jones',
    // ACT Compliance fields
    animalId: 'uuid-kookaburra-katie-004',
    sex: 'Female',
    ageClass: 'Adult',
    rescueLocation: 'Jerrabomberra Wetlands, ACT',
    rescueCoordinates: { lat: -35.3189, lng: 149.1499 },
    rescueDate: '2024-01-05',
    reasonForAdmission: 'Wing injury, unable to fly',
    carerId: 'user-peter-jones',
    notes: 'Wing healing well, starting flight training',
  },
  {
    id: 'possum-penny',
    name: 'Penny',
    species: 'Possum',
    photo: 'https://placehold.co/600x400.png',
    status: 'In Care',
    dateFound: '2024-02-12',
    carer: 'Susan Williams',
    // ACT Compliance fields
    animalId: 'uuid-possum-penny-005',
    sex: 'Female',
    ageClass: 'Juvenile',
    rescueLocation: 'Aranda Bushland, ACT',
    rescueCoordinates: { lat: -35.2189, lng: 149.0819 },
    rescueDate: '2024-02-12',
    reasonForAdmission: 'Orphaned, found alone',
    carerId: 'user-susan-williams',
    notes: 'Growing well, starting to eat solid food',
  },
  {
    id: 'echidna-eddie',
    name: 'Eddie',
    species: 'Echidna',
    photo: 'https://placehold.co/600x400.png',
    status: 'Deceased',
    dateFound: '2023-12-25',
    carer: 'John Smith',
    // ACT Compliance fields
    animalId: 'uuid-echidna-eddie-006',
    sex: 'Male',
    ageClass: 'Adult',
    rescueLocation: 'Black Mountain Nature Reserve, ACT',
    rescueCoordinates: { lat: -35.2689, lng: 149.1019 },
    rescueDate: '2023-12-25',
    reasonForAdmission: 'Severe injuries from dog attack',
    carerId: 'user-john-smith',
    finalOutcome: 'Euthanized due to severe injuries',
    outcomeDate: '2023-12-26',
    notes: 'Injuries too severe for recovery',
  },
  {
    id: 'turtle-tina',
    name: 'Tina',
    species: 'Turtle',
    photo: 'https://placehold.co/600x400.png',
    status: 'In Care',
    dateFound: '2024-03-10',
    carer: 'Jane Doe',
    // ACT Compliance fields
    animalId: 'uuid-turtle-tina-007',
    sex: 'Female',
    ageClass: 'Adult',
    rescueLocation: 'Lake Burley Griffin, ACT',
    rescueCoordinates: { lat: -35.2989, lng: 149.1299 },
    rescueDate: '2024-03-10',
    reasonForAdmission: 'Shell damage from boat strike',
    carerId: 'user-jane-doe',
    notes: 'Shell healing well, swimming normally',
  },
  {
    id: 'koala-kimmy',
    name: 'Kimmy',
    species: 'Koala',
    photo: 'https://placehold.co/600x400.png',
    status: 'In Care',
    dateFound: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString().split('T')[0],
    carer: 'John Smith',
    // ACT Compliance fields
    animalId: 'uuid-koala-kimmy-008',
    sex: 'Male',
    ageClass: 'Neonate',
    rescueLocation: 'Namadgi National Park, ACT',
    rescueCoordinates: { lat: -35.6689, lng: 148.9499 },
    rescueDate: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString().split('T')[0],
    reasonForAdmission: 'Orphaned joey, mother hit by car',
    carerId: 'user-john-smith',
    notes: 'Very young, requires 24/7 care',
  },
  {
    id: 'possum-pete',
    name: 'Pete',
    species: 'Possum',
    photo: 'https://placehold.co/600x400.png',
    status: 'In Care',
    dateFound: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString().split('T')[0],
    carer: 'Susan Williams',
    // ACT Compliance fields
    animalId: 'uuid-possum-pete-009',
    sex: 'Male',
    ageClass: 'Juvenile',
    rescueLocation: 'Mount Ainslie Nature Reserve, ACT',
    rescueCoordinates: { lat: -35.2689, lng: 149.1619 },
    rescueDate: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString().split('T')[0],
    reasonForAdmission: 'Found alone, mother not returning',
    carerId: 'user-susan-williams',
    notes: 'Eating well, gaining weight',
  },
  {
    id: 'wombat-willy',
    name: 'Willy',
    species: 'Wombat',
    photo: 'https://placehold.co/600x400.png',
    status: 'In Care',
    dateFound: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString().split('T')[0],
    carer: 'Jane Doe',
    // ACT Compliance fields
    animalId: 'uuid-wombat-willy-010',
    sex: 'Male',
    ageClass: 'Adult',
    rescueLocation: 'Pine Island Reserve, ACT',
    rescueCoordinates: { lat: -35.3189, lng: 149.0899 },
    rescueDate: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString().split('T')[0],
    reasonForAdmission: 'Mange infestation, severe skin condition',
    carerId: 'user-jane-doe',
    notes: 'Responding well to treatment, mange clearing',
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

const users: User[] = [
  {
    id: 'user-jane-doe',
    fullName: 'Jane Doe',
    email: 'jane.doe@wildhub.act.gov.au',
    jurisdiction: 'ACT',
    licenceNumber: 'ACT-WC-2023-001',
    licenceExpiry: '2025-12-31',
    authorisedSpecies: ['Wombat', 'Kangaroo', 'Turtle', 'Echidna'],
    trainingHistory: [
      {
        id: 'train-001',
        courseName: 'Wildlife Carer Foundation Course',
        date: '2023-01-15',
        provider: 'ACT Wildlife',
        expiryDate: '2026-01-15',
        certificateUrl: 'https://example.com/cert1.pdf',
      },
      {
        id: 'train-002',
        courseName: 'Wombat Care Specialist',
        date: '2023-03-20',
        provider: 'Wildlife Health Australia',
        expiryDate: '2025-03-20',
        certificateUrl: 'https://example.com/cert2.pdf',
      },
    ],
    role: 'Carer',
  },
  {
    id: 'user-john-smith',
    fullName: 'John Smith',
    email: 'john.smith@wildhub.act.gov.au',
    jurisdiction: 'ACT',
    licenceNumber: 'ACT-WC-2023-002',
    licenceExpiry: '2024-06-30',
    authorisedSpecies: ['Koala', 'Echidna', 'Possum'],
    trainingHistory: [
      {
        id: 'train-003',
        courseName: 'Wildlife Carer Foundation Course',
        date: '2023-02-10',
        provider: 'ACT Wildlife',
        expiryDate: '2026-02-10',
        certificateUrl: 'https://example.com/cert3.pdf',
      },
      {
        id: 'train-004',
        courseName: 'Koala Care Advanced',
        date: '2023-05-15',
        provider: 'Australian Koala Foundation',
        expiryDate: '2025-05-15',
        certificateUrl: 'https://example.com/cert4.pdf',
      },
    ],
    role: 'Carer',
  },
  {
    id: 'user-peter-jones',
    fullName: 'Peter Jones',
    email: 'peter.jones@wildhub.act.gov.au',
    jurisdiction: 'ACT',
    licenceNumber: 'ACT-WC-2023-003',
    licenceExpiry: '2025-09-15',
    authorisedSpecies: ['Kookaburra', 'Other Birds'],
    trainingHistory: [
      {
        id: 'train-005',
        courseName: 'Wildlife Carer Foundation Course',
        date: '2023-04-05',
        provider: 'ACT Wildlife',
        expiryDate: '2026-04-05',
        certificateUrl: 'https://example.com/cert5.pdf',
      },
      {
        id: 'train-006',
        courseName: 'Bird Care Specialist',
        date: '2023-07-20',
        provider: 'BirdLife Australia',
        expiryDate: '2025-07-20',
        certificateUrl: 'https://example.com/cert6.pdf',
      },
    ],
    role: 'Carer',
  },
  {
    id: 'user-susan-williams',
    fullName: 'Susan Williams',
    email: 'susan.williams@wildhub.act.gov.au',
    jurisdiction: 'ACT',
    licenceNumber: 'ACT-WC-2023-004',
    licenceExpiry: '2025-03-20',
    authorisedSpecies: ['Possum', 'Glider'],
    trainingHistory: [
      {
        id: 'train-007',
        courseName: 'Wildlife Carer Foundation Course',
        date: '2023-06-12',
        provider: 'ACT Wildlife',
        expiryDate: '2026-06-12',
        certificateUrl: 'https://example.com/cert7.pdf',
      },
    ],
    role: 'Carer',
  },
  {
    id: 'user-dr-brown',
    fullName: 'Dr. Sarah Brown',
    email: 'sarah.brown@wildhub.act.gov.au',
    jurisdiction: 'ACT',
    licenceNumber: 'ACT-VET-2023-001',
    licenceExpiry: '2025-12-31',
    authorisedSpecies: ['All Species'],
    trainingHistory: [
      {
        id: 'train-008',
        courseName: 'Veterinary Medicine',
        date: '2018-12-01',
        provider: 'University of Sydney',
        certificateUrl: 'https://example.com/cert8.pdf',
      },
      {
        id: 'train-009',
        courseName: 'Wildlife Medicine Specialist',
        date: '2020-03-15',
        provider: 'Australian Wildlife Health Network',
        expiryDate: '2025-03-15',
        certificateUrl: 'https://example.com/cert9.pdf',
      },
    ],
    role: 'Vet',
  },
  {
    id: 'user-coordinator',
    fullName: 'Michael Johnson',
    email: 'michael.johnson@wildhub.act.gov.au',
    jurisdiction: 'ACT',
    licenceNumber: 'ACT-COORD-2023-001',
    licenceExpiry: '2025-12-31',
    authorisedSpecies: ['All Species'],
    trainingHistory: [
      {
        id: 'train-010',
        courseName: 'Wildlife Coordination Management',
        date: '2022-08-20',
        provider: 'ACT Wildlife',
        expiryDate: '2025-08-20',
        certificateUrl: 'https://example.com/cert10.pdf',
      },
    ],
    role: 'Coordinator',
  },
];

const releaseChecklists: ReleaseChecklist[] = [
  {
    id: 'release-001',
    animalId: 'uuid-koala-kylie-002',
    releaseDate: '2024-01-20',
    releaseLocation: 'Mount Majura Nature Reserve, ACT',
    releaseCoordinates: { lat: -35.2189, lng: 149.1619 },
    within10km: true,
    fitnessIndicators: ['Normal weight', 'Avoids humans', 'Good coordination', 'Forages independently'],
    releaseType: 'Soft',
    vetSignOff: {
      name: 'Dr. Sarah Brown',
      signature: 'Dr. S. Brown',
      date: '2024-01-19',
    },
    photos: ['https://placehold.co/800x600.png', 'https://placehold.co/800x600.png'],
    notes: 'Juvenile koala ready for release. Soft release with monitoring for 2 weeks.',
  },
  {
    id: 'release-002',
    animalId: 'uuid-kangaroo-kevin-003',
    releaseDate: '2023-11-05',
    releaseLocation: 'Molonglo River Reserve, ACT',
    releaseCoordinates: { lat: -35.2809, lng: 149.0099 },
    within10km: true,
    fitnessIndicators: ['Normal weight', 'Good coordination'],
    releaseType: 'Hard',
    vetSignOff: {
      name: 'Dr. Sarah Brown',
      signature: 'Dr. S. Brown',
      date: '2023-11-04',
    },
    photos: ['https://placehold.co/800x600.png'],
    notes: 'Adult kangaroo fully recovered from leg injury.',
  },
];

const hygieneLogs: HygieneLog[] = [
  {
    id: 'hygiene-001',
    carerId: 'user-jane-doe',
    date: new Date().toISOString().split('T')[0],
    enclosureCleaned: true,
    ppeUsed: true,
    handwashAvailable: true,
    feedingBowlsDisinfected: true,
    quarantineSignsPresent: true,
    notes: 'All enclosures cleaned and disinfected. New animals in quarantine area.',
  },
  {
    id: 'hygiene-002',
    carerId: 'user-john-smith',
    date: new Date().toISOString().split('T')[0],
    enclosureCleaned: true,
    ppeUsed: true,
    handwashAvailable: true,
    feedingBowlsDisinfected: true,
    quarantineSignsPresent: true,
    notes: 'Routine daily cleaning completed.',
  },
  {
    id: 'hygiene-003',
    carerId: 'user-peter-jones',
    date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0],
    enclosureCleaned: true,
    ppeUsed: true,
    handwashAvailable: true,
    feedingBowlsDisinfected: true,
    quarantineSignsPresent: false,
    notes: 'Standard cleaning routine.',
  },
];

const incidentReports: IncidentReport[] = [
  {
    id: 'incident-001',
    animalId: 'uuid-echidna-eddie-006',
    type: 'Injury',
    date: '2023-12-25',
    description: 'Echidna found with severe injuries consistent with dog attack. Multiple puncture wounds and internal trauma.',
    personInvolved: 'John Smith',
    actionTaken: 'Immediate veterinary assessment. Euthanasia recommended due to severity of injuries.',
    reportedTo: 'ACT Wildlife Authority',
    notes: 'Incident reported to local council for investigation of loose dogs.',
  },
  {
    id: 'incident-002',
    type: 'Disease Outbreak',
    date: '2024-02-15',
    description: 'Suspected outbreak of mange in wombat population at Tidbinbilla Reserve.',
    personInvolved: 'Jane Doe',
    actionTaken: 'Quarantine protocols implemented. All new admissions screened for mange.',
    reportedTo: 'ACT Wildlife Authority',
    notes: 'Monitoring ongoing. No new cases in past week.',
  },
  {
    id: 'incident-003',
    animalId: 'uuid-koala-kimmy-008',
    type: 'Improper Handling',
    date: '2024-03-20',
    description: 'Member of public attempted to handle orphaned koala joey without proper training.',
    personInvolved: 'Public Member',
    actionTaken: 'Public educated on proper procedures. Koala assessed by vet - no injuries sustained.',
    reportedTo: 'ACT Wildlife Authority',
    notes: 'Educational materials distributed to local community.',
  },
];


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

export const getUsers = async (): Promise<User[]> => {
  return users.sort((a, b) => a.fullName.localeCompare(b.fullName));
};

export const getUserById = async (id: string): Promise<User | undefined> => {
  return users.find((user) => user.id === id);
};

export const getUsersByRole = async (role: string): Promise<User[]> => {
  return users.filter((user) => user.role === role);
};

export const getReleaseChecklists = async (): Promise<ReleaseChecklist[]> => {
  return releaseChecklists.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
};

export const getReleaseChecklistByAnimalId = async (animalId: string): Promise<ReleaseChecklist | undefined> => {
  return releaseChecklists.find((checklist) => checklist.animalId === animalId);
};

export const getHygieneLogs = async (): Promise<HygieneLog[]> => {
  return hygieneLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getHygieneLogsByCarerId = async (carerId: string): Promise<HygieneLog[]> => {
  return hygieneLogs.filter((log) => log.carerId === carerId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getIncidentReports = async (): Promise<IncidentReport[]> => {
  return incidentReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getIncidentReportById = async (id: string): Promise<IncidentReport | undefined> => {
  return incidentReports.find((incident) => incident.id === id);
};
