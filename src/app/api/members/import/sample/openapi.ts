import { defineContract } from '@/lib/openapi/contract';

export const sampleImportTemplateContract = defineContract({
  method: 'get',
  path: '/api/members/import/sample',
  summary: 'Download a sample member import CSV template',
  tags: ['Members'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Sample member CSV template', content: 'text/csv' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Feature not enabled' },
  },
  successStatus: 200,
});
