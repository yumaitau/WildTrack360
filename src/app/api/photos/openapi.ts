import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

export const deletePhotoContract = defineContract({
  method: 'delete',
  path: '/api/photos/delete/{id}',
  summary: 'Delete a gallery photo (Photo record + S3 object)',
  tags: ['Photos'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Photo deleted', schema: z.object({ success: z.boolean() }) },
  },
  successStatus: 200,
});

export const servePhotoContract = defineContract({
  method: 'get',
  path: '/api/photos/serve',
  summary: 'Authenticated S3 photo proxy - returns raw image bytes',
  tags: ['Photos'],
  security: 'clerkSession',
  request: {
    query: z.object({ key: z.string() }),
  },
  responses: {
    200: {
      description: 'Image binary',
      schema: z.unknown().openapi('PhotoBinary'),
      content: 'image/*',
    },
  },
  successStatus: 200,
});
