import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';
import { isoDate } from '../openapi';

const MessageSchema = z.object({
  id: z.string(),
  subject: z.string(),
  body: z.string(),
  sentByName: z.string().nullable(),
  readAt: isoDate().nullable(),
  createdAt: isoDate(),
});

const MessagesResponseSchema = z
  .object({
    messages: z.array(MessageSchema),
    nextCursor: z.string().nullable(),
  })
  .openapi('PortalMessages');

export const getMessagesContract = defineContract({
  method: 'get',
  path: '/api/portal/messages',
  summary: 'List portal member messages',
  tags: ['Portal'],
  security: 'clerkSession',
  request: {
    query: z.object({
      limit: z.string().optional(),
      cursor: z.string().optional(),
    }),
  },
  responses: {
    200: { description: 'Paginated message list', schema: MessagesResponseSchema },
    401: { description: 'Unauthorized' },
    404: { description: 'No membership or feature not enabled' },
  },
  successStatus: 200,
});
