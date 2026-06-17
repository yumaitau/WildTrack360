import { z } from 'zod';
import type { ZodOpenApiPathsObject } from 'zod-openapi';
import { errorResponses, ok200, created201 } from '../responses';
import {
  SpeciesEntry,
  CreateSpeciesBody,
  AssetEntry,
  CreateAssetBody,
  CallLogEntry,
  CreateCallLogBody,
  CallLogLookupsResponse,
  CreateCallLogLookupBody,
  UpdateCallLogLookupBody,
  DeleteCallLogLookupBody,
  PindropSession,
  CreatePindropBody,
  PhotoUploadResult,
  ImageUploadResult,
  DocumentUploadResult,
} from '../schemas/misc';

const idParam = z.string().openapi({ param: { name: 'id', in: 'path' }, description: 'Resource ID.' });
const entityTypeParam = z.string().openapi({ param: { name: 'entityType', in: 'path' }, description: 'Form template entity type (e.g. "animal", "member").' });

export const miscPaths: ZodOpenApiPathsObject = {

  // --- Species ---
  '/api/species': {
    get: {
      tags: ['Species'],
      summary: 'List species for the organisation',
      operationId: 'listSpecies',
      requestParams: {
        query: z.object({
          orgId: z.string().optional(),
        }),
      },
      responses: {
        ...ok200(z.array(SpeciesEntry)),
        ...errorResponses(400, 401, 403, 500),
      },
    },
    post: {
      tags: ['Species'],
      summary: 'Create a species entry',
      operationId: 'createSpecies',
      requestBody: {
        content: { 'application/json': { schema: CreateSpeciesBody } },
      },
      responses: {
        ...created201(SpeciesEntry),
        ...errorResponses(400, 401, 500),
      },
    },
    patch: {
      tags: ['Species'],
      summary: 'Bulk-rename a species across all animals',
      operationId: 'renameSpecies',
      requestBody: {
        content: {
          'application/json': {
            schema: z.object({ oldName: z.string(), newName: z.string() }),
          },
        },
      },
      responses: {
        ...ok200(z.object({ count: z.number().int() })),
        ...errorResponses(401, 500),
      },
    },
    delete: {
      tags: ['Species'],
      summary: 'Bulk-delete a species by name',
      operationId: 'deleteSpeciesByName',
      requestBody: {
        content: {
          'application/json': {
            schema: z.object({ name: z.string() }),
          },
        },
      },
      responses: {
        ...ok200(z.object({ count: z.number().int() })),
        ...errorResponses(401, 500),
      },
    },
  },

  '/api/species/{id}': {
    get: {
      tags: ['Species'],
      summary: 'Get a species entry',
      operationId: 'getSpecies',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(SpeciesEntry),
        ...errorResponses(401, 404, 500),
      },
    },
    patch: {
      tags: ['Species'],
      summary: 'Update a species entry',
      operationId: 'updateSpecies',
      requestParams: { path: z.object({ id: idParam }) },
      requestBody: {
        content: { 'application/json': { schema: CreateSpeciesBody.partial() } },
      },
      responses: {
        ...ok200(SpeciesEntry),
        ...errorResponses(401, 404, 500),
      },
    },
    delete: {
      tags: ['Species'],
      summary: 'Delete a species entry',
      operationId: 'deleteSpecies',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(z.object({ success: z.boolean() })),
        ...errorResponses(401, 404, 500),
      },
    },
  },

  '/api/species/bulk-delete': {
    post: {
      tags: ['Species'],
      summary: 'Bulk-delete species entries by ID',
      operationId: 'bulkDeleteSpecies',
      requestBody: {
        content: {
          'application/json': {
            schema: z.object({ ids: z.array(z.string()).openapi({ description: 'Non-empty array of species IDs.' }) }),
          },
        },
      },
      responses: {
        ...ok200(z.object({ count: z.number().int() })),
        ...errorResponses(400, 401, 500),
      },
    },
  },

  '/api/species/seed': {
    post: {
      tags: ['Species'],
      summary: 'Seed default species list for the organisation',
      operationId: 'seedSpecies',
      responses: {
        ...ok200(
          z.object({
            inserted: z.number().int(),
            message: z.string().optional(),
          }),
        ),
        ...errorResponses(400, 401, 500),
      },
    },
  },

  // --- Form templates ---
  '/api/form-templates/{entityType}': {
    get: {
      tags: ['Forms'],
      summary: 'Get form template for an entity type',
      operationId: 'getFormTemplate',
      requestParams: { path: z.object({ entityType: entityTypeParam }) },
      responses: {
        ...ok200(z.unknown().openapi({ description: 'Form template JSON structure.' })),
        ...errorResponses(401, 403, 404),
      },
    },
    put: {
      tags: ['Forms'],
      summary: 'Save or replace a form template for an entity type',
      operationId: 'putFormTemplate',
      requestParams: { path: z.object({ entityType: entityTypeParam }) },
      requestBody: {
        content: {
          'application/json': {
            schema: z.unknown().openapi({ description: 'Form template JSON structure (must include a "name" field).' }),
          },
        },
      },
      responses: {
        ...ok200(z.unknown().openapi({ description: 'Saved form template.' })),
        ...errorResponses(400, 401, 403, 404),
      },
    },
  },

  // --- Assets ---
  '/api/assets': {
    get: {
      tags: ['Admin'],
      summary: 'List assets for the organisation',
      operationId: 'listAssets',
      responses: {
        ...ok200(z.array(AssetEntry)),
        ...errorResponses(400, 401, 500),
      },
    },
    post: {
      tags: ['Admin'],
      summary: 'Create an asset',
      operationId: 'createAsset',
      requestBody: {
        content: { 'application/json': { schema: CreateAssetBody } },
      },
      responses: {
        ...created201(AssetEntry),
        ...errorResponses(400, 401, 500),
      },
    },
  },

  '/api/assets/{id}': {
    patch: {
      tags: ['Admin'],
      summary: 'Update an asset',
      operationId: 'updateAsset',
      requestParams: { path: z.object({ id: idParam }) },
      requestBody: {
        content: { 'application/json': { schema: CreateAssetBody.partial() } },
      },
      responses: {
        ...ok200(AssetEntry),
        ...errorResponses(401, 404, 500),
      },
    },
    delete: {
      tags: ['Admin'],
      summary: 'Delete an asset',
      operationId: 'deleteAsset',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(z.object({ success: z.boolean() })),
        ...errorResponses(401, 404, 500),
      },
    },
  },

  // --- Uploads ---
  '/api/upload': {
    post: {
      tags: ['Uploads & Photos'],
      summary: 'Upload a photo for an animal (multipart/form-data)',
      operationId: 'uploadAnimalPhoto',
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: z.object({
              file: z.unknown().openapi({ description: 'Image file (JPEG, PNG, WebP, GIF; max 10 MB).' }),
              animalId: z.string(),
              description: z.string(),
            }),
          },
        },
      },
      responses: {
        ...created201(PhotoUploadResult),
        ...errorResponses(400, 401, 403, 404, 500),
      },
    },
  },

  '/api/upload/image': {
    post: {
      tags: ['Uploads & Photos'],
      summary: 'Upload a generic image to S3 (multipart/form-data)',
      operationId: 'uploadImage',
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: z.object({
              file: z.unknown().openapi({ description: 'Image file (JPEG, PNG, WebP, GIF; max 10 MB).' }),
            }),
          },
        },
      },
      responses: {
        ...created201(ImageUploadResult),
        ...errorResponses(400, 401, 500),
      },
    },
  },

  '/api/upload/document': {
    post: {
      tags: ['Uploads & Photos'],
      summary: 'Upload a PDF document to S3 (multipart/form-data)',
      operationId: 'uploadDocument',
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: z.object({
              file: z.unknown().openapi({ description: 'PDF file (max 20 MB).' }),
            }),
          },
        },
      },
      responses: {
        ...created201(DocumentUploadResult),
        ...errorResponses(400, 401, 403, 500),
      },
    },
  },

  // --- Photos ---
  '/api/photos/delete/{id}': {
    delete: {
      tags: ['Uploads & Photos'],
      summary: 'Delete an animal photo and its S3 object',
      operationId: 'deletePhoto',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(z.object({ success: z.boolean() })),
        ...errorResponses(400, 401, 403, 404, 500),
      },
    },
  },

  '/api/photos/serve': {
    get: {
      tags: ['Uploads & Photos'],
      summary: 'Serve a photo from S3 (streams binary image data)',
      operationId: 'servePhoto',
      requestParams: {
        query: z.object({
          key: z.string().openapi({ description: 'S3 object key.' }),
        }),
      },
      responses: {
        '200': {
          description: 'Binary image data (JPEG, PNG, WebP, or GIF).',
          content: { 'image/*': { schema: z.string() } },
        },
        ...errorResponses(400, 401, 403, 404, 500, 502),
      },
    },
  },

  // --- PIN (public, no Clerk session) ---
  '/api/pin/{id}/submit': {
    post: {
      tags: ['PIN'],
      summary: 'Submit caller details for a pindrop session (public)',
      operationId: 'pinSubmit',
      security: [],
      requestParams: {
        path: z.object({ id: idParam }),
        query: z.object({
          token: z.string().openapi({ description: 'One-time access token from the SMS link.' }),
        }),
      },
      requestBody: {
        content: {
          'application/json': {
            schema: z.object({
              callerName: z.string().optional(),
              callerEmail: z.string().optional(),
              callerPhone: z.string().optional(),
              lat: z.number().optional(),
              lng: z.number().optional(),
              address: z.string().optional(),
              callerNotes: z.string().optional(),
            }),
          },
        },
      },
      responses: {
        ...ok200(z.object({ success: z.boolean() })),
        ...errorResponses(400, 401, 404, 409),
      },
    },
  },

  '/api/pin/{id}/upload': {
    post: {
      tags: ['PIN'],
      summary: 'Upload a photo within a pindrop session (public, multipart/form-data)',
      operationId: 'pinUpload',
      security: [],
      requestParams: {
        path: z.object({ id: idParam }),
        query: z.object({
          token: z.string().openapi({ description: 'One-time access token from the SMS link.' }),
        }),
      },
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: z.object({
              file: z.unknown().openapi({ description: 'Image file (max 10 MB).' }),
            }),
          },
        },
      },
      responses: {
        ...ok200(z.object({ url: z.string() })),
        ...errorResponses(400, 401, 404, 409, 500),
      },
    },
  },

  // --- Pindrop ---
  '/api/pindrop': {
    post: {
      tags: ['Pindrop'],
      summary: 'Create a pindrop session and send an SMS link to the caller',
      operationId: 'createPindrop',
      requestBody: {
        content: { 'application/json': { schema: CreatePindropBody } },
      },
      responses: {
        ...created201(z.object({ id: z.string(), url: z.string() })),
        ...errorResponses(400, 401, 404, 422, 500),
      },
    },
  },

  '/api/pindrop/{id}': {
    get: {
      tags: ['Pindrop'],
      summary: 'Get a pindrop session',
      operationId: 'getPindrop',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(PindropSession),
        ...errorResponses(401, 404),
      },
    },
    delete: {
      tags: ['Pindrop'],
      summary: 'Delete a pindrop session',
      operationId: 'deletePindrop',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(z.object({ ok: z.boolean() })),
        ...errorResponses(401, 404),
      },
    },
  },

  // --- Call Logs ---
  '/api/call-logs': {
    get: {
      tags: ['Reports'],
      summary: 'List call logs for the organisation',
      operationId: 'listCallLogs',
      responses: {
        ...ok200(z.array(CallLogEntry)),
        ...errorResponses(401, 500),
      },
    },
    post: {
      tags: ['Reports'],
      summary: 'Create a call log entry',
      operationId: 'createCallLog',
      requestBody: {
        content: { 'application/json': { schema: CreateCallLogBody } },
      },
      responses: {
        ...created201(CallLogEntry),
        ...errorResponses(400, 401, 500),
      },
    },
  },

  '/api/call-logs/{id}': {
    get: {
      tags: ['Reports'],
      summary: 'Get a call log entry',
      operationId: 'getCallLog',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(CallLogEntry),
        ...errorResponses(401, 404, 500),
      },
    },
    patch: {
      tags: ['Reports'],
      summary: 'Update a call log entry',
      operationId: 'updateCallLog',
      requestParams: { path: z.object({ id: idParam }) },
      requestBody: {
        content: { 'application/json': { schema: CreateCallLogBody.partial() } },
      },
      responses: {
        ...ok200(CallLogEntry),
        ...errorResponses(400, 401, 403, 404, 500),
      },
    },
    delete: {
      tags: ['Reports'],
      summary: 'Delete a call log entry',
      operationId: 'deleteCallLog',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(z.object({ success: z.boolean() })),
        ...errorResponses(401, 404, 500),
      },
    },
  },

  // --- Call Log Lookups ---
  '/api/call-log-lookups': {
    get: {
      tags: ['Reports'],
      summary: 'List call log lookup values (reasons, referrers, actions, outcomes)',
      operationId: 'listCallLogLookups',
      requestParams: {
        query: z.object({
          type: z.enum(['reason', 'referrer', 'action', 'outcome']).optional().openapi({
            description: 'Filter to a single lookup list. Omit to return all four.',
          }),
        }),
      },
      responses: {
        ...ok200(CallLogLookupsResponse),
        ...errorResponses(401, 500),
      },
    },
    post: {
      tags: ['Reports'],
      summary: 'Create a call log lookup value',
      operationId: 'createCallLogLookup',
      requestBody: {
        content: { 'application/json': { schema: CreateCallLogLookupBody } },
      },
      responses: {
        ...created201(z.object({ id: z.string(), label: z.string() })),
        ...errorResponses(400, 401, 500),
      },
    },
    patch: {
      tags: ['Reports'],
      summary: 'Update a call log lookup value',
      operationId: 'updateCallLogLookup',
      requestBody: {
        content: { 'application/json': { schema: UpdateCallLogLookupBody } },
      },
      responses: {
        ...ok200(z.object({ id: z.string(), label: z.string() })),
        ...errorResponses(400, 401, 404, 500),
      },
    },
    delete: {
      tags: ['Reports'],
      summary: 'Delete a call log lookup value',
      operationId: 'deleteCallLogLookup',
      requestBody: {
        content: { 'application/json': { schema: DeleteCallLogLookupBody } },
      },
      responses: {
        ...ok200(z.object({ success: z.boolean() })),
        ...errorResponses(400, 401, 404, 500),
      },
    },
  },

  '/api/call-log-lookups/seed-defaults': {
    post: {
      tags: ['Reports'],
      summary: 'Seed default call log lookup values for the organisation',
      operationId: 'seedCallLogLookups',
      responses: {
        ...created201(z.object({ message: z.string() })),
        ...errorResponses(400, 401),
      },
    },
  },
};
