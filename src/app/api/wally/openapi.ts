import { z } from 'zod';
import { defineContract } from '@/lib/openapi/contract';

export const wallyContract = defineContract({
  method: 'post',
  path: '/api/wally',
  summary: 'Send a message to the Wally AI assistant (streams plain-text response)',
  tags: ['Wally'],
  security: 'clerkSession',
  responses: {
    200: {
      description: 'Streaming AI response',
      schema: z.unknown().openapi('WallyStream'),
      content: 'text/plain',
    },
  },
  successStatus: 200,
});
