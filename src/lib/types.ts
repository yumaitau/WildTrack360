// Re-export Prisma types for app-wide use
export type { Animal, Record, Photo, Asset, Species, Carer, HygieneLog, IncidentReport, ReleaseChecklist } from '@prisma/client';
export type AnimalStatus = import('@prisma/client').$Enums.AnimalStatus;
export type AssetStatus = import('@prisma/client').$Enums.AssetStatus;

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
