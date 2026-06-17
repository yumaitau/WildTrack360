import 'zod-openapi/extend';
import { z } from 'zod';

// --- Growth Measurements ---

export const GrowthMeasurementBase = z
  .object({
    id: z.string(),
    animalId: z.string(),
    date: z.string().datetime(),
    weightGrams: z.number().nullable(),
    headLengthMm: z.number().nullable(),
    earLengthMm: z.number().nullable(),
    armLengthMm: z.number().nullable(),
    legLengthMm: z.number().nullable(),
    footLengthMm: z.number().nullable(),
    tailLengthMm: z.number().nullable(),
    bodyLengthMm: z.number().nullable(),
    wingLengthMm: z.number().nullable(),
    notes: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'GrowthMeasurement' });

export const CreateGrowthMeasurementBody = z
  .object({
    date: z.string().datetime().optional(),
    weightGrams: z.number().nullable().optional(),
    headLengthMm: z.number().nullable().optional(),
    earLengthMm: z.number().nullable().optional(),
    armLengthMm: z.number().nullable().optional(),
    legLengthMm: z.number().nullable().optional(),
    footLengthMm: z.number().nullable().optional(),
    tailLengthMm: z.number().nullable().optional(),
    bodyLengthMm: z.number().nullable().optional(),
    wingLengthMm: z.number().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .openapi({ ref: 'CreateGrowthMeasurementBody' });

// --- Animal Reminders ---

export const AnimalReminderBase = z
  .object({
    id: z.string(),
    animalId: z.string(),
    message: z.string(),
    isActive: z.boolean(),
    expiresAt: z.string().datetime().nullable(),
    createdByUserId: z.string(),
    createdByName: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'AnimalReminder' });

export const CreateAnimalReminderBody = z
  .object({
    message: z.string().openapi({ description: 'Reminder message text (required).' }),
    expiresAt: z.string().datetime().optional().openapi({ description: 'ISO 8601 expiry datetime.' }),
  })
  .openapi({ ref: 'CreateAnimalReminderBody' });

// --- Growth References ---

export const SpeciesGrowthReference = z
  .object({
    id: z.string(),
    speciesName: z.string(),
    sex: z.string().openapi({ description: '"Male", "Female", or "Unknown"' }),
    ageDays: z.number().int(),
    weightGrams: z.number().nullable(),
    headLengthMm: z.number().nullable(),
    earLengthMm: z.number().nullable(),
    armLengthMm: z.number().nullable(),
    legLengthMm: z.number().nullable(),
    footLengthMm: z.number().nullable(),
    tailLengthMm: z.number().nullable(),
    bodyLengthMm: z.number().nullable(),
    wingLengthMm: z.number().nullable(),
    reference: z.string().nullable().openapi({ description: 'Citation or data source.' }),
  })
  .openapi({ ref: 'SpeciesGrowthReference' });

export const BirthDateEstimateResult = z
  .object({
    estimates: z.array(
      z.object({
        field: z.string(),
        label: z.string(),
        value: z.number(),
        estimatedAgeDays: z.number(),
        estimatedBirthDate: z.string().datetime(),
      }),
    ),
    medianEstimatedBirthDate: z.string().datetime().nullable(),
    medianEstimatedAgeDays: z.number().nullable(),
  })
  .openapi({ ref: 'BirthDateEstimateResult' });

export const EstimateBirthDateBody = z
  .object({
    speciesName: z.string(),
    sex: z.string().optional().openapi({ description: '"Male", "Female", or "Unknown". Omit to search all.' }),
    measurementDate: z.string().datetime().openapi({ description: 'Date measurements were taken.' }),
    measurements: z
      .record(z.string(), z.number())
      .openapi({ description: 'Map of measurement field names to mm/gram values.' }),
  })
  .openapi({ ref: 'EstimateBirthDateBody' });

// --- Records ---

export const AnimalRecord = z
  .object({
    id: z.string(),
    type: z.string().openapi({ description: 'RecordType enum value.' }),
    date: z.string().datetime(),
    description: z.string(),
    location: z.string().nullable(),
    notes: z.string().nullable(),
    animalId: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'AnimalRecord' });

export const CreateRecordBody = z
  .object({
    animalId: z.string(),
    type: z.string().openapi({ description: 'RecordType enum value.' }),
    date: z.string().datetime().optional(),
    description: z.string(),
    location: z.string().optional(),
    notes: z.string().optional(),
  })
  .openapi({ ref: 'CreateRecordBody' });

// --- Release Checklists ---

export const ReleaseChecklist = z
  .object({
    id: z.string(),
    animalId: z.string(),
    releaseDate: z.string().datetime(),
    releaseLocation: z.string(),
    releaseCoordinates: z.unknown().nullable().openapi({ description: '{ lat, lng } coordinate pair.' }),
    within10km: z.boolean(),
    releaseType: z.string().openapi({ description: 'ReleaseType enum value.' }),
    fitnessIndicators: z.array(z.string()),
    vetSignOff: z.unknown().nullable(),
    photos: z.unknown().nullable(),
    completed: z.boolean(),
    notes: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'ReleaseChecklist' });

export const CreateReleaseChecklistBody = z
  .object({
    animalId: z.string(),
    releaseDate: z.string().datetime(),
    releaseLocation: z.string(),
    releaseCoordinates: z.unknown().optional(),
    within10km: z.boolean().optional(),
    releaseType: z.string(),
    fitnessIndicators: z.array(z.string()).optional(),
    vetSignOff: z.unknown().optional(),
    photos: z.unknown().optional(),
    completed: z.boolean().optional(),
    notes: z.string().optional(),
  })
  .openapi({ ref: 'CreateReleaseChecklistBody' });

// --- Post-Release Monitoring ---

export const PostReleaseRecord = z
  .object({
    id: z.string(),
    animalId: z.string(),
    date: z.string().datetime(),
    time: z.string().nullable().openapi({ description: 'HH:mm time of sighting.' }),
    location: z.string().nullable(),
    coordinates: z.unknown().nullable().openapi({ description: '{ lat, lng } coordinate pair.' }),
    animalCondition: z.string().nullable(),
    notes: z.string(),
    photos: z.unknown().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'PostReleaseRecord' });

export const CreatePostReleaseBody = z
  .object({
    animalId: z.string(),
    date: z.string().datetime(),
    time: z.string().optional(),
    location: z.string().optional(),
    coordinates: z.unknown().optional(),
    animalCondition: z.string().optional(),
    notes: z.string().openapi({ description: 'Required observation notes.' }),
    photos: z.unknown().optional(),
  })
  .openapi({ ref: 'CreatePostReleaseBody' });

// --- Transfers ---

export const AnimalTransfer = z
  .object({
    id: z.string(),
    animalId: z.string(),
    transferDate: z.string().datetime(),
    transferType: z.string().openapi({ description: 'TransferType enum (INTERNAL_CARER, EXTERNAL_ORG, PERMANENT_CARE_PLACEMENT, etc.).' }),
    reasonForTransfer: z.string(),
    fromCarerId: z.string().nullable(),
    toCarerId: z.string().nullable(),
    receivingEntity: z.string(),
    receivingEntityType: z.string().nullable(),
    receivingLicense: z.string().nullable(),
    receivingContactName: z.string().nullable(),
    receivingContactPhone: z.string().nullable(),
    receivingContactEmail: z.string().nullable(),
    receivingOrgAnimalId: z.string().nullable(),
    receivingAddress: z.string().nullable(),
    receivingSuburb: z.string().nullable(),
    receivingState: z.string().nullable(),
    receivingPostcode: z.string().nullable(),
    transferAuthorizedBy: z.string().nullable(),
    verifiedByUserId: z.string().nullable(),
    verifiedAt: z.string().datetime().nullable(),
    transferNotes: z.string().nullable(),
    documents: z.unknown().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'AnimalTransfer' });

export const CreateTransferBody = z
  .object({
    animalId: z.string(),
    transferDate: z.string().datetime(),
    transferType: z.string().optional(),
    reasonForTransfer: z.string(),
    receivingEntity: z.string(),
    toCarerId: z.string().optional(),
    receivingEntityType: z.string().optional(),
    receivingLicense: z.string().optional(),
    receivingContactName: z.string().optional(),
    receivingContactPhone: z.string().optional(),
    receivingContactEmail: z.string().optional(),
    receivingOrgAnimalId: z.string().optional(),
    receivingAddress: z.string().optional(),
    receivingSuburb: z.string().optional(),
    receivingState: z.string().optional(),
    receivingPostcode: z.string().optional(),
    transferAuthorizedBy: z.string().optional(),
    transferNotes: z.string().optional(),
    documents: z.unknown().optional(),
  })
  .openapi({ ref: 'CreateTransferBody' });

export const TransferCreatedResult = z
  .object({
    transfer: AnimalTransfer,
    updatedAnimal: z.unknown().openapi({ description: 'Partial Animal record with updated status.' }),
  })
  .openapi({ ref: 'TransferCreatedResult' });

// --- Hygiene Logs ---

export const HygieneLog = z
  .object({
    id: z.string(),
    date: z.string().datetime(),
    type: z.string(),
    description: z.string(),
    completed: z.boolean(),
    enclosureCleaned: z.boolean(),
    ppeUsed: z.boolean(),
    handwashAvailable: z.boolean(),
    feedingBowlsDisinfected: z.boolean(),
    quarantineSignsPresent: z.boolean(),
    photos: z.unknown().nullable(),
    carerId: z.string(),
    notes: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'HygieneLog' });

export const CreateHygieneLogBody = z
  .object({
    date: z.string().datetime().optional(),
    type: z.string().optional().openapi({ description: 'Defaults to "DAILY".' }),
    description: z.string().optional(),
    completed: z.boolean().optional(),
    enclosureCleaned: z.boolean().optional(),
    ppeUsed: z.boolean().optional(),
    handwashAvailable: z.boolean().optional(),
    feedingBowlsDisinfected: z.boolean().optional(),
    quarantineSignsPresent: z.boolean().optional(),
    photos: z.unknown().optional(),
    carerId: z.string(),
    notes: z.string().optional(),
  })
  .openapi({ ref: 'CreateHygieneLogBody' });

// --- Incident Reports ---

export const IncidentReport = z
  .object({
    id: z.string(),
    date: z.string().datetime(),
    type: z.string(),
    description: z.string(),
    severity: z.string().openapi({ description: 'IncidentSeverity enum value.' }),
    resolved: z.boolean(),
    resolution: z.string().nullable(),
    personInvolved: z.string().nullable(),
    reportedTo: z.string().nullable(),
    actionTaken: z.string().nullable(),
    location: z.string().nullable(),
    animalId: z.string().nullable(),
    notes: z.string().nullable(),
    attachments: z.unknown().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'IncidentReport' });

export const CreateIncidentBody = z
  .object({
    date: z.string().datetime().optional(),
    type: z.string(),
    description: z.string(),
    severity: z.string().openapi({ description: 'IncidentSeverity enum value.' }),
    resolved: z.boolean().optional(),
    resolution: z.string().optional(),
    personInvolved: z.string().optional(),
    reportedTo: z.string().optional(),
    actionTaken: z.string().optional(),
    location: z.string().optional(),
    animalId: z.string().optional(),
    notes: z.string().optional(),
    attachments: z.unknown().optional(),
  })
  .openapi({ ref: 'CreateIncidentBody' });
