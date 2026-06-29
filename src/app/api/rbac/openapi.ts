import { z } from 'zod';
import { defineContract } from '@/lib/openapi/contract';

export const assignCoordinatorContract = defineContract({
  method: 'post',
  path: '/api/rbac/coordinator-assignments',
  summary: 'Assign a coordinator to a species group',
  tags: ['RBAC'],
  security: 'clerkSession',
  request: {
    body: z.object({
      orgMemberId: z.string(),
      speciesGroupId: z.string(),
    }),
  },
  responses: {
    201: { description: 'Assignment created', schema: z.object({}).passthrough() },
  },
  successStatus: 201,
});

export const removeCoordinatorContract = defineContract({
  method: 'delete',
  path: '/api/rbac/coordinator-assignments',
  summary: 'Remove a coordinator from a species group',
  tags: ['RBAC'],
  security: 'clerkSession',
  request: {
    body: z.object({
      orgMemberId: z.string(),
      speciesGroupId: z.string(),
    }),
  },
  responses: {
    200: { description: 'Assignment removed', schema: z.object({ ok: z.boolean() }) },
  },
  successStatus: 200,
});

export const getMyRoleContract = defineContract({
  method: 'get',
  path: '/api/rbac/my-role',
  summary: 'Get the current user role and org member record',
  tags: ['RBAC'],
  security: 'clerkSession',
  responses: {
    200: {
      description: 'Role and org member info',
      schema: z.object({
        userId: z.string(),
        orgId: z.string(),
        role: z.string().nullable(),
        orgMember: z.object({}).passthrough().nullable(),
      }),
    },
  },
  successStatus: 200,
});

export const provisionRoleContract = defineContract({
  method: 'post',
  path: '/api/rbac/provision',
  summary: 'Self-provision admin role for a Clerk org admin',
  tags: ['RBAC'],
  security: 'clerkSession',
  responses: {
    201: { description: 'OrgMember record created', schema: z.object({}).passthrough() },
  },
  successStatus: 201,
});

export const listRolesContract = defineContract({
  method: 'get',
  path: '/api/rbac/roles',
  summary: 'List all role assignments for the org',
  tags: ['RBAC'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Org members with roles', schema: z.array(z.object({}).passthrough()) },
  },
  successStatus: 200,
});

export const setRoleContract = defineContract({
  method: 'post',
  path: '/api/rbac/roles',
  summary: 'Assign a role to a user',
  tags: ['RBAC'],
  security: 'clerkSession',
  request: {
    body: z.object({
      targetUserId: z.string(),
      role: z.enum(['ADMIN', 'COORDINATOR_ALL', 'COORDINATOR', 'CARER_ALL', 'CARER']),
    }),
  },
  responses: {
    200: { description: 'Updated org member', schema: z.object({}).passthrough() },
  },
  successStatus: 200,
});

export const listSpeciesGroupsContract = defineContract({
  method: 'get',
  path: '/api/rbac/species-groups',
  summary: 'List all species groups for the org',
  tags: ['RBAC'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Species groups', schema: z.array(z.object({}).passthrough()) },
  },
  successStatus: 200,
});

export const createSpeciesGroupContract = defineContract({
  method: 'post',
  path: '/api/rbac/species-groups',
  summary: 'Create a new species group',
  tags: ['RBAC'],
  security: 'clerkSession',
  request: {
    body: z.object({
      slug: z.string(),
      name: z.string(),
      description: z.string().optional(),
      speciesNames: z.array(z.string()),
    }),
  },
  responses: {
    201: { description: 'Created species group', schema: z.object({}).passthrough() },
  },
  successStatus: 201,
});

export const updateSpeciesGroupContract = defineContract({
  method: 'patch',
  path: '/api/rbac/species-groups/{id}',
  summary: 'Update a species group',
  tags: ['RBAC'],
  security: 'clerkSession',
  request: {
    params: z.object({ id: z.string() }),
    body: z.object({
      name: z.string().optional(),
      slug: z.string().optional(),
      description: z.string().optional(),
      speciesNames: z.array(z.string()).optional(),
    }),
  },
  responses: {
    200: { description: 'Updated species group', schema: z.object({}).passthrough() },
  },
  successStatus: 200,
});

export const deleteSpeciesGroupContract = defineContract({
  method: 'delete',
  path: '/api/rbac/species-groups/{id}',
  summary: 'Delete a species group',
  tags: ['RBAC'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Deletion confirmed', schema: z.object({ ok: z.boolean() }) },
  },
  successStatus: 200,
});
