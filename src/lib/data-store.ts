import type { Animal, Record, Photo, Asset, User, ReleaseChecklist, HygieneLog, IncidentReport } from './types';

// Mock data imports
import { animals as mockAnimals, records as mockRecords, photos as mockPhotos, assets as mockAssets, users as mockUsers } from './data';

// Storage keys
const STORAGE_KEYS = {
  ANIMALS: 'wildtrack360-animals',
  RECORDS: 'wildtrack360-records',
  PHOTOS: 'wildtrack360-photos',
  ASSETS: 'wildtrack360-assets',
  USERS: 'wildtrack360-users',
  RELEASE_CHECKLISTS: 'wildtrack360-release-checklists',
  HYGIENE_LOGS: 'wildtrack360-hygiene-logs',
  INCIDENT_REPORTS: 'wildtrack360-incident-reports',
} as const;

// Base interface for all entities
interface BaseEntity {
  id: string;
}

// Generic CRUD operations interface
interface DataStore<T extends BaseEntity> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | undefined>;
  create(item: T): Promise<T>;
  update(id: string, updates: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  syncWithMock(mockData: T[]): Promise<void>;
}

// Implementation for localStorage-based data store
class LocalStorageDataStore<T extends BaseEntity> implements DataStore<T> {
  private storageKey: string;
  private mockData: T[];

  constructor(storageKey: string, mockData: T[]) {
    this.storageKey = storageKey;
    this.mockData = mockData;
  }

  private getStorageData(): T[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error(`Error reading from ${this.storageKey}:`, error);
      return [];
    }
  }

  private setStorageData(data: T[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error(`Error writing to ${this.storageKey}:`, error);
    }
  }

  async getAll(): Promise<T[]> {
    const data = this.getStorageData();
    if (data.length === 0) {
      // Initialize with mock data if empty
      await this.syncWithMock(this.mockData);
      return this.mockData;
    }
    return data;
  }

  async getById(id: string): Promise<T | undefined> {
    const data = await this.getAll();
    return data.find(item => item.id === id);
  }

  async create(item: T): Promise<T> {
    const data = await this.getAll();
    const newData = [item, ...data];
    this.setStorageData(newData);
    console.log(`Created ${this.storageKey} item:`, item.id);
    return item;
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    const data = await this.getAll();
    const index = data.findIndex(item => item.id === id);
    
    if (index === -1) {
      throw new Error(`Item with id ${id} not found`);
    }

    const updatedItem = { ...data[index], ...updates };
    data[index] = updatedItem;
    this.setStorageData(data);
    
    console.log(`Updated ${this.storageKey} item:`, id);
    return updatedItem;
  }

  async delete(id: string): Promise<boolean> {
    const data = await this.getAll();
    const filteredData = data.filter(item => item.id !== id);
    
    if (filteredData.length === data.length) {
      return false; // Item not found
    }

    this.setStorageData(filteredData);
    console.log(`Deleted ${this.storageKey} item:`, id);
    return true;
  }

  async syncWithMock(mockData: T[]): Promise<void> {
    const existingData = this.getStorageData();
    const existingIds = new Set(existingData.map(item => item.id));
    const missingItems = mockData.filter(item => !existingIds.has(item.id));
    
    if (missingItems.length > 0) {
      console.log(`Syncing ${missingItems.length} missing items to ${this.storageKey}`);
      const updatedData = [...existingData, ...missingItems];
      this.setStorageData(updatedData);
    }
  }

  // Specialized methods for specific entity types
  async getByAnimalId?(animalId: string): Promise<T[]>;
  async getByCarerId?(carerId: string): Promise<T[]>;
  async getByRole?(role: string): Promise<T[]>;
}

// Animal-specific data store with additional methods
class AnimalDataStore extends LocalStorageDataStore<Animal> {
  constructor() {
    super(STORAGE_KEYS.ANIMALS, mockAnimals);
  }

  async getByStatus(status: Animal['status']): Promise<Animal[]> {
    const animals = await this.getAll();
    return animals.filter(animal => animal.status === status);
  }

  async getBySpecies(species: string): Promise<Animal[]> {
    const animals = await this.getAll();
    return animals.filter(animal => animal.species === species);
  }

  async getByCarer(carer: string): Promise<Animal[]> {
    const animals = await this.getAll();
    return animals.filter(animal => animal.carer === carer);
  }

  async getRecentlyAdmitted(days: number = 7): Promise<Animal[]> {
    const animals = await this.getAll();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return animals.filter(animal => new Date(animal.dateFound) >= cutoffDate);
  }

  async getReleasedInPeriod(startDate: Date, endDate: Date): Promise<Animal[]> {
    const animals = await this.getAll();
    return animals.filter(animal => {
      if (animal.status !== 'Released' || !animal.outcomeDate) return false;
      const releaseDate = new Date(animal.outcomeDate);
      return releaseDate >= startDate && releaseDate <= endDate;
    });
  }
}

// Record-specific data store
class RecordDataStore extends LocalStorageDataStore<Record> {
  constructor() {
    super(STORAGE_KEYS.RECORDS, mockRecords);
  }

  async getByAnimalId(animalId: string): Promise<Record[]> {
    const records = await this.getAll();
    return records
      .filter(record => record.animalId === animalId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getByType(type: Record['type']): Promise<Record[]> {
    const records = await this.getAll();
    return records.filter(record => record.type === type);
  }

  async getReleaseRecords(): Promise<Record[]> {
    return this.getByType('Release');
  }
}

// Photo-specific data store
class PhotoDataStore extends LocalStorageDataStore<Photo> {
  constructor() {
    super(STORAGE_KEYS.PHOTOS, mockPhotos);
  }

  async getByAnimalId(animalId: string): Promise<Photo[]> {
    const photos = await this.getAll();
    return photos
      .filter(photo => photo.animalId === animalId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}

// User-specific data store
class UserDataStore extends LocalStorageDataStore<User> {
  constructor() {
    super(STORAGE_KEYS.USERS, mockUsers);
  }

  async getByRole(role: User['role']): Promise<User[]> {
    const users = await this.getAll();
    return users.filter(user => user.role === role);
  }

  async getByJurisdiction(jurisdiction: User['jurisdiction']): Promise<User[]> {
    const users = await this.getAll();
    return users.filter(user => user.jurisdiction === jurisdiction);
  }
}

// Asset-specific data store
class AssetDataStore extends LocalStorageDataStore<Asset> {
  constructor() {
    super(STORAGE_KEYS.ASSETS, mockAssets);
  }

  async getByType(type: Asset['type']): Promise<Asset[]> {
    const assets = await this.getAll();
    return assets.filter(asset => asset.type === type);
  }

  async getByStatus(status: Asset['status']): Promise<Asset[]> {
    const assets = await this.getAll();
    return assets.filter(asset => asset.status === status);
  }
}

// Main data store instance
export const dataStore = {
  animals: new AnimalDataStore(),
  records: new RecordDataStore(),
  photos: new PhotoDataStore(),
  users: new UserDataStore(),
  assets: new AssetDataStore(),
  // Add other stores as needed
  releaseChecklists: new LocalStorageDataStore<ReleaseChecklist>(STORAGE_KEYS.RELEASE_CHECKLISTS, []),
  hygieneLogs: new LocalStorageDataStore<HygieneLog>(STORAGE_KEYS.HYGIENE_LOGS, []),
  incidentReports: new LocalStorageDataStore<IncidentReport>(STORAGE_KEYS.INCIDENT_REPORTS, []),
};

// Convenience functions for backward compatibility
export const getAnimals = () => dataStore.animals.getAll();
export const getAnimalById = (id: string) => dataStore.animals.getById(id);
export const createAnimal = (animal: Animal) => dataStore.animals.create(animal);
export const updateAnimal = (id: string, updates: Partial<Animal>) => dataStore.animals.update(id, updates);
export const deleteAnimal = (id: string) => dataStore.animals.delete(id);

export const getRecords = () => dataStore.records.getAll();
export const getRecordsByAnimalId = (animalId: string) => dataStore.records.getByAnimalId(animalId);
export const createRecord = (record: Record) => dataStore.records.create(record);
export const updateRecord = (id: string, updates: Partial<Record>) => dataStore.records.update(id, updates);
export const deleteRecord = (id: string) => dataStore.records.delete(id);

export const getPhotos = () => dataStore.photos.getAll();
export const getPhotosByAnimalId = (animalId: string) => dataStore.photos.getByAnimalId(animalId);
export const createPhoto = (photo: Photo) => dataStore.photos.create(photo);
export const updatePhoto = (id: string, updates: Partial<Photo>) => dataStore.photos.update(id, updates);
export const deletePhoto = (id: string) => dataStore.photos.delete(id);

export const getUsers = () => dataStore.users.getAll();
export const getUserById = (id: string) => dataStore.users.getById(id);
export const getUsersByRole = (role: string) => dataStore.users.getByRole(role as any);
export const createUser = (user: User) => dataStore.users.create(user);
export const updateUser = (id: string, updates: Partial<User>) => dataStore.users.update(id, updates);
export const deleteUser = (id: string) => dataStore.users.delete(id);

export const getAssets = () => dataStore.assets.getAll();
export const getAssetById = (id: string) => dataStore.assets.getById(id);
export const createAsset = (asset: Asset) => dataStore.assets.create(asset);
export const updateAsset = (id: string, updates: Partial<Asset>) => dataStore.assets.update(id, updates);
export const deleteAsset = (id: string) => dataStore.assets.delete(id);

// Compliance module functions
export const getReleaseChecklists = () => dataStore.releaseChecklists.getAll();
export const getReleaseChecklistById = (id: string) => dataStore.releaseChecklists.getById(id);
export const createReleaseChecklist = (checklist: ReleaseChecklist) => dataStore.releaseChecklists.create(checklist);
export const updateReleaseChecklist = (id: string, updates: Partial<ReleaseChecklist>) => dataStore.releaseChecklists.update(id, updates);
export const deleteReleaseChecklist = (id: string) => dataStore.releaseChecklists.delete(id);

export const getHygieneLogs = () => dataStore.hygieneLogs.getAll();
export const getHygieneLogById = (id: string) => dataStore.hygieneLogs.getById(id);
export const createHygieneLog = (log: HygieneLog) => dataStore.hygieneLogs.create(log);
export const updateHygieneLog = (id: string, updates: Partial<HygieneLog>) => dataStore.hygieneLogs.update(id, updates);
export const deleteHygieneLog = (id: string) => dataStore.hygieneLogs.delete(id);

export const getIncidentReports = () => dataStore.incidentReports.getAll();
export const getIncidentReportById = (id: string) => dataStore.incidentReports.getById(id);
export const createIncidentReport = (report: IncidentReport) => dataStore.incidentReports.create(report);
export const updateIncidentReport = (id: string, updates: Partial<IncidentReport>) => dataStore.incidentReports.update(id, updates);
export const deleteIncidentReport = (id: string) => dataStore.incidentReports.delete(id);

// Species and Carer management
export const getSpecies = async (): Promise<string[]> => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('wildtrack360-species');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading species from localStorage:', error);
    return [];
  }
};

export const createSpecies = async (species: string): Promise<string> => {
  const existingSpecies = await getSpecies();
  if (existingSpecies.includes(species)) {
    throw new Error(`Species "${species}" already exists`);
  }
  
  const updatedSpecies = [...existingSpecies, species].sort();
  localStorage.setItem('wildtrack360-species', JSON.stringify(updatedSpecies));
  return species;
};

export const updateSpecies = async (oldSpecies: string, newSpecies: string): Promise<string> => {
  const existingSpecies = await getSpecies();
  const index = existingSpecies.indexOf(oldSpecies);
  
  if (index === -1) {
    throw new Error(`Species "${oldSpecies}" not found`);
  }
  
  if (existingSpecies.includes(newSpecies) && oldSpecies !== newSpecies) {
    throw new Error(`Species "${newSpecies}" already exists`);
  }
  
  existingSpecies[index] = newSpecies;
  const updatedSpecies = existingSpecies.sort();
  localStorage.setItem('wildtrack360-species', JSON.stringify(updatedSpecies));
  
  // Update all animals that use this species
  const animals = await dataStore.animals.getAll();
  for (const animal of animals) {
    if (animal.species === oldSpecies) {
      await dataStore.animals.update(animal.id, { species: newSpecies });
    }
  }
  
  return newSpecies;
};

export const deleteSpecies = async (species: string): Promise<boolean> => {
  const existingSpecies = await getSpecies();
  const index = existingSpecies.indexOf(species);
  
  if (index === -1) {
    throw new Error(`Species "${species}" not found`);
  }
  
  // Check if any animals are using this species
  const animals = await dataStore.animals.getAll();
  const animalsUsingSpecies = animals.filter(animal => animal.species === species);
  
  if (animalsUsingSpecies.length > 0) {
    throw new Error(`Cannot delete species "${species}" - ${animalsUsingSpecies.length} animals are using it`);
  }
  
  existingSpecies.splice(index, 1);
  localStorage.setItem('wildtrack360-species', JSON.stringify(existingSpecies));
  return true;
};

export const getCarers = async (): Promise<string[]> => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('wildtrack360-carers');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading carers from localStorage:', error);
    return [];
  }
};

export const createCarer = async (carer: string): Promise<string> => {
  const existingCarers = await getCarers();
  if (existingCarers.includes(carer)) {
    throw new Error(`Carer "${carer}" already exists`);
  }
  
  const updatedCarers = [...existingCarers, carer].sort();
  localStorage.setItem('wildtrack360-carers', JSON.stringify(updatedCarers));
  return carer;
};

export const updateCarer = async (oldCarer: string, newCarer: string): Promise<string> => {
  const existingCarers = await getCarers();
  const index = existingCarers.indexOf(oldCarer);
  
  if (index === -1) {
    throw new Error(`Carer "${oldCarer}" not found`);
  }
  
  if (existingCarers.includes(newCarer) && oldCarer !== newCarer) {
    throw new Error(`Carer "${newCarer}" already exists`);
  }
  
  existingCarers[index] = newCarer;
  const updatedCarers = existingCarers.sort();
  localStorage.setItem('wildtrack360-carers', JSON.stringify(updatedCarers));
  
  // Update all animals that use this carer
  const animals = await dataStore.animals.getAll();
  for (const animal of animals) {
    if (animal.carer === oldCarer) {
      await dataStore.animals.update(animal.id, { carer: newCarer });
    }
  }
  
  return newCarer;
};

export const deleteCarer = async (carer: string): Promise<boolean> => {
  const existingCarers = await getCarers();
  const index = existingCarers.indexOf(carer);
  
  if (index === -1) {
    throw new Error(`Carer "${carer}" not found`);
  }
  
  // Check if any animals are using this carer
  const animals = await dataStore.animals.getAll();
  const animalsUsingCarer = animals.filter(animal => animal.carer === carer);
  
  if (animalsUsingCarer.length > 0) {
    throw new Error(`Cannot delete carer "${carer}" - ${animalsUsingCarer.length} animals are assigned to them`);
  }
  
  existingCarers.splice(index, 1);
  localStorage.setItem('wildtrack360-carers', JSON.stringify(existingCarers));
  return true;
};

// Initialize all stores with mock data
export const initializeDataStores = async (): Promise<void> => {
  console.log('Initializing data stores...');
  
  await Promise.all([
    dataStore.animals.syncWithMock(mockAnimals),
    dataStore.records.syncWithMock(mockRecords),
    dataStore.photos.syncWithMock(mockPhotos),
    dataStore.users.syncWithMock(mockUsers),
    dataStore.assets.syncWithMock(mockAssets),
  ]);
  
  console.log('Data stores initialized successfully');
};

// Clear all data (useful for testing)
export const clearAllData = (): void => {
  if (typeof window === 'undefined') return;
  
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  
  console.log('All data cleared');
};

// Fix released animals without outcomeDate
export const fixReleasedAnimalsWithoutOutcomeDate = async (): Promise<void> => {
  const animals = await dataStore.animals.getAll();
  const releasedWithoutOutcomeDate = animals.filter(animal => 
    animal.status === 'Released' && !animal.outcomeDate
  );
  
  if (releasedWithoutOutcomeDate.length > 0) {
    console.log(`Found ${releasedWithoutOutcomeDate.length} released animals without outcomeDate, fixing...`);
    
    for (const animal of releasedWithoutOutcomeDate) {
      await dataStore.animals.update(animal.id, {
        outcomeDate: new Date().toISOString().split('T')[0] // Today's date
      });
    }
    
    console.log('Fixed released animals without outcomeDate');
  }
}; 