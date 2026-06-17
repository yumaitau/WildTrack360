import { z } from 'zod';
import type { ZodOpenApiPathsObject } from 'zod-openapi';
import { errorResponses, ok200, created201 } from '../responses';
import {
  CarerProfileDetail,
  EnrichedCarer,
  UpdateCarerProfileBody,
  CarerMapEntry,
  CarerTraining,
  CreateCarerTrainingBody,
  OrgMember,
  MyRoleResponse,
  AssignRoleBody,
  CoordinatorAssignmentBody,
  CoordinatorAssignment,
  SpeciesGroup,
  CreateSpeciesGroupBody,
  AuditLogPage,
  CarerInterest,
  UpdateCarerInterestBody,
} from '../schemas/carers';

const idParam = z.string().openapi({ param: { name: 'id', in: 'path' }, description: 'Resource ID.' });

export const carersPaths: ZodOpenApiPathsObject = {

  // --- Carers ---
  '/api/carers': {
    get: {
      tags: ['Carers'],
      summary: 'List carers (org members enriched with profile data) for the organisation',
      operationId: 'listCarers',
      requestParams: {
        query: z.object({
          orgId: z.string().optional().openapi({ description: 'Organisation ID (resolved from session if omitted).' }),
          assignable: z
            .enum(['true', 'false'])
            .optional()
            .openapi({ description: 'When "true", only carers with a complete profile (hasProfile) are returned.' }),
          species: z
            .string()
            .optional()
            .openapi({ description: 'Filter to carers eligible for this species via species-group assignments.' }),
        }),
      },
      responses: {
        ...ok200(z.array(EnrichedCarer)),
        ...errorResponses(400, 401, 500),
      },
    },
  },

  '/api/carers/{id}': {
    get: {
      tags: ['Carers'],
      summary: 'Get a carer (org member enriched with profile data)',
      operationId: 'getCarer',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(EnrichedCarer),
        ...errorResponses(401, 403, 404, 500),
      },
    },
    patch: {
      tags: ['Carers'],
      summary: 'Update a carer profile',
      operationId: 'updateCarer',
      requestParams: { path: z.object({ id: idParam }) },
      requestBody: {
        content: { 'application/json': { schema: UpdateCarerProfileBody } },
      },
      responses: {
        ...ok200(CarerProfileDetail),
        ...errorResponses(401, 403, 500),
      },
    },
  },

  '/api/carers/map': {
    get: {
      tags: ['Carers'],
      summary: 'Get geocoded carer locations for map display',
      operationId: 'getCarerMap',
      requestParams: {
        query: z.object({
          orgId: z.string().optional(),
        }),
      },
      responses: {
        ...ok200(z.array(CarerMapEntry)),
        ...errorResponses(400, 401, 500),
      },
    },
  },

  // --- Carer Training ---
  '/api/carer-training': {
    get: {
      tags: ['Carer Training'],
      summary: 'List training records for the organisation',
      operationId: 'listCarerTrainings',
      requestParams: {
        query: z.object({
          orgId: z.string().optional(),
          carerId: z.string().optional().openapi({ description: 'Filter by carer ID.' }),
        }),
      },
      responses: {
        ...ok200(z.array(CarerTraining)),
        ...errorResponses(400, 401, 500),
      },
    },
    post: {
      tags: ['Carer Training'],
      summary: 'Create a training record',
      operationId: 'createCarerTraining',
      requestBody: {
        content: { 'application/json': { schema: CreateCarerTrainingBody } },
      },
      responses: {
        ...created201(CarerTraining),
        ...errorResponses(400, 401, 404, 500),
      },
    },
  },

  '/api/carer-training/{id}': {
    get: {
      tags: ['Carer Training'],
      summary: 'Get a training record',
      operationId: 'getCarerTraining',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(CarerTraining),
        ...errorResponses(401, 404, 500),
      },
    },
    patch: {
      tags: ['Carer Training'],
      summary: 'Update a training record',
      operationId: 'updateCarerTraining',
      requestParams: { path: z.object({ id: idParam }) },
      requestBody: {
        content: { 'application/json': { schema: CreateCarerTrainingBody.partial() } },
      },
      responses: {
        ...ok200(CarerTraining),
        ...errorResponses(401, 404, 500),
      },
    },
    delete: {
      tags: ['Carer Training'],
      summary: 'Delete a training record',
      operationId: 'deleteCarerTraining',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(z.object({ success: z.boolean() })),
        ...errorResponses(401, 404, 500),
      },
    },
  },

  // --- RBAC ---
  '/api/rbac/my-role': {
    get: {
      tags: ['RBAC'],
      summary: "Get the current user's role in the organisation",
      operationId: 'getMyRole',
      responses: {
        ...ok200(MyRoleResponse),
        ...errorResponses(401, 500),
      },
    },
  },

  '/api/rbac/provision': {
    post: {
      tags: ['RBAC'],
      summary: 'Self-provision an ADMIN OrgMember record for a Clerk org:admin',
      operationId: 'provisionRole',
      responses: {
        ...created201(OrgMember),
        ...errorResponses(401, 403, 409, 500),
      },
    },
  },

  '/api/rbac/roles': {
    get: {
      tags: ['RBAC'],
      summary: 'List all org members and their roles (admin only)',
      operationId: 'listOrgMembers',
      responses: {
        ...ok200(z.array(OrgMember)),
        ...errorResponses(401, 403, 500),
      },
    },
    post: {
      tags: ['RBAC'],
      summary: 'Assign or update a role for an org member (admin only)',
      operationId: 'assignRole',
      requestBody: {
        content: { 'application/json': { schema: AssignRoleBody } },
      },
      responses: {
        ...ok200(OrgMember),
        ...errorResponses(400, 401, 403, 500),
      },
    },
  },

  '/api/rbac/coordinator-assignments': {
    post: {
      tags: ['RBAC'],
      summary: 'Assign a coordinator to a species group',
      operationId: 'createCoordinatorAssignment',
      requestBody: {
        content: { 'application/json': { schema: CoordinatorAssignmentBody } },
      },
      responses: {
        ...created201(CoordinatorAssignment),
        ...errorResponses(400, 401, 403, 500),
      },
    },
    delete: {
      tags: ['RBAC'],
      summary: 'Remove a coordinator from a species group',
      operationId: 'deleteCoordinatorAssignment',
      requestBody: {
        content: { 'application/json': { schema: CoordinatorAssignmentBody } },
      },
      responses: {
        ...ok200(z.object({ ok: z.boolean() })),
        ...errorResponses(400, 401, 403, 500),
      },
    },
  },

  '/api/rbac/species-groups': {
    get: {
      tags: ['RBAC'],
      summary: 'List species groups for the organisation',
      operationId: 'listSpeciesGroups',
      responses: {
        ...ok200(z.array(SpeciesGroup)),
        ...errorResponses(401, 500),
      },
    },
    post: {
      tags: ['RBAC'],
      summary: 'Create a species group',
      operationId: 'createSpeciesGroup',
      requestBody: {
        content: { 'application/json': { schema: CreateSpeciesGroupBody } },
      },
      responses: {
        ...created201(SpeciesGroup),
        ...errorResponses(400, 401, 403, 500),
      },
    },
  },

  '/api/rbac/species-groups/{id}': {
    patch: {
      tags: ['RBAC'],
      summary: 'Update a species group',
      operationId: 'updateSpeciesGroup',
      requestParams: { path: z.object({ id: idParam }) },
      requestBody: {
        content: { 'application/json': { schema: CreateSpeciesGroupBody.partial() } },
      },
      responses: {
        ...ok200(SpeciesGroup),
        ...errorResponses(401, 403, 500),
      },
    },
    delete: {
      tags: ['RBAC'],
      summary: 'Delete a species group',
      operationId: 'deleteSpeciesGroup',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(z.object({ ok: z.boolean() })),
        ...errorResponses(401, 403, 500),
      },
    },
  },

  // --- Audit Logs ---
  '/api/audit-logs': {
    get: {
      tags: ['Audit'],
      summary: 'List audit logs (admin only)',
      operationId: 'listAuditLogs',
      requestParams: {
        query: z.object({
          page: z.string().optional().openapi({ description: 'Page number (default 1).' }),
          pageSize: z.string().optional().openapi({ description: 'Results per page, max 100 (default 25).' }),
          action: z.string().optional().openapi({ description: 'Filter by AuditAction.' }),
          entity: z.string().optional().openapi({ description: 'Filter by entity type.' }),
          user: z.string().optional().openapi({ description: 'Filter by userId, userName, or userEmail.' }),
          sortBy: z.string().optional().openapi({ description: '"createdAt", "action", or "entity".' }),
          sortDir: z.enum(['asc', 'desc']).optional(),
        }),
      },
      responses: {
        ...ok200(AuditLogPage),
        ...errorResponses(401, 403, 500),
      },
    },
  },

  // --- Features ---
  '/api/features/me': {
    get: {
      tags: ['Admin'],
      summary: "Get feature flags enabled for the current user's organisation",
      operationId: 'getMyFeatures',
      responses: {
        ...ok200(
          z.record(z.string(), z.boolean()).openapi({ description: 'Map of Feature key to enabled boolean.' }),
        ),
        ...errorResponses(401),
      },
    },
  },

  // --- Admin: Carer Interest ---
  '/api/admin/carer-interest': {
    get: {
      tags: ['Admin'],
      summary: 'List carer interest applications (admin only, MEMBERSHIP_PLATFORM feature-gated)',
      operationId: 'listCarerInterests',
      responses: {
        ...ok200(z.object({ interests: z.array(CarerInterest) })),
        ...errorResponses(401, 403, 404, 500),
      },
    },
    patch: {
      tags: ['Admin'],
      summary: 'Update the status of a carer interest application',
      operationId: 'updateCarerInterest',
      requestBody: {
        content: { 'application/json': { schema: UpdateCarerInterestBody } },
      },
      responses: {
        ...ok200(CarerInterest),
        ...errorResponses(400, 401, 403, 404, 500),
      },
    },
  },
};
