// Re-export Prisma types for app-wide use
export type { Animal, Record, Photo, Asset, Species, CarerProfile, CarerTraining, HygieneLog, IncidentReport, ReleaseChecklist, OrgMember, SpeciesGroup, CoordinatorSpeciesAssignment, AnimalReminder } from '@prisma/client';
export type AnimalStatus = import('@prisma/client').$Enums.AnimalStatus;
export type AssetStatus = import('@prisma/client').$Enums.AssetStatus;
export type OrgRole = import('@prisma/client').$Enums.OrgRole;

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

export const recordTypes = ['Health Check', 'Growth', 'Feeding', 'Sighting', 'General'] as const;
export type RecordType = typeof recordTypes[number];

// RBAC types for client-side use
export interface OrgMemberWithAssignments {
  id: string;
  userId: string;
  orgId: string;
  role: 'ADMIN' | 'COORDINATOR_ALL' | 'COORDINATOR' | 'CARER_ALL' | 'CARER';
  createdAt: string;
  updatedAt: string;
  speciesAssignments: {
    id: string;
    speciesGroupId: string;
    speciesGroup: {
      id: string;
      slug: string;
      name: string;
      speciesNames: string[];
    };
  }[];
}

export interface SpeciesGroupWithCoordinators {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  speciesNames: string[];
  orgId: string;
  coordinators: {
    id: string;
    orgMemberId: string;
    orgMember: {
      id: string;
      userId: string;
      role: 'ADMIN' | 'COORDINATOR_ALL' | 'COORDINATOR' | 'CARER_ALL' | 'CARER';
    };
  }[];
}

// Compliance config interface used by compliance-rules
export interface JurisdictionConfig {
  enabledForms: string[];
  templates: string[];
  enforceReleaseDistance: boolean;
  requireVetSignOff: boolean;
  maxRetentionYears: number;
}
