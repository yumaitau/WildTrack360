import 'zod-openapi/extend';
import { z } from 'zod';

// --- Species ---

export const SpeciesEntry = z
  .object({
    id: z.string(),
    name: z.string(),
    scientificName: z.string().nullable(),
    type: z.string().nullable().openapi({ description: '"Mammal", "Bird", "Reptile", or "Amphibian".' }),
    description: z.string().nullable(),
    careRequirements: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'SpeciesEntry' });

export const CreateSpeciesBody = z
  .object({
    name: z.string(),
    scientificName: z.string().optional(),
    type: z.string().optional(),
    description: z.string().optional(),
    careRequirements: z.string().optional(),
  })
  .openapi({ ref: 'CreateSpeciesBody' });

// --- Assets ---

export const AssetEntry = z
  .object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().nullable(),
    status: z.string().openapi({ description: 'AssetStatus: AVAILABLE, IN_USE, MAINTENANCE, RETIRED, LOST.' }),
    location: z.string().nullable(),
    assignedTo: z.string().nullable(),
    purchaseDate: z.string().datetime().nullable(),
    lastMaintenance: z.string().datetime().nullable(),
    notes: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'AssetEntry' });

export const CreateAssetBody = z
  .object({
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    status: z.string().optional().openapi({ description: 'AssetStatus. Defaults to AVAILABLE.' }),
    location: z.string().optional(),
    assignedTo: z.string().optional(),
    purchaseDate: z.string().datetime().optional(),
    lastMaintenance: z.string().datetime().optional(),
    notes: z.string().optional(),
  })
  .openapi({ ref: 'CreateAssetBody' });

// --- Call Logs ---

export const CallLogEntry = z
  .object({
    id: z.string(),
    dateTime: z.string().datetime(),
    status: z.string().openapi({ description: 'CallLogStatus: OPEN, IN_PROGRESS, CLOSED.' }),
    callerName: z.string(),
    callerPhone: z.string().nullable(),
    callerEmail: z.string().nullable(),
    species: z.string().nullable(),
    location: z.string().nullable(),
    coordinates: z.unknown().nullable().openapi({ description: '{ lat, lng } coordinate pair.' }),
    suburb: z.string().nullable(),
    postcode: z.string().nullable(),
    notes: z.string().nullable(),
    reason: z.string().nullable(),
    referrer: z.string().nullable(),
    action: z.string().nullable(),
    outcome: z.string().nullable(),
    takenByUserId: z.string(),
    takenByUserName: z.string().nullable(),
    assignedToUserId: z.string().nullable(),
    assignedToUserName: z.string().nullable(),
    animalId: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'CallLogEntry' });

export const CreateCallLogBody = z
  .object({
    dateTime: z.string().datetime().optional(),
    callerName: z.string(),
    callerPhone: z.string().optional(),
    callerEmail: z.string().optional(),
    species: z.string().optional(),
    location: z.string().optional(),
    coordinates: z.unknown().optional(),
    suburb: z.string().optional(),
    postcode: z.string().optional(),
    notes: z.string().optional(),
    reason: z.string().optional(),
    referrer: z.string().optional(),
    action: z.string().optional(),
    outcome: z.string().optional(),
    assignedToUserId: z.string().optional(),
    animalId: z.string().optional(),
  })
  .openapi({ ref: 'CreateCallLogBody' });

// --- Call Log Lookups ---

export const CallLogLookupItem = z
  .object({
    id: z.string(),
    label: z.string(),
    displayOrder: z.number().int(),
    active: z.boolean(),
  })
  .openapi({ ref: 'CallLogLookupItem' });

export const CallLogLookupsResponse = z
  .object({
    reason: z.array(CallLogLookupItem).optional(),
    referrer: z.array(CallLogLookupItem).optional(),
    action: z.array(CallLogLookupItem).optional(),
    outcome: z.array(CallLogLookupItem).optional(),
  })
  .openapi({ ref: 'CallLogLookupsResponse', description: 'All or a subset of lookup lists, depending on the ?type filter.' });

export const CreateCallLogLookupBody = z
  .object({
    type: z.enum(['reason', 'referrer', 'action', 'outcome']).openapi({ description: 'Lookup list to add to.' }),
    label: z.string(),
  })
  .openapi({ ref: 'CreateCallLogLookupBody' });

export const UpdateCallLogLookupBody = z
  .object({
    type: z.enum(['reason', 'referrer', 'action', 'outcome']),
    id: z.string(),
    label: z.string().optional(),
    active: z.boolean().optional(),
    displayOrder: z.number().int().optional(),
  })
  .openapi({ ref: 'UpdateCallLogLookupBody' });

export const DeleteCallLogLookupBody = z
  .object({
    type: z.enum(['reason', 'referrer', 'action', 'outcome']),
    id: z.string(),
  })
  .openapi({ ref: 'DeleteCallLogLookupBody' });

// --- Pindrop ---

export const PindropSession = z
  .object({
    id: z.string(),
    accessToken: z.string(),
    status: z.enum(['PENDING', 'SUBMITTED', 'EXPIRED']),
    callerName: z.string().nullable(),
    callerEmail: z.string().nullable(),
    callerPhone: z.string().nullable(),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
    address: z.string().nullable(),
    photoUrls: z.array(z.string()),
    callerNotes: z.string().nullable(),
    submittedAt: z.string().datetime().nullable(),
    expiresAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'PindropSession' });

export const CreatePindropBody = z
  .object({
    callerPhone: z.string().openapi({ description: 'Phone number to send the pindrop SMS link to.' }),
    callLogId: z.string().optional().openapi({ description: 'Link session to an existing call log.' }),
  })
  .openapi({ ref: 'CreatePindropBody' });

// --- Upload responses ---

export const PhotoUploadResult = z
  .object({
    id: z.string(),
    url: z.string(),
    description: z.string().nullable(),
    animalId: z.string(),
    createdAt: z.string().datetime(),
  })
  .openapi({ ref: 'PhotoUploadResult' });

export const ImageUploadResult = z
  .object({ url: z.string().openapi({ description: 'S3 key for the uploaded image.' }) })
  .openapi({ ref: 'ImageUploadResult' });

export const DocumentUploadResult = z
  .object({
    key: z.string().openapi({ description: 'S3 key for the uploaded document.' }),
    fileName: z.string(),
  })
  .openapi({ ref: 'DocumentUploadResult' });
