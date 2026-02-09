// Re-export Prisma types for app-wide use
export type { Animal, Record, Photo, Asset, Species, CarerProfile, CarerTraining, HygieneLog, IncidentReport, ReleaseChecklist } from '@prisma/client';
export type AnimalStatus = import('@prisma/client').$Enums.AnimalStatus;
export type AssetStatus = import('@prisma/client').$Enums.AssetStatus;

import type { CarerTraining } from '@prisma/client';

// Enriched carer: Clerk identity + optional CarerProfile domain fields
export interface EnrichedCarer {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
  phone: string | null;
  licenseNumber: string | null;
  licenseExpiry: Date | null;
  jurisdiction: string | null;
  specialties: string[];
  notes: string | null;
  active: boolean;
  streetAddress: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  executivePosition: string | null;
  speciesCoordinatorFor: string | null;
  rehabilitatesKoala: boolean;
  rehabilitatesFlyingFox: boolean;
  rehabilitatesBirdOfPrey: boolean;
  memberSince: Date | null;
  trainingLevel: string | null;
  hasProfile: boolean;
  trainings?: CarerTraining[];
}

// Lightweight constants for existing UI components
export const assetTypes = ['Equipment', 'Cage', 'Tracker', 'Dataset', 'Other'] as const;
export type AssetType = typeof assetTypes[number];

export const recordTypes = ['Health Check', 'Growth', 'Feeding', 'Sighting', 'Release', 'General'] as const;
export type RecordType = typeof recordTypes[number];

// Compliance config interface used by compliance-rules
export interface JurisdictionConfig {
  enabledForms: string[];
  templates: string[];
  enforceReleaseDistance: boolean;
  requireVetSignOff: boolean;
  maxRetentionYears: number;
}
