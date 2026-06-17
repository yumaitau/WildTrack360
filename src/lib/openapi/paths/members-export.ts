import { z } from 'zod';
import type { ZodOpenApiPathsObject } from 'zod-openapi';

import { security } from '../security';
import { errorResponses, csv200, mergeResponses } from '../responses';

export const membersExportPaths: ZodOpenApiPathsObject = {
  '/api/members/export': {
    get: {
      operationId: 'exportMembers',
      tags: ['Members'],
      summary: 'Export member list as CSV',
      description:
        'Requires the MEMBERSHIP_PLATFORM feature flag (returns 404 if not enabled). ' +
        'Requires `member:view_all` permission. ' +
        'Returns a UTF-8 CSV with standard columns plus any active custom form fields.',
      security: security.clerkSession as unknown as Record<string, string[]>[],
      requestParams: {
        query: z.object({
          includeArchived: z
            .enum(['true', 'false'])
            .optional()
            .openapi({ description: 'Include archived members in the export. Defaults to false.' }),
        }),
      },
      responses: mergeResponses(
        {
          ...csv200('Members CSV download'),
          '200': {
            description: 'Members CSV download',
            headers: {
              'Content-Disposition': {
                description: 'attachment; filename="members-YYYY-MM-DD.csv"',
                schema: { type: 'string' },
              },
            },
            content: {
              'text/csv': {
                schema: z.string().openapi({ description: 'CSV with standard + custom field columns' }),
              },
            },
          },
        },
        errorResponses(401, 403, 404),
      ),
    },
  },
};
