import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

export const SendMemberMessageSchema = z
  .object({
    memberIds: z.array(z.string()),
    subject: z.string(),
    body: z.string(),
    sendEmail: z.boolean().optional(),
  })
  .openapi('SendMemberMessage');

export const SendMessageResultSchema = z
  .object({
    created: z.number().int(),
    emailed: z.number().int(),
  })
  .openapi('SendMessageResult');

export const sendMemberMessagesContract = defineContract({
  method: 'post',
  path: '/api/members/messages',
  summary: 'Send a message to one or more members',
  tags: ['Members'],
  security: 'clerkSession',
  request: { body: SendMemberMessageSchema },
  responses: {
    200: { description: 'Message send result', schema: SendMessageResultSchema },
    400: { description: 'Invalid request, recipient cap exceeded, or compose error' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Feature not enabled' },
  },
  successStatus: 200,
});
