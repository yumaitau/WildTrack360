import { z } from 'zod';
import { defineContract } from '@/lib/openapi/contract';

// All upload routes are multipart/form-data - no request.body in contracts;
// handlers read ctx.request.formData() directly.

export const uploadPhotoContract = defineContract({
  method: 'post',
  path: '/api/upload',
  summary: 'Upload an animal gallery photo (multipart/form-data: file, animalId, description)',
  tags: ['Upload'],
  security: 'clerkSession',
  responses: {
    201: { description: 'Created photo record', schema: z.object({}).passthrough() },
  },
  successStatus: 201,
});

export const uploadDocumentContract = defineContract({
  method: 'post',
  path: '/api/upload/document',
  summary: 'Upload a PDF compliance document (multipart/form-data: file)',
  tags: ['Upload'],
  security: 'clerkSession',
  responses: {
    201: {
      description: 'Uploaded document key',
      schema: z.object({ key: z.string(), fileName: z.string() }),
    },
  },
  successStatus: 201,
});

export const uploadImageContract = defineContract({
  method: 'post',
  path: '/api/upload/image',
  summary: 'Upload an animal primary photo (multipart/form-data: file) - no DB record',
  tags: ['Upload'],
  security: 'clerkSession',
  responses: {
    201: { description: 'S3 key for the uploaded image', schema: z.object({ url: z.string() }) },
  },
  successStatus: 201,
});
