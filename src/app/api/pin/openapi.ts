import { z } from 'zod';
import { defineContract } from '@/lib/openapi/contract';

// Both routes use public PIN token auth (no Clerk session).
// Body is hand-validated in handlers - do NOT declare request.body here.

export const submitPinContract = defineContract({
  method: 'post',
  path: '/api/pin/{id}/submit',
  summary: 'Submit a pindrop form (public, authenticated via PIN token in ?t=)',
  tags: ['Pindrop'],
  security: 'public',
  request: {
    params: z.object({ id: z.string() }),
    query: z.object({ t: z.string() }),
  },
  responses: {
    200: { description: 'Form submitted', schema: z.object({ success: z.boolean() }) },
    401: { description: 'Missing or invalid token', schema: z.object({ error: z.string() }) },
    404: { description: 'Invalid or expired link', schema: z.object({ error: z.string() }) },
    409: { description: 'Form already submitted', schema: z.object({ error: z.string() }) },
  },
  successStatus: 200,
});

export const uploadPinPhotoContract = defineContract({
  method: 'post',
  path: '/api/pin/{id}/upload',
  summary: 'Upload a photo for a pindrop session (public, multipart/form-data, ?t= token)',
  tags: ['Pindrop'],
  security: 'public',
  request: {
    params: z.object({ id: z.string() }),
    query: z.object({ t: z.string() }),
  },
  responses: {
    200: { description: 'Photo uploaded', schema: z.object({ url: z.string() }) },
    401: { description: 'Missing token', schema: z.object({ error: z.string() }) },
    404: { description: 'Invalid session', schema: z.object({ error: z.string() }) },
    409: { description: 'Session already submitted', schema: z.object({ error: z.string() }) },
  },
  successStatus: 200,
});
