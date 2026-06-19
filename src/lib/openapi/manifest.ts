// Manifest - side-effect imports of every co-located route contract (openapi.ts)
// so the shared registry is fully populated before the OpenAPI document is
// generated. The CI coverage script (scripts/openapi-coverage.ts) asserts that
// every src/app/api/**/openapi.ts is imported here.
//
// Contracts are added as each domain is migrated.

// Animals domain
import '@/app/api/animals/openapi';
import '@/app/api/animals/[id]/openapi';
import '@/app/api/animals/[id]/growth/openapi';
import '@/app/api/animals/[id]/growth/[measurementId]/openapi';
import '@/app/api/animals/[id]/reminders/openapi';
import '@/app/api/animals/[id]/reminders/[reminderId]/openapi';

export {};
