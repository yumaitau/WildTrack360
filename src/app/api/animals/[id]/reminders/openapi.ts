import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

const isoDate = () => z.string().openapi({ format: 'date-time' });

/** Serialised Prisma AnimalReminder. Mirrors prisma/schema.prisma model AnimalReminder. */
export const AnimalReminderSchema = z
  .object({
    id: z.string(),
    animalId: z.string(),
    message: z.string(),
    isActive: z.boolean(),
    expiresAt: isoDate().nullable(),
    createdByUserId: z.string(),
    createdByName: z.string().nullable(),
    createdAt: isoDate(),
    updatedAt: isoDate(),
    clerkOrganizationId: z.string(),
  })
  .openapi('AnimalReminder');

const ReminderCreateSchema = z
  .object({
    // .trim() preserves the original handler's whitespace-only rejection
    // (message.trim().length === 0 -> 400).
    message: z.string().trim().min(1),
    expiresAt: z.string().nullable().optional().openapi({ format: 'date-time' }),
  })
  .passthrough()
  .openapi('AnimalReminderCreate');

const idParams = z.object({ id: z.string() });

export const listRemindersContract = defineContract({
  method: 'get',
  path: '/api/animals/{id}/reminders',
  summary: 'List active reminders for an animal',
  tags: ['Animals'],
  security: 'clerkSession',
  request: { params: idParams },
  responses: {
    200: { description: 'Active, non-expired reminders (newest first)', schema: z.array(AnimalReminderSchema) },
    401: { description: 'Unauthorized' },
  },
  successStatus: 200,
});

export const createReminderContract = defineContract({
  method: 'post',
  path: '/api/animals/{id}/reminders',
  summary: 'Create a reminder for an animal',
  tags: ['Animals'],
  security: 'clerkSession',
  request: { params: idParams, body: ReminderCreateSchema },
  responses: {
    201: { description: 'The created reminder', schema: AnimalReminderSchema },
    400: { description: 'Invalid request body' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Animal not found' },
  },
  successStatus: 201,
});
