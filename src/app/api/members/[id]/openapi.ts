import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';
import { MemberSchema, MemberWithMembershipsSchema, MemberUpdateSchema, OkSchema } from '../openapi';

const idParams = z.object({ id: z.string() });

export const getMemberContract = defineContract({
  method: 'get',
  path: '/api/members/{id}',
  summary: 'Get a member by ID',
  tags: ['Members'],
  security: 'clerkSession',
  request: { params: idParams },
  responses: {
    200: { description: 'The member with memberships', schema: MemberWithMembershipsSchema },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Member not found or feature not enabled' },
  },
  successStatus: 200,
});

export const updateMemberContract = defineContract({
  method: 'patch',
  path: '/api/members/{id}',
  summary: 'Update a member',
  tags: ['Members'],
  security: 'clerkSession',
  request: { params: idParams, body: MemberUpdateSchema },
  responses: {
    200: { description: 'The updated member', schema: MemberSchema },
    400: { description: 'Invalid request or validation error' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Member not found or feature not enabled' },
  },
  successStatus: 200,
});

export const deleteMemberContract = defineContract({
  method: 'delete',
  path: '/api/members/{id}',
  summary: 'Archive a member',
  tags: ['Members'],
  security: 'clerkSession',
  request: { params: idParams },
  responses: {
    200: { description: 'Member archived', schema: OkSchema },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Member not found or feature not enabled' },
  },
  successStatus: 200,
});
