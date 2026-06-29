import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

const ImportRowResultSchema = z.object({
  row: z.number().int(),
  email: z.string().optional(),
  status: z.enum(['created', 'skipped', 'failed']),
  reason: z.string().optional(),
});

export const ImportResultSchema = z
  .object({
    total: z.number().int(),
    created: z.number().int(),
    skipped: z.number().int(),
    failed: z.number().int(),
    results: z.array(ImportRowResultSchema),
  })
  .openapi('MemberImportResult');

// No request body schema: the handler parses multipart OR JSON itself, so the
// route() wrapper must not consume the body.
export const importMembersContract = defineContract({
  method: 'post',
  path: '/api/members/import',
  summary: 'Import members from a CSV (multipart file or JSON {csv})',
  tags: ['Members'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Import result', schema: ImportResultSchema },
    400: { description: 'No CSV supplied, empty CSV, or no data rows' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Feature not enabled' },
  },
  successStatus: 200,
});
