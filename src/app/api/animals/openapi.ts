import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

// Date fields are validated leniently as strings (Prisma serialises Date -> ISO
// string on the wire) but documented as date-time format.
const isoDate = () => z.string().openapi({ format: 'date-time' });

export const AnimalStatusEnum = z
  .enum(['ADMITTED', 'IN_CARE', 'READY_FOR_RELEASE', 'RELEASED', 'DECEASED', 'TRANSFERRED', 'PERMANENT_CARE'])
  .openapi('AnimalStatus');

/** Serialised Prisma Animal (scalar fields). Mirrors prisma/schema.prisma model Animal. */
export const AnimalSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    species: z.string(),
    sex: z.string().nullable(),
    ageClass: z.string().nullable(),
    age: z.string().nullable(),
    dateOfBirth: isoDate().nullable(),
    status: AnimalStatusEnum,
    dateFound: isoDate(),
    dateReleased: isoDate().nullable(),
    outcomeDate: isoDate().nullable(),
    outcome: z.string().nullable(),
    photo: z.string().nullable(),
    notes: z.string().nullable(),
    rescueLocation: z.string().nullable(),
    rescueCoordinates: z.unknown(),
    rescueAddress: z.string().nullable(),
    rescueSuburb: z.string().nullable(),
    rescuePostcode: z.string().nullable(),
    releaseLocation: z.string().nullable(),
    releaseCoordinates: z.unknown(),
    releaseNotes: z.string().nullable(),
    releaseAddress: z.string().nullable(),
    releaseSuburb: z.string().nullable(),
    releasePostcode: z.string().nullable(),
    encounterType: z.string().nullable(),
    initialWeightGrams: z.number().nullable(),
    weightUnit: z.string().nullable(),
    animalCondition: z.string().nullable(),
    pouchCondition: z.string().nullable(),
    fate: z.string().nullable(),
    tagBandColourNumber: z.string().nullable(),
    microchipNumber: z.string().nullable(),
    lifeStage: z.string().nullable(),
    dateAdmitted: isoDate().nullable(),
    orgAnimalId: z.string().nullable(),
    outcomeReason: z.string().nullable(),
    sourceOrgAnimalId: z.string().nullable(),
    interOrgTransferReceived: z.boolean(),
    createdAt: isoDate(),
    updatedAt: isoDate(),
    clerkUserId: z.string(),
    clerkOrganizationId: z.string(),
    carerId: z.string().nullable(),
  })
  .openapi('Animal');

const RecordSchema = z
  .object({
    id: z.string(),
    type: z.enum(['FEEDING', 'MEDICAL', 'BEHAVIOR', 'LOCATION', 'WEIGHT', 'RELEASE', 'OTHER']),
    date: isoDate(),
    description: z.string(),
    location: z.string().nullable(),
    notes: z.string().nullable(),
    createdAt: isoDate(),
    updatedAt: isoDate(),
    clerkUserId: z.string(),
    clerkOrganizationId: z.string(),
    animalId: z.string(),
  })
  .openapi('Record');

const PhotoSchema = z
  .object({
    id: z.string(),
    url: z.string(),
    description: z.string(),
    date: isoDate(),
    createdAt: isoDate(),
    updatedAt: isoDate(),
    clerkUserId: z.string(),
    clerkOrganizationId: z.string(),
    animalId: z.string(),
  })
  .openapi('Photo');

// SHORTCUT: carer modelled with stable key fields only (extra fields pass through
// unvalidated); tighten to the full CarerProfile when the carers domain is migrated.
const CarerLiteSchema = z
  .object({
    id: z.string(),
    phone: z.string().nullable(),
    licenseNumber: z.string().nullable(),
    jurisdiction: z.string().nullable(),
    specialties: z.array(z.string()),
    active: z.boolean(),
    createdAt: isoDate(),
    updatedAt: isoDate(),
    clerkOrganizationId: z.string(),
  })
  .openapi('CarerLite');

/** Animal as returned by the list endpoint (with carer, records, photos includes). */
export const AnimalWithRelationsSchema = AnimalSchema.extend({
  carer: CarerLiteSchema.nullable(),
  records: z.array(RecordSchema),
  photos: z.array(PhotoSchema),
}).openapi('AnimalWithRelations');

/**
 * Create payload. Required Prisma columns (name/species/status/dateFound have no
 * DB default) are validated; `.passthrough()` keeps every other field the handler
 * forwards to createAnimal (e.g. clerkOrganizationId, _autoGenerateOrgAnimalId,
 * orgAnimalId, optional animal fields) so nothing is silently dropped.
 */
export const AnimalCreateSchema = z
  .object({
    name: z.string().min(1),
    species: z.string().min(1),
    status: AnimalStatusEnum,
    dateFound: z.string().min(1).openapi({ format: 'date-time' }),
  })
  .passthrough()
  .openapi('AnimalCreate');

export const listAnimalsContract = defineContract({
  method: 'get',
  path: '/api/animals',
  summary: 'List animals for the organisation (role-scoped)',
  tags: ['Animals'],
  security: 'clerkSession',
  request: { query: z.object({ orgId: z.string().optional() }) },
  responses: {
    200: { description: 'Animals with carer, records and photos', schema: z.array(AnimalWithRelationsSchema) },
    400: { description: 'Organization ID is required' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
  successStatus: 200,
});

export const createAnimalContract = defineContract({
  method: 'post',
  path: '/api/animals',
  summary: 'Create an animal',
  tags: ['Animals'],
  security: 'clerkSession',
  request: { body: AnimalCreateSchema },
  responses: {
    201: { description: 'The created animal', schema: AnimalSchema },
    400: { description: 'Invalid request body / organization required' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    422: { description: 'orgAnimalId already in use' },
  },
  successStatus: 201,
});

export const peekAnimalIdContract = defineContract({
  method: 'get',
  path: '/api/animals/peek-id',
  summary: 'Preview the next generated animal ID',
  tags: ['Animals'],
  security: 'clerkSession',
  request: {
    query: z.object({ species: z.string().optional(), intakeDate: z.string().optional() }),
  },
  responses: {
    200: { description: 'Preview of the next animal ID', schema: z.object({ preview: z.string() }) },
    401: { description: 'Unauthorized' },
  },
  successStatus: 200,
});
