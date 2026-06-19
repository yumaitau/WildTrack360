import { z } from 'zod';
import { defineContract } from '@/lib/openapi/contract';

const AuditLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  orgId: z.string(),
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string().nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.string().openapi({ format: 'date-time' }),
});

export const listAuditLogsContract = defineContract({
  method: 'get',
  path: '/api/audit-logs',
  summary: 'List audit logs with pagination and filters',
  tags: ['Audit'],
  security: 'clerkSession',
  request: {
    query: z.object({
      page: z.string().optional(),
      pageSize: z.string().optional(),
      action: z.string().optional(),
      entity: z.string().optional(),
      user: z.string().optional(),
      userId: z.string().optional(),
      sortBy: z.string().optional(),
      sortDir: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Paginated audit logs',
      schema: z.object({
        data: z.array(AuditLogSchema),
        pagination: z.object({
          page: z.number(),
          pageSize: z.number(),
          total: z.number(),
          totalPages: z.number(),
        }),
      }),
    },
  },
  successStatus: 200,
});
