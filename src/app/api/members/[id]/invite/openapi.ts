import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';
import { OkSchema } from '../../openapi';

export const invitePortalMemberContract = defineContract({
  method: 'post',
  path: '/api/members/{id}/invite',
  summary: 'Send or re-send a member portal invitation',
  tags: ['Members'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Invitation sent', schema: OkSchema },
    400: { description: 'Already active or other invite error' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Member not found or feature not enabled' },
  },
  successStatus: 200,
});
