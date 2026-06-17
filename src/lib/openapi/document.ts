import 'zod-openapi/extend';
import { createDocument } from 'zod-openapi';
import type { ZodOpenApiObject } from 'zod-openapi';

import { TAGS } from './tags';
import { securitySchemes, security } from './security';
import { animalsPaths } from './paths/animals';
import { publicPaths } from './paths/public';
import { squarePaths } from './paths/square';
import { membersExportPaths } from './paths/members-export';
import { lifecyclePaths } from './paths/lifecycle';
import { carersPaths } from './paths/carers';
import { miscPaths } from './paths/misc';
import { membersPaths } from './paths/members';
import { portalPaths } from './paths/portal';
import { adminPaths } from './paths/admin';
import { reportsPaths } from './paths/reports';
import { internalPaths } from './paths/internal';

/**
 * Assembles the full OpenAPI 3.1 document.
 *
 * Import only from src/lib/openapi/* and zod/zod-openapi.
 * Never import route handlers, @/lib/prisma, @/lib/clerk-server, or @/lib/rbac
 * (all transitively import server-only which crashes tsx at generate time).
 */
export function buildDocument() {
  const doc: ZodOpenApiObject = {
    openapi: '3.1.0',
    info: {
      title: 'WildTrack360 API',
      version: '1.0.0',
      description:
        'REST API for WildTrack360 - wildlife conservation management covering animal lifecycle, ' +
        'carer compliance, membership, payments, and regulatory reporting.',
    },
    // Server is the origin root; paths carry the full /api/... prefix so path
    // keys are globally unique and match the extractor output from src/app/api.
    servers: [
      { url: '/', description: 'Current origin' },
    ],
    tags: TAGS.map(t => ({ name: t.name, description: t.description })),
    components: {
      securitySchemes,
      schemas: {},
    },
    // Default security: Clerk session applies to all operations unless overridden.
    security: security.clerkSession as unknown as Record<string, string[]>[],
    paths: {
      // Task 2 pilot paths
      ...animalsPaths,
      ...publicPaths,
      ...squarePaths,
      ...membersExportPaths,
      // Task 4: Animals & clinical lifecycle
      ...lifecyclePaths,
      // Task 5: Carers, training, RBAC, audit, features
      ...carersPaths,
      // Task 6: Species, forms, assets, uploads, photos, PIN, pindrop, call-logs
      ...miscPaths,
      // Task 7: Members, membership tiers, grants, news, permanent care
      ...membersPaths,
      // Task 8: Portal
      ...portalPaths,
      // Task 9: Public checkout & Payments/Square (extended squarePaths/publicPaths above)
      // Task 10: Admin, reports, weather, wally, internal plumbing
      ...adminPaths,
      ...reportsPaths,
      ...internalPaths,
    },
  };

  return createDocument(doc);
}
