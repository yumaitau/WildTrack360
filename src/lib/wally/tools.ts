import 'server-only';

import { z } from 'zod';
import { tool, type ToolSet } from 'ai';
import type { OrgRole } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAuthorisedSpecies, canAccessAnimal, hasPermission } from '@/lib/rbac';
import { getEnrichedCarers } from '@/lib/carer-helpers';
import { getSpecies, createRecord, createAnimal } from '@/lib/database';
import { commitAnimalId } from '@/lib/animalId/generate';
import { logAudit } from '@/lib/audit';
import { canPreviewReports } from '@/lib/custom-query/access';
import { evaluateCustomQueries, type QueryablePrisma } from '@/lib/custom-query/evaluator';
import { getReportCarerNamesById } from '@/lib/custom-query/carer-names';
import {
  estimateBirthDate,
  calculatePredictedWeight,
  calculateWFA,
  getWFAStatus,
  type MeasurementField,
} from '@/lib/growth-utils';

export type WallyToolContext = {
  userId: string;
  orgId: string;
  role: OrgRole;
};

const ANIMAL_STATUSES = [
  'ADMITTED',
  'IN_CARE',
  'READY_FOR_RELEASE',
  'RELEASED',
  'DECEASED',
  'TRANSFERRED',
  'PERMANENT_CARE',
] as const;

const RECORD_TYPES = [
  'FEEDING',
  'MEDICAL',
  'BEHAVIOR',
  'LOCATION',
  'WEIGHT',
  'RELEASE',
  'OTHER',
] as const;

const MEASUREMENT_FIELDS = {
  weightGrams: z.number().positive().optional().describe('Weight in grams'),
  headLengthMm: z.number().positive().optional().describe('Head length in mm'),
  earLengthMm: z.number().positive().optional().describe('Ear length in mm'),
  armLengthMm: z.number().positive().optional().describe('Arm/forearm length in mm'),
  legLengthMm: z.number().positive().optional().describe('Leg length in mm'),
  footLengthMm: z.number().positive().optional().describe('Foot length in mm'),
  tailLengthMm: z.number().positive().optional().describe('Tail length in mm'),
  bodyLengthMm: z.number().positive().optional().describe('Body length in mm'),
  wingLengthMm: z.number().positive().optional().describe('Wing length in mm'),
};

const ANIMAL_LIST_SELECT = {
  id: true,
  orgAnimalId: true,
  name: true,
  species: true,
  status: true,
  sex: true,
  ageClass: true,
  dateFound: true,
  carerId: true,
} as const;

/** Expected, user-explainable tool failure (permissions, not found, bad input). */
class WallyToolError extends Error {}

/**
 * Wrap a tool implementation so failures come back to the model as an
 * `{ error }` result it can explain, instead of aborting the stream.
 * Internal error details never reach the model.
 */
function guarded<Args, Result>(toolName: string, impl: (args: Args) => Promise<Result>) {
  return async (args: Args): Promise<Result | { error: string }> => {
    try {
      return await impl(args);
    } catch (error) {
      if (error instanceof WallyToolError) return { error: error.message };
      console.error(`[wally] tool ${toolName} failed:`, error);
      return {
        error: `The ${toolName} tool failed unexpectedly. Suggest the user try again or use the app directly.`,
      };
    }
  };
}

function parseDateInput(value: string, fieldName: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new WallyToolError(
      `"${value}" is not a valid ${fieldName}. Use an ISO date like 2026-07-05.`
    );
  }
  return date;
}

type CarerDisplay = {
  name: string;
  email: string | null;
};

const CARER_EMAIL_UNAVAILABLE = 'Carer email unavailable';

function carerDisplayFor(
  carerId: string | null | undefined,
  carersById: Map<string, CarerDisplay>
) {
  if (!carerId) return null;
  return carersById.get(carerId) ?? { name: CARER_EMAIL_UNAVAILABLE, email: null };
}

async function getCarerDisplayById(orgId: string): Promise<Map<string, CarerDisplay>> {
  const carers = (await getEnrichedCarers(orgId)) ?? [];
  return new Map(
    carers.map((carer) => [
      carer.id,
      {
        name: carer.name || carer.email || CARER_EMAIL_UNAVAILABLE,
        email: carer.email || null,
      },
    ])
  );
}

async function resolveCarerReference(
  orgId: string,
  reference: { carerId?: string | null; carerEmail?: string | null }
): Promise<{ id: string; display: CarerDisplay } | null> {
  const email = reference.carerEmail?.trim().toLowerCase();
  const carerId = reference.carerId?.trim();
  if (!email && !carerId) return null;

  if (email) {
    const carersById = await getCarerDisplayById(orgId);
    for (const [id, display] of carersById) {
      if (display.email?.toLowerCase() === email) return { id, display };
    }
    throw new WallyToolError(
      `No carer found with email "${reference.carerEmail}" in this organisation`
    );
  }

  return {
    id: carerId!,
    display: { name: CARER_EMAIL_UNAVAILABLE, email: null },
  };
}

function omitInternalUserFields<T extends Record<string, unknown>>(value: T) {
  const {
    clerkUserId: _clerkUserId,
    clerkOrganizationId: _clerkOrganizationId,
    carerId: _carerId,
    createdByUserId: _createdByUserId,
    submittedByUserId: _submittedByUserId,
    reviewedByUserId: _reviewedByUserId,
    takenByUserId: _takenByUserId,
    assignedToUserId: _assignedToUserId,
    ...rest
  } = value;
  return rest;
}

/**
 * Role-scoped animal `where` clause. Mirrors the visibility rules in
 * /api/animals and the MCP tools: ADMIN / COORDINATOR_ALL / CARER_ALL see the
 * whole org, COORDINATOR sees assigned species groups plus own animals,
 * CARER sees only animals assigned to them.
 */
async function animalVisibilityWhere(context: WallyToolContext): Promise<Prisma.AnimalWhereInput> {
  const { userId, orgId, role } = context;
  if (role === 'ADMIN' || role === 'COORDINATOR_ALL' || role === 'CARER_ALL') {
    return { clerkOrganizationId: orgId };
  }
  if (role === 'COORDINATOR') {
    const authorisedSpecies = await getAuthorisedSpecies(userId, orgId);
    return {
      clerkOrganizationId: orgId,
      OR: [
        ...(authorisedSpecies && authorisedSpecies.length > 0
          ? [{ species: { in: authorisedSpecies } }]
          : []),
        { carerId: userId },
      ],
    };
  }
  return { clerkOrganizationId: orgId, carerId: userId };
}

async function findAccessibleAnimal(context: WallyToolContext, animalId: string) {
  const animal = await prisma.animal.findFirst({
    where: {
      clerkOrganizationId: context.orgId,
      OR: [{ id: animalId }, { orgAnimalId: animalId }],
    },
  });
  if (!animal) throw new WallyToolError(`No animal found with ID "${animalId}"`);
  const allowed = await canAccessAnimal(context.userId, context.orgId, animal);
  if (!allowed) {
    throw new WallyToolError('Forbidden: your role does not give you access to this animal');
  }
  return animal;
}

async function loadGrowthReference(speciesName: string, sex?: string) {
  const referenceData = await prisma.speciesGrowthReference.findMany({
    where: {
      speciesName: { equals: speciesName, mode: 'insensitive' },
      ...(sex ? { sex } : {}),
    },
    orderBy: { ageDays: 'asc' },
  });
  if (referenceData.length === 0) {
    const available = await prisma.speciesGrowthReference.findMany({
      distinct: ['speciesName'],
      select: { speciesName: true },
      orderBy: { speciesName: 'asc' },
    });
    throw new WallyToolError(
      `No growth reference data found for "${speciesName}"${sex ? ` (sex: ${sex})` : ''}. ` +
        `Species with reference data: ${available.map((s) => s.speciesName).join(', ') || 'none configured'}.`
    );
  }
  return referenceData;
}

export function buildWallyTools(context: WallyToolContext): ToolSet {
  const { userId, orgId, role } = context;

  return {
    list_animals: tool({
      description:
        'List animals visible to the user, with optional filters. Use this for questions about specific animals or filtered sets rather than relying on the summary context.',
      inputSchema: z.object({
        species: z.string().optional().describe('Exact species name (case-insensitive)'),
        status: z.enum(ANIMAL_STATUSES).optional().describe('Lifecycle status filter'),
        search: z.string().optional().describe('Substring match on animal name or org animal ID'),
        limit: z.number().int().min(1).max(50).default(20).describe('Maximum animals to return'),
      }),
      execute: guarded('list_animals', async (args) => {
        const visibility = await animalVisibilityWhere(context);
        const filters: Prisma.AnimalWhereInput[] = [];
        if (args.species) filters.push({ species: { equals: args.species, mode: 'insensitive' } });
        if (args.status) filters.push({ status: args.status });
        if (args.search) {
          filters.push({
            OR: [
              { name: { contains: args.search, mode: 'insensitive' } },
              { orgAnimalId: { contains: args.search, mode: 'insensitive' } },
            ],
          });
        }
        const where = { AND: [visibility, ...filters] };
        const limit = args.limit ?? 20;
        const [total, animals] = await Promise.all([
          prisma.animal.count({ where }),
          prisma.animal.findMany({
            where,
            select: ANIMAL_LIST_SELECT,
            orderBy: { dateFound: 'desc' },
            take: limit,
          }),
        ]);
        const carersById = await getCarerDisplayById(orgId);
        return {
          total,
          returned: animals.length,
          truncated: total > animals.length,
          animals: animals.map(({ carerId, ...animal }) => ({
            ...animal,
            carer: carerDisplayFor(carerId, carersById),
          })),
        };
      }),
    }),

    get_animal: tool({
      description:
        'Get full details for one animal by internal ID or org animal ID (e.g. "2025-034"), including recent care records and growth measurements.',
      inputSchema: z.object({
        animalId: z.string().describe('Internal ID or org animal ID'),
      }),
      execute: guarded('get_animal', async (args) => {
        const animal = await findAccessibleAnimal(context, args.animalId);
        const [records, growthMeasurements] = await Promise.all([
          prisma.record.findMany({
            where: { animalId: animal.id, deletedAt: null },
            orderBy: { date: 'desc' },
            take: 15,
          }),
          prisma.growthMeasurement.findMany({
            where: { animalId: animal.id, clerkOrganizationId: orgId },
            orderBy: { date: 'desc' },
            take: 10,
          }),
        ]);
        const carersById = await getCarerDisplayById(orgId);
        return {
          animal: {
            ...omitInternalUserFields(animal),
            carer: carerDisplayFor(animal.carerId, carersById),
          },
          records: records.map((record) => omitInternalUserFields(record)),
          growthMeasurements: growthMeasurements.map((measurement) =>
            omitInternalUserFields(measurement)
          ),
        };
      }),
    }),

    list_species: tool({
      description: "List the species configured for the user's organisation.",
      inputSchema: z.object({}),
      execute: guarded('list_species', async () => {
        return { species: await getSpecies(orgId) };
      }),
    }),

    list_carers: tool({
      description:
        "List the organisation's carers with contact, licence, specialty, and workload details. Requires a coordinator or admin role.",
      inputSchema: z.object({}),
      execute: guarded('list_carers', async () => {
        if (!hasPermission(role, 'carer:view_workload')) {
          throw new WallyToolError(`Forbidden: your role (${role}) cannot view the carer list`);
        }
        const carers = await getEnrichedCarers(orgId);
        return {
          carers: carers.map(({ id: _id, imageUrl: _imageUrl, ...carer }) => ({
            ...carer,
            email: carer.email || CARER_EMAIL_UNAVAILABLE,
            trainings: carer.trainings?.map((training) => omitInternalUserFields(training)),
          })),
        };
      }),
    }),

    list_training_records: tool({
      description:
        "List carer training records and certificates for the organisation, ordered by expiry date. Optionally filter to one carer's email. Use carer IDs only as internal tool values, never in user-facing replies.",
      inputSchema: z.object({
        carerEmail: z.string().email().optional().describe('Carer email address to filter to'),
        carerId: z
          .string()
          .optional()
          .describe('Internal carer ID to filter to; do not ask the user for this value'),
      }),
      execute: guarded('list_training_records', async (args) => {
        const requestedCarer = await resolveCarerReference(orgId, args);
        const trainings = await prisma.carerTraining.findMany({
          where: {
            clerkOrganizationId: orgId,
            ...(requestedCarer ? { carerId: requestedCarer.id } : {}),
          },
          orderBy: [{ expiryDate: 'asc' }, { date: 'desc' }],
          select: {
            id: true,
            carerId: true,
            courseName: true,
            provider: true,
            date: true,
            expiryDate: true,
            notes: true,
          },
        });
        const carersById = await getCarerDisplayById(orgId);
        return {
          total: trainings.length,
          trainings: trainings.map(({ carerId, ...training }) => ({
            ...training,
            carer: carerDisplayFor(carerId, carersById),
          })),
        };
      }),
    }),

    add_training_record: tool({
      description:
        'Add a carer training or certificate record. Defaults to the current user; adding for another carer requires a coordinator or admin role. Use a carer email for another carer. Confirm details with the user before calling.',
      inputSchema: z.object({
        carerEmail: z
          .string()
          .email()
          .optional()
          .describe('Carer email address; omit for the current user'),
        carerId: z
          .string()
          .optional()
          .describe(
            'Internal carer ID; omit for the current user and do not ask the user for this value'
          ),
        courseName: z.string().min(1).describe('Name of the course or certificate'),
        provider: z.string().optional().describe('Training provider'),
        date: z.string().describe('Date completed, ISO format (YYYY-MM-DD)'),
        expiryDate: z.string().optional().describe('Expiry date, ISO format (YYYY-MM-DD)'),
        notes: z.string().optional(),
      }),
      execute: guarded('add_training_record', async (args) => {
        const requestedCarer = await resolveCarerReference(orgId, args);
        const carerId = requestedCarer?.id ?? userId;
        if (carerId !== userId && !hasPermission(role, 'carer:view_workload')) {
          throw new WallyToolError(
            `Forbidden: your role (${role}) can only add training records for yourself`
          );
        }
        const carer = await prisma.carerProfile.findFirst({
          where: { id: carerId, clerkOrganizationId: orgId },
        });
        if (!carer) {
          throw new WallyToolError(
            'No carer profile found for that user in this organisation. The carer must complete their profile first.'
          );
        }
        const training = await prisma.carerTraining.create({
          data: {
            carerId,
            courseName: args.courseName,
            provider: args.provider ?? null,
            date: parseDateInput(args.date, 'completion date'),
            expiryDate: args.expiryDate ? parseDateInput(args.expiryDate, 'expiry date') : null,
            notes: args.notes ?? null,
            clerkUserId: userId,
            clerkOrganizationId: orgId,
          },
        });
        logAudit({
          userId,
          orgId,
          action: 'CREATE',
          entity: 'CarerTraining',
          entityId: training.id,
          metadata: { courseName: args.courseName, carerId, via: 'wally' },
        });
        const carersById = await getCarerDisplayById(orgId);
        return {
          created: {
            ...omitInternalUserFields(training),
            carer: carerDisplayFor(carerId, carersById),
          },
        };
      }),
    }),

    create_animal: tool({
      description:
        'Admit a new animal into care. Requires an admin or coordinator role. The org animal ID is auto-generated unless one is supplied. Confirm details with the user before calling.',
      inputSchema: z.object({
        name: z.string().min(1).describe('Animal name'),
        species: z.string().min(1).describe('Species name, matching the organisation species list'),
        sex: z.enum(['Male', 'Female', 'Unknown']).optional(),
        ageClass: z.string().optional().describe('e.g. Adult, Juvenile, Pouch young'),
        status: z.enum(ANIMAL_STATUSES).default('IN_CARE'),
        dateFound: z
          .string()
          .optional()
          .describe('Date found/rescued, ISO format; defaults to today'),
        rescueLocation: z.string().optional().describe('Where the animal was found'),
        rescueSuburb: z.string().optional(),
        initialWeightGrams: z.number().int().positive().optional(),
        notes: z.string().optional(),
        carerEmail: z
          .string()
          .email()
          .optional()
          .describe('Carer email address to assign the animal to'),
        carerId: z
          .string()
          .optional()
          .describe(
            'Internal carer ID to assign the animal to; do not ask the user for this value'
          ),
        orgAnimalId: z
          .string()
          .optional()
          .describe('Explicit org animal ID; omit to auto-generate'),
      }),
      execute: guarded('create_animal', async (args) => {
        if (!hasPermission(role, 'animal:create')) {
          throw new WallyToolError(`Forbidden: your role (${role}) cannot admit animals`);
        }
        const requestedCarer = await resolveCarerReference(orgId, args);
        const carerId = requestedCarer?.id;
        if (carerId) {
          const carer = await prisma.carerProfile.findFirst({
            where: { id: carerId, clerkOrganizationId: orgId },
          });
          if (!carer) {
            throw new WallyToolError('No carer profile found for that user in this organisation');
          }
        }
        const dateFound = args.dateFound
          ? parseDateInput(args.dateFound, 'date found')
          : new Date();
        const animalData = {
          name: args.name,
          species: args.species,
          sex: args.sex,
          ageClass: args.ageClass,
          status: args.status ?? 'IN_CARE',
          dateFound,
          rescueLocation: args.rescueLocation,
          rescueSuburb: args.rescueSuburb,
          initialWeightGrams: args.initialWeightGrams,
          notes: args.notes,
          carerId,
          clerkUserId: userId,
          clerkOrganizationId: orgId,
        };
        try {
          const created = args.orgAnimalId
            ? await createAnimal({ ...animalData, orgAnimalId: args.orgAnimalId })
            : await prisma.$transaction(async (tx) => {
                const generatedId = await commitAnimalId(
                  tx,
                  orgId,
                  dateFound.toISOString(),
                  args.species
                );
                return createAnimal({ ...animalData, orgAnimalId: generatedId }, tx);
              });
          logAudit({
            userId,
            orgId,
            action: 'CREATE',
            entity: 'Animal',
            entityId: created.id,
            metadata: {
              name: created.name,
              species: created.species,
              orgAnimalId: created.orgAnimalId,
              via: 'wally',
            },
          });
          const carersById = await getCarerDisplayById(orgId);
          return {
            created: {
              ...omitInternalUserFields(created),
              carer: carerDisplayFor(created.carerId, carersById),
            },
          };
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new WallyToolError(
              `Animal ID "${args.orgAnimalId}" is already in use by another animal in this organisation`
            );
          }
          throw error;
        }
      }),
    }),

    create_care_record: tool({
      description:
        'Add a care record (feeding, medical, behaviour, location, weight, release, or other) to an animal the user has access to. Confirm details with the user before calling.',
      inputSchema: z.object({
        animalId: z.string().describe('Internal ID or org animal ID'),
        type: z.enum(RECORD_TYPES).describe('Kind of care record'),
        description: z.string().min(1).describe('What happened / what was observed'),
        date: z.string().optional().describe('ISO 8601 timestamp; defaults to now'),
        location: z.string().optional(),
        notes: z.string().optional(),
      }),
      execute: guarded('create_care_record', async (args) => {
        const animal = await findAccessibleAnimal(context, args.animalId);
        const record = await createRecord({
          type: args.type,
          date: args.date ? parseDateInput(args.date, 'record date') : new Date(),
          description: args.description,
          location: args.location ?? null,
          notes: args.notes ?? null,
          clerkUserId: userId,
          clerkOrganizationId: orgId,
          animalId: animal.id,
        });
        logAudit({
          userId,
          orgId,
          action: 'CREATE',
          entity: 'Record',
          entityId: record.id,
          metadata: { animalId: animal.id, type: args.type, via: 'wally' },
        });
        return { created: omitInternalUserFields(record) };
      }),
    }),

    add_growth_measurement: tool({
      description:
        'Record a growth measurement (weight and/or body lengths) for an animal the user has access to. Confirm details with the user before calling.',
      inputSchema: z.object({
        animalId: z.string().describe('Internal ID or org animal ID'),
        date: z.string().describe('Measurement date, ISO format'),
        ...MEASUREMENT_FIELDS,
        notes: z.string().optional(),
      }),
      execute: guarded('add_growth_measurement', async (args) => {
        const animal = await findAccessibleAnimal(context, args.animalId);
        const hasMeasurement = Object.keys(MEASUREMENT_FIELDS).some(
          (field) => args[field as keyof typeof args] != null
        );
        if (!hasMeasurement) {
          throw new WallyToolError('Provide at least one measurement (weight or a length)');
        }
        const measurement = await prisma.growthMeasurement.create({
          data: {
            animalId: animal.id,
            date: parseDateInput(args.date, 'measurement date'),
            weightGrams: args.weightGrams ?? null,
            headLengthMm: args.headLengthMm ?? null,
            earLengthMm: args.earLengthMm ?? null,
            armLengthMm: args.armLengthMm ?? null,
            legLengthMm: args.legLengthMm ?? null,
            footLengthMm: args.footLengthMm ?? null,
            tailLengthMm: args.tailLengthMm ?? null,
            bodyLengthMm: args.bodyLengthMm ?? null,
            wingLengthMm: args.wingLengthMm ?? null,
            notes: args.notes ?? null,
            clerkUserId: userId,
            clerkOrganizationId: orgId,
          },
        });
        logAudit({
          userId,
          orgId,
          action: 'CREATE',
          entity: 'GrowthMeasurement',
          entityId: measurement.id,
          metadata: { animalId: animal.id, via: 'wally' },
        });
        return { created: omitInternalUserFields(measurement) };
      }),
    }),

    growth_calculator: tool({
      description:
        'Run growth calculations against species reference curves. Two modes: (1) estimate birth date from measurements taken on a date; (2) check expected weight and weight-for-age at a known age in days. Use this instead of computing growth figures yourself.',
      inputSchema: z.object({
        speciesName: z.string().describe('Species name with growth reference data'),
        sex: z.enum(['Male', 'Female', 'Unknown']).optional(),
        measurements: z
          .object(MEASUREMENT_FIELDS)
          .optional()
          .describe('Measurements for birth date estimation'),
        measurementDate: z
          .string()
          .optional()
          .describe('Date the measurements were taken, ISO format; required with measurements'),
        ageDays: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('Known age in days, for predicted weight / weight-for-age'),
        actualWeightGrams: z
          .number()
          .positive()
          .optional()
          .describe('Actual weight to compare against the predicted weight at ageDays'),
      }),
      execute: guarded('growth_calculator', async (args) => {
        const referenceData = await loadGrowthReference(args.speciesName, args.sex);
        const result: Record<string, unknown> = {
          speciesName: args.speciesName,
          sex: args.sex ?? 'any',
          referencePoints: referenceData.length,
        };

        if (args.measurements && Object.values(args.measurements).some((v) => v != null)) {
          if (!args.measurementDate) {
            throw new WallyToolError('measurementDate is required when measurements are provided');
          }
          const estimation = estimateBirthDate(
            referenceData,
            args.measurements as Partial<Record<MeasurementField, number>>,
            parseDateInput(args.measurementDate, 'measurement date')
          );
          result.birthDateEstimation = {
            estimates: estimation.estimates.map((e) => ({
              field: e.field,
              label: e.label,
              value: e.value,
              estimatedAgeDays: e.estimatedAgeDays,
              estimatedBirthDate: e.estimatedBirthDate.toISOString().slice(0, 10),
            })),
            medianEstimatedAgeDays: estimation.medianEstimatedAgeDays,
            medianEstimatedBirthDate:
              estimation.medianEstimatedBirthDate?.toISOString().slice(0, 10) ?? null,
          };
        }

        if (args.ageDays != null) {
          const predictedWeightGrams = calculatePredictedWeight(referenceData, args.ageDays);
          const weightCheck: Record<string, unknown> = {
            ageDays: args.ageDays,
            predictedWeightGrams,
          };
          if (args.actualWeightGrams != null && predictedWeightGrams != null) {
            const wfa = calculateWFA(referenceData, args.ageDays, args.actualWeightGrams);
            weightCheck.actualWeightGrams = args.actualWeightGrams;
            weightCheck.weightForAgeGrams = wfa;
            weightCheck.status = wfa != null ? getWFAStatus(wfa, predictedWeightGrams) : null;
          }
          result.weightCheck = weightCheck;
        }

        if (result.birthDateEstimation == null && result.weightCheck == null) {
          throw new WallyToolError(
            'Provide either measurements + measurementDate (birth date estimation) or ageDays (weight check)'
          );
        }
        return result;
      }),
    }),

    run_report_query: tool({
      description:
        'Run one or more read-only reporting queries in the WildTrack360 QL grammar (documented in your Custom Reporting guide) and get aggregate results. Requires a coordinator or admin role.',
      inputSchema: z.object({
        queries: z
          .array(z.string().min(1))
          .min(1)
          .max(10)
          .describe(
            'QL lines, e.g. ["count from animals where status = IN_CARE group by species"]'
          ),
        start: z.string().optional().describe('Default window start, YYYY-MM-DD'),
        end: z.string().optional().describe('Default window end, YYYY-MM-DD'),
      }),
      execute: guarded('run_report_query', async (args) => {
        if (!canPreviewReports(role)) {
          throw new WallyToolError(`Forbidden: your role (${role}) cannot run report queries`);
        }
        const lines = args.queries.map((q: string) => q.trim()).filter((q: string) => q.length > 0);
        if (lines.length === 0) return { results: [] };
        const parseDate = (value?: string) => {
          if (!value) return undefined;
          const d = new Date(value);
          return Number.isNaN(d.getTime()) ? undefined : d;
        };
        const carerNamesById = lines.some((q: string) =>
          /\b(?:carerName|animal_assignments)\b/i.test(q)
        )
          ? await getReportCarerNamesById(orgId)
          : undefined;
        const results = await evaluateCustomQueries(lines, {
          prisma: prisma as unknown as QueryablePrisma,
          orgId,
          defaultStart: parseDate(args.start),
          defaultEnd: parseDate(args.end),
          carerNamesById,
        });
        return { results };
      }),
    }),
  };
}
