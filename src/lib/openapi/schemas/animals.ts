import 'zod-openapi/extend';
import { z } from 'zod';

export const AnimalStatus = z
  .enum(['ADMITTED', 'IN_CARE', 'READY_FOR_RELEASE', 'RELEASED', 'DECEASED', 'TRANSFERRED', 'PERMANENT_CARE'])
  .openapi({ description: 'Animal lifecycle status' });

export const CarerProfileBase = z
  .object({
    id: z.string().openapi({ description: 'Clerk user ID' }),
    phone: z.string().nullable().optional(),
    licenseNumber: z.string().nullable().optional(),
    licenseExpiry: z.string().datetime().nullable().optional(),
    active: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'CarerProfile', description: 'Carer profile' });

export const RecordBase = z
  .object({
    id: z.string(),
    type: z.string().openapi({ description: 'Record type (e.g. FEEDING, WEIGHT, MEDICATION)' }),
    date: z.string().datetime(),
    description: z.string(),
    location: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    animalId: z.string(),
    clerkOrganizationId: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'Record', description: 'Animal care record' });

export const PhotoBase = z
  .object({
    id: z.string(),
    url: z.string().openapi({ description: 'Relative or absolute URL to the uploaded photo' }),
    description: z.string(),
    date: z.string().datetime(),
    animalId: z.string(),
    clerkOrganizationId: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'Photo', description: 'Animal photo' });

export const AnimalBase = z
  .object({
    id: z.string(),
    name: z.string(),
    species: z.string(),
    sex: z.string().nullable().optional(),
    ageClass: z.string().nullable().optional(),
    age: z.string().nullable().optional(),
    dateOfBirth: z.string().datetime().nullable().optional(),
    status: AnimalStatus,
    dateFound: z.string().datetime(),
    dateReleased: z.string().datetime().nullable().optional(),
    outcomeDate: z.string().datetime().nullable().optional(),
    outcome: z.string().nullable().optional(),
    photo: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    rescueLocation: z.string().nullable().optional(),
    rescueCoordinates: z.record(z.unknown()).nullable().optional().openapi({ description: '{ lat, lng }' }),
    rescueAddress: z.string().nullable().optional(),
    rescueSuburb: z.string().nullable().optional(),
    rescuePostcode: z.string().nullable().optional(),
    releaseLocation: z.string().nullable().optional(),
    releaseCoordinates: z.record(z.unknown()).nullable().optional().openapi({ description: '{ lat, lng }' }),
    releaseNotes: z.string().nullable().optional(),
    releaseAddress: z.string().nullable().optional(),
    releaseSuburb: z.string().nullable().optional(),
    releasePostcode: z.string().nullable().optional(),
    orgAnimalId: z.string().nullable().optional().openapi({ description: 'Organisation-scoped animal ID' }),
    carerId: z.string().nullable().optional(),
    clerkUserId: z.string(),
    clerkOrganizationId: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'Animal', description: 'Core animal record fields' });

export const AnimalWithRelations = AnimalBase.extend({
  carer: CarerProfileBase.nullable().openapi({ description: 'Assigned carer profile, or null' }),
  records: z.array(RecordBase).openapi({ description: 'All care records for this animal' }),
  photos: z.array(PhotoBase).openapi({ description: 'All photos for this animal' }),
}).openapi({ ref: 'AnimalWithRelations', description: 'Animal with carer, records, and photos' });

export const CreateAnimalBody = z
  .object({
    name: z.string(),
    species: z.string(),
    status: AnimalStatus,
    dateFound: z.string().datetime().openapi({ description: 'ISO-8601 date the animal was found' }),
    sex: z.string().nullable().optional(),
    ageClass: z.string().nullable().optional(),
    age: z.string().nullable().optional(),
    dateOfBirth: z.string().datetime().nullable().optional(),
    dateAdmitted: z.string().datetime().nullable().optional(),
    dateReleased: z.string().datetime().nullable().optional(),
    outcome: z.string().nullable().optional(),
    outcomeDate: z.string().datetime().nullable().optional(),
    outcomeReason: z.string().nullable().optional(),
    photo: z
      .string()
      .nullable()
      .optional()
      .openapi({ description: 'Photo URL/key, e.g. the url returned by POST /api/upload/image' }),
    notes: z.string().nullable().optional(),
    rescueLocation: z.string().nullable().optional(),
    rescueCoordinates: z.record(z.unknown()).nullable().optional().openapi({ description: '{ lat, lng }' }),
    rescueAddress: z.string().nullable().optional(),
    rescueSuburb: z.string().nullable().optional(),
    rescuePostcode: z.string().nullable().optional(),
    releaseLocation: z.string().nullable().optional(),
    releaseCoordinates: z.record(z.unknown()).nullable().optional().openapi({ description: '{ lat, lng }' }),
    releaseNotes: z.string().nullable().optional(),
    releaseAddress: z.string().nullable().optional(),
    releaseSuburb: z.string().nullable().optional(),
    releasePostcode: z.string().nullable().optional(),
    encounterType: z.string().nullable().optional(),
    initialWeightGrams: z.number().int().nullable().optional(),
    weightUnit: z.string().nullable().optional(),
    animalCondition: z.string().nullable().optional(),
    pouchCondition: z.string().nullable().optional(),
    fate: z.string().nullable().optional(),
    tagBandColourNumber: z.string().nullable().optional(),
    microchipNumber: z.string().nullable().optional(),
    lifeStage: z.string().nullable().optional(),
    orgAnimalId: z
      .string()
      .nullable()
      .optional()
      .openapi({ description: 'Organisation-scoped animal ID (ignored when _autoGenerateOrgAnimalId is true)' }),
    sourceOrgAnimalId: z.string().nullable().optional(),
    interOrgTransferReceived: z.boolean().optional(),
    carerId: z.string().nullable().optional(),
    clerkOrganizationId: z.string().optional().openapi({ description: 'Defaults to the active Clerk org' }),
    _autoGenerateOrgAnimalId: z
      .boolean()
      .optional()
      .openapi({ description: 'Set true to atomically assign the next orgAnimalId' }),
  })
  .openapi({
    ref: 'CreateAnimalBody',
    description:
      'Request body for creating an animal. The server persists the ANIMAL_SAFE_FIELDS allow-list; ' +
      'clerkUserId and clerkOrganizationId are taken from the authenticated session.',
  });

export const UpdateAnimalBody = z
  .object({
    name: z.string().optional(),
    species: z.string().optional(),
    status: AnimalStatus.optional(),
    sex: z.string().nullable().optional(),
    ageClass: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    carerId: z.string().nullable().optional(),
    _overrideValidation: z
      .boolean()
      .optional()
      .openapi({ description: 'Admin-only: override compliance status-transition guardrails' }),
  })
  .openapi({ ref: 'UpdateAnimalBody', description: 'Partial update body for an animal' });
