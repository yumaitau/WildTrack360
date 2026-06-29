import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

export const ReportMapEntrySchema = z
  .object({
    id: z.string(),
    species: z.string().nullable(),
    location: z.string().nullable(),
    lat: z.number(),
    lng: z.number(),
    callerName: z.string(),
    dateTime: z.string(),
    status: z.string(),
  })
  .openapi('ReportMapEntry');

export type ReportMapEntry = z.infer<typeof ReportMapEntrySchema>;

export const carerContactsReportContract = defineContract({
  method: 'get',
  path: '/api/reports/carer-contacts',
  summary: 'Download carer contact report as CSV or XLSX',
  tags: ['Reports'],
  security: 'clerkSession',
  request: {
    query: z.object({
      format: z.enum(['csv', 'xlsx']).optional(),
      active: z.string().optional(),
      licence: z.string().optional(),
      specialty: z.string().optional(),
    }),
  },
  responses: {
    200: { description: 'Report file (CSV or XLSX)', schema: z.unknown().openapi('ReportFile') },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
  successStatus: 200,
});

export const reportMapContract = defineContract({
  method: 'get',
  path: '/api/reports/map',
  summary: 'Get geocoded call log entries for the reports map',
  tags: ['Reports'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Map entries', schema: z.array(ReportMapEntrySchema) },
    400: { description: 'Organization ID required' },
    401: { description: 'Unauthorized' },
  },
  successStatus: 200,
});
