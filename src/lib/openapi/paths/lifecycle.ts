import { z } from 'zod';
import type { ZodOpenApiPathsObject } from 'zod-openapi';
import { errorResponses, ok200, created201 } from '../responses';
import {
  GrowthMeasurementBase,
  CreateGrowthMeasurementBody,
  AnimalReminderBase,
  CreateAnimalReminderBody,
  SpeciesGrowthReference,
  BirthDateEstimateResult,
  EstimateBirthDateBody,
  AnimalRecord,
  CreateRecordBody,
  ReleaseChecklist,
  CreateReleaseChecklistBody,
  PostReleaseRecord,
  CreatePostReleaseBody,
  AnimalTransfer,
  CreateTransferBody,
  TransferCreatedResult,
  HygieneLog,
  CreateHygieneLogBody,
  IncidentReport,
  CreateIncidentBody,
} from '../schemas/lifecycle';

const idParam = z.string().openapi({ param: { name: 'id', in: 'path' }, description: 'Resource ID.' });
const animalIdParam = z.string().openapi({ param: { name: 'id', in: 'path' }, description: 'Animal ID.' });
const measurementIdParam = z.string().openapi({ param: { name: 'measurementId', in: 'path' }, description: 'Growth measurement ID.' });
const reminderIdParam = z.string().openapi({ param: { name: 'reminderId', in: 'path' }, description: 'Reminder ID.' });

export const lifecyclePaths: ZodOpenApiPathsObject = {

  // --- Peek animal ID ---
  '/api/animals/peek-id': {
    get: {
      tags: ['Animals'],
      summary: 'Preview the next auto-generated animal ID',
      operationId: 'peekAnimalId',
      requestParams: {
        query: z.object({
          species: z.string().optional().openapi({ description: 'Species name for ID prefix.' }),
          intakeDate: z.string().optional().openapi({ description: 'ISO 8601 date to base the ID on. Defaults to today.' }),
        }),
      },
      responses: {
        ...ok200(z.object({ preview: z.string() })),
        ...errorResponses(401),
      },
    },
  },

  // --- Animal growth measurements ---
  '/api/animals/{id}/growth': {
    get: {
      tags: ['Growth & References'],
      summary: 'List growth measurements for an animal',
      operationId: 'listGrowthMeasurements',
      requestParams: { path: z.object({ id: animalIdParam }) },
      responses: {
        ...ok200(z.array(GrowthMeasurementBase)),
        ...errorResponses(401, 403, 404, 500),
      },
    },
    post: {
      tags: ['Growth & References'],
      summary: 'Record a new growth measurement',
      operationId: 'createGrowthMeasurement',
      requestParams: { path: z.object({ id: animalIdParam }) },
      requestBody: {
        content: { 'application/json': { schema: CreateGrowthMeasurementBody } },
      },
      responses: {
        ...created201(GrowthMeasurementBase),
        ...errorResponses(401, 403, 404, 500),
      },
    },
  },

  '/api/animals/{id}/growth/{measurementId}': {
    delete: {
      tags: ['Growth & References'],
      summary: 'Delete a growth measurement',
      operationId: 'deleteGrowthMeasurement',
      requestParams: {
        path: z.object({ id: animalIdParam, measurementId: measurementIdParam }),
      },
      responses: {
        ...ok200(z.object({ success: z.boolean() })),
        ...errorResponses(401, 403, 404, 500),
      },
    },
  },

  // --- Animal reminders ---
  '/api/animals/{id}/reminders': {
    get: {
      tags: ['Growth & References'],
      summary: 'List reminders for an animal',
      operationId: 'listAnimalReminders',
      requestParams: { path: z.object({ id: animalIdParam }) },
      responses: {
        ...ok200(z.array(AnimalReminderBase)),
        ...errorResponses(401, 500),
      },
    },
    post: {
      tags: ['Growth & References'],
      summary: 'Create a reminder for an animal',
      operationId: 'createAnimalReminder',
      requestParams: { path: z.object({ id: animalIdParam }) },
      requestBody: {
        content: { 'application/json': { schema: CreateAnimalReminderBody } },
      },
      responses: {
        ...created201(AnimalReminderBase),
        ...errorResponses(400, 401, 403, 404, 500),
      },
    },
  },

  '/api/animals/{id}/reminders/{reminderId}': {
    delete: {
      tags: ['Growth & References'],
      summary: 'Delete a reminder',
      operationId: 'deleteAnimalReminder',
      requestParams: {
        path: z.object({ id: animalIdParam, reminderId: reminderIdParam }),
      },
      responses: {
        ...ok200(z.object({ ok: z.boolean() })),
        ...errorResponses(401, 403, 404, 500),
      },
    },
  },

  // --- Species growth references ---
  '/api/growth-references': {
    get: {
      tags: ['Growth & References'],
      summary: 'Fetch growth reference data for a species',
      operationId: 'listGrowthReferences',
      requestParams: {
        query: z.object({
          speciesName: z.string().openapi({ description: 'Species name (required, case-insensitive).' }),
          sex: z.string().optional().openapi({ description: '"Male", "Female", or "Unknown".' }),
        }),
      },
      responses: {
        ...ok200(z.array(SpeciesGrowthReference)),
        ...errorResponses(400, 401, 500),
      },
    },
  },

  '/api/growth-references/species': {
    get: {
      tags: ['Growth & References'],
      summary: 'List species names that have growth reference data',
      operationId: 'listGrowthReferenceSpecies',
      responses: {
        ...ok200(z.array(z.string())),
        ...errorResponses(401, 500),
      },
    },
  },

  '/api/growth-references/estimate-birth-date': {
    post: {
      tags: ['Growth & References'],
      summary: 'Estimate birth date from growth measurements',
      operationId: 'estimateBirthDate',
      requestBody: {
        content: { 'application/json': { schema: EstimateBirthDateBody } },
      },
      responses: {
        ...ok200(BirthDateEstimateResult),
        ...errorResponses(400, 401, 404, 500),
      },
    },
  },

  // --- Records ---
  '/api/records': {
    post: {
      tags: ['Records'],
      summary: 'Create an animal record',
      operationId: 'createRecord',
      requestParams: {
        query: z.object({
          orgId: z.string().optional().openapi({ description: 'Organization ID (resolved from session if omitted).' }),
        }),
      },
      requestBody: {
        content: { 'application/json': { schema: CreateRecordBody } },
      },
      responses: {
        ...created201(AnimalRecord),
        ...errorResponses(400, 401, 403, 404, 500),
      },
    },
  },

  // --- Release checklists ---
  '/api/release-checklists': {
    get: {
      tags: ['Releases & Post-Release'],
      summary: 'List release checklists for the organisation',
      operationId: 'listReleaseChecklists',
      requestParams: {
        query: z.object({
          orgId: z.string().optional(),
        }),
      },
      responses: {
        ...ok200(z.array(ReleaseChecklist)),
        ...errorResponses(400, 401, 500),
      },
    },
    post: {
      tags: ['Releases & Post-Release'],
      summary: 'Create a release checklist',
      operationId: 'createReleaseChecklist',
      requestBody: {
        content: { 'application/json': { schema: CreateReleaseChecklistBody } },
      },
      responses: {
        ...created201(ReleaseChecklist),
        ...errorResponses(400, 401, 500),
      },
    },
  },

  // --- Post-release monitoring ---
  '/api/post-release-monitoring': {
    get: {
      tags: ['Releases & Post-Release'],
      summary: 'List post-release monitoring records',
      operationId: 'listPostReleaseRecords',
      responses: {
        ...ok200(z.array(PostReleaseRecord)),
        ...errorResponses(400, 401, 500),
      },
    },
    post: {
      tags: ['Releases & Post-Release'],
      summary: 'Create a post-release monitoring record',
      operationId: 'createPostReleaseRecord',
      requestBody: {
        content: { 'application/json': { schema: CreatePostReleaseBody } },
      },
      responses: {
        ...created201(PostReleaseRecord),
        ...errorResponses(400, 401, 403, 404, 500),
      },
    },
  },

  '/api/post-release-monitoring/{id}': {
    get: {
      tags: ['Releases & Post-Release'],
      summary: 'Get a post-release monitoring record',
      operationId: 'getPostReleaseRecord',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(PostReleaseRecord),
        ...errorResponses(401, 404, 500),
      },
    },
    patch: {
      tags: ['Releases & Post-Release'],
      summary: 'Update a post-release monitoring record',
      operationId: 'updatePostReleaseRecord',
      requestParams: { path: z.object({ id: idParam }) },
      requestBody: {
        content: { 'application/json': { schema: CreatePostReleaseBody.partial() } },
      },
      responses: {
        ...ok200(PostReleaseRecord),
        ...errorResponses(401, 403, 404, 500),
      },
    },
    delete: {
      tags: ['Releases & Post-Release'],
      summary: 'Delete a post-release monitoring record',
      operationId: 'deletePostReleaseRecord',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(z.object({ success: z.boolean() })),
        ...errorResponses(401, 403, 404, 500),
      },
    },
  },

  // --- Transfers ---
  '/api/transfers': {
    get: {
      tags: ['Transfers'],
      summary: 'List animal transfers for the organisation',
      operationId: 'listTransfers',
      responses: {
        ...ok200(z.array(AnimalTransfer)),
        ...errorResponses(401, 500),
      },
    },
    post: {
      tags: ['Transfers'],
      summary: 'Record a new animal transfer',
      operationId: 'createTransfer',
      requestBody: {
        content: { 'application/json': { schema: CreateTransferBody } },
      },
      responses: {
        ...created201(TransferCreatedResult),
        ...errorResponses(400, 401, 403, 404, 422, 500),
      },
    },
  },

  '/api/transfers/{id}': {
    get: {
      tags: ['Transfers'],
      summary: 'Get a transfer record',
      operationId: 'getTransfer',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(AnimalTransfer),
        ...errorResponses(401, 404, 500),
      },
    },
    patch: {
      tags: ['Transfers'],
      summary: 'Update a transfer record',
      operationId: 'updateTransfer',
      requestParams: { path: z.object({ id: idParam }) },
      requestBody: {
        content: { 'application/json': { schema: CreateTransferBody.partial() } },
      },
      responses: {
        ...ok200(AnimalTransfer),
        ...errorResponses(401, 403, 404, 500),
      },
    },
    delete: {
      tags: ['Transfers'],
      summary: 'Delete a transfer record',
      operationId: 'deleteTransfer',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(z.object({ ok: z.boolean() })),
        ...errorResponses(401, 403, 404, 500),
      },
    },
  },

  // --- Hygiene logs ---
  '/api/hygiene': {
    get: {
      tags: ['Hygiene'],
      summary: 'List hygiene logs for the organisation',
      operationId: 'listHygieneLogs',
      responses: {
        ...ok200(z.array(HygieneLog)),
        ...errorResponses(400, 401, 500),
      },
    },
    post: {
      tags: ['Hygiene'],
      summary: 'Create a hygiene log entry',
      operationId: 'createHygieneLog',
      requestBody: {
        content: { 'application/json': { schema: CreateHygieneLogBody } },
      },
      responses: {
        ...created201(HygieneLog),
        ...errorResponses(400, 401, 500),
      },
    },
  },

  '/api/hygiene/{id}': {
    get: {
      tags: ['Hygiene'],
      summary: 'Get a hygiene log entry',
      operationId: 'getHygieneLog',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(HygieneLog),
        ...errorResponses(401, 404, 500),
      },
    },
    patch: {
      tags: ['Hygiene'],
      summary: 'Update a hygiene log entry',
      operationId: 'updateHygieneLog',
      requestParams: { path: z.object({ id: idParam }) },
      requestBody: {
        content: { 'application/json': { schema: CreateHygieneLogBody.partial() } },
      },
      responses: {
        ...ok200(HygieneLog),
        ...errorResponses(401, 404, 500),
      },
    },
    delete: {
      tags: ['Hygiene'],
      summary: 'Delete a hygiene log entry',
      operationId: 'deleteHygieneLog',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(z.object({ success: z.boolean() })),
        ...errorResponses(401, 404, 500),
      },
    },
  },

  // --- Incident reports ---
  '/api/incidents': {
    get: {
      tags: ['Incidents'],
      summary: 'List incident reports for the organisation',
      operationId: 'listIncidents',
      responses: {
        ...ok200(z.array(IncidentReport)),
        ...errorResponses(400, 401, 500),
      },
    },
    post: {
      tags: ['Incidents'],
      summary: 'Create an incident report',
      operationId: 'createIncident',
      requestBody: {
        content: { 'application/json': { schema: CreateIncidentBody } },
      },
      responses: {
        ...created201(IncidentReport),
        ...errorResponses(400, 401, 500),
      },
    },
  },

  '/api/incidents/{id}': {
    get: {
      tags: ['Incidents'],
      summary: 'Get an incident report',
      operationId: 'getIncident',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(IncidentReport),
        ...errorResponses(401, 404, 500),
      },
    },
    patch: {
      tags: ['Incidents'],
      summary: 'Update an incident report',
      operationId: 'updateIncident',
      requestParams: { path: z.object({ id: idParam }) },
      requestBody: {
        content: { 'application/json': { schema: CreateIncidentBody.partial() } },
      },
      responses: {
        ...ok200(IncidentReport),
        ...errorResponses(401, 404, 500),
      },
    },
    delete: {
      tags: ['Incidents'],
      summary: 'Delete an incident report',
      operationId: 'deleteIncident',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(z.object({ success: z.boolean() })),
        ...errorResponses(401, 404, 500),
      },
    },
  },
};
