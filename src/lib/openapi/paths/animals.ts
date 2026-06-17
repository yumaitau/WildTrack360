import { z } from 'zod';
import type { ZodOpenApiPathsObject } from 'zod-openapi';

import { security } from '../security';
import { errorResponses, ok200, created201, mergeResponses } from '../responses';
import {
  AnimalWithRelations,
  CreateAnimalBody,
  UpdateAnimalBody,
} from '../schemas/animals';

export const animalsPaths: ZodOpenApiPathsObject = {
  '/api/animals': {
    get: {
      operationId: 'listAnimals',
      tags: ['Animals'],
      summary: 'List animals for an organisation',
      description:
        'Returns all animals the calling user can access. Access is scoped by role: ' +
        'ADMIN/COORDINATOR_ALL/CARER_ALL see all org animals; COORDINATOR sees their assigned species groups; ' +
        'CARER sees only their own animals.',
      security: security.clerkSession as unknown as Record<string, string[]>[],
      requestParams: {
        query: z.object({
          orgId: z
            .string()
            .optional()
            .openapi({ description: 'Organisation ID. Defaults to the active Clerk org from the session.' }),
        }),
      },
      responses: mergeResponses(
        ok200(z.array(AnimalWithRelations), 'Array of animals visible to the caller'),
        errorResponses(400, 401, 403, 500),
      ),
    },
    post: {
      operationId: 'createAnimal',
      tags: ['Animals'],
      summary: 'Create a new animal',
      description: 'Requires `animal:create` permission (ADMIN or COORDINATOR role).',
      security: security.clerkSession as unknown as Record<string, string[]>[],
      requestBody: {
        description: 'Animal fields',
        content: { 'application/json': { schema: CreateAnimalBody } },
        required: true,
      },
      responses: mergeResponses(
        created201(AnimalWithRelations, 'Animal created'),
        errorResponses(400, 401, 403, 422, 500),
      ),
    },
  },

  '/api/animals/{id}': {
    patch: {
      operationId: 'updateAnimal',
      tags: ['Animals'],
      summary: 'Update an animal',
      description:
        'Partial update. CARER can only edit their assigned animal; ' +
        'COORDINATOR is restricted to their species groups; ADMIN/COORDINATOR_ALL/CARER_ALL have full access. ' +
        'Status transitions are validated by compliance guardrails (override requires `compliance:override_validation`).',
      security: security.clerkSession as unknown as Record<string, string[]>[],
      requestParams: {
        path: z.object({
          id: z.string().openapi({ description: 'Animal ID (CUID)' }),
        }),
      },
      requestBody: {
        description: 'Fields to update (partial)',
        content: { 'application/json': { schema: UpdateAnimalBody } },
        required: true,
      },
      responses: mergeResponses(
        ok200(AnimalWithRelations, 'Updated animal'),
        errorResponses(401, 403, 404, 422, 500),
      ),
    },
    delete: {
      operationId: 'deleteAnimal',
      tags: ['Animals'],
      summary: 'Delete an animal',
      description: 'Requires `animal:delete` permission (ADMIN only).',
      security: security.clerkSession as unknown as Record<string, string[]>[],
      requestParams: {
        path: z.object({
          id: z.string().openapi({ description: 'Animal ID (CUID)' }),
        }),
      },
      responses: mergeResponses(
        ok200(z.object({ ok: z.literal(true) }), 'Animal deleted'),
        errorResponses(401, 403, 404, 500),
      ),
    },
  },
};
