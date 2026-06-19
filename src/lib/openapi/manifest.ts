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

// Members domain
import '@/app/api/members/openapi';
import '@/app/api/members/[id]/openapi';
import '@/app/api/members/[id]/invite/openapi';
import '@/app/api/members/export/openapi';
import '@/app/api/members/impact-stats/openapi';
import '@/app/api/members/import/openapi';
import '@/app/api/members/import/sample/openapi';
import '@/app/api/members/messages/openapi';

// Portal domain
import '@/app/api/portal/openapi';
import '@/app/api/portal/me/openapi';
import '@/app/api/portal/carer-interest/openapi';
import '@/app/api/portal/household/openapi';
import '@/app/api/portal/messages/openapi';
import '@/app/api/portal/messages/[id]/read/openapi';
import '@/app/api/portal/news/openapi';
import '@/app/api/portal/tiers/openapi';
import '@/app/api/portal/subscriptions/openapi';
import '@/app/api/portal/square-config/openapi';
import '@/app/api/portal/checkout/donation/openapi';
import '@/app/api/portal/checkout/membership/openapi';
import '@/app/api/portal/checkout/recurring-donation/openapi';
import '@/app/api/portal/subscriptions/[id]/cancel/openapi';
import '@/app/api/portal/subscriptions/[id]/card/openapi';

export {};
