// Manifest - side-effect imports of every co-located route contract (openapi.ts)
// so the shared registry is fully populated before the OpenAPI document is
// generated. The CI coverage script (scripts/openapi-coverage.ts) asserts that
// every src/app/api/**/openapi.ts is imported here.
//
// Contracts are added as each domain is migrated.

// Assets domain
import '@/app/api/assets/openapi';

// Carer training domain
import '@/app/api/carer-training/openapi';

// Hygiene domain
import '@/app/api/hygiene/openapi';

// Incidents domain
import '@/app/api/incidents/openapi';

// Post-release monitoring domain
import '@/app/api/post-release-monitoring/openapi';

// Transfers domain
import '@/app/api/transfers/openapi';

// Permanent care applications domain
import '@/app/api/permanent-care-applications/openapi';

// Release checklists domain
import '@/app/api/release-checklists/openapi';

// Call logs domain
import '@/app/api/call-logs/openapi';

// Call log lookups domain
import '@/app/api/call-log-lookups/openapi';

// Species domain
import '@/app/api/species/openapi';

// Growth references domain
import '@/app/api/growth-references/openapi';

// Membership tiers domain
import '@/app/api/membership-tiers/openapi';

// News domain
import '@/app/api/news/openapi';

// Carers domain
import '@/app/api/carers/openapi';

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

// Report queries domain
import '@/app/api/report-queries/openapi';

// Reports domain
import '@/app/api/reports/openapi';

// Admin domain
import '@/app/api/admin/openapi';

// Audit logs domain
import '@/app/api/audit-logs/openapi';

// Membership grants domain
import '@/app/api/membership-grants/openapi';

// Admin notification dismissals domain
import '@/app/api/admin-notification-dismissals/openapi';

// RBAC domain
import '@/app/api/rbac/openapi';

// Pindrop domain
import '@/app/api/pindrop/openapi';

// Pin (public pindrop form) domain
import '@/app/api/pin/openapi';

// Form templates domain
import '@/app/api/form-templates/openapi';

// Custom forms domain
import '@/app/api/custom-forms/openapi';

// Records domain
import '@/app/api/records/openapi';

// Wally AI domain
import '@/app/api/wally/openapi';

// Upload domain
import '@/app/api/upload/openapi';

// Photos domain
import '@/app/api/photos/openapi';

// Square domain
import '@/app/api/square/openapi';

// Internal cron/ops domain
import '@/app/api/internal/openapi';

// Keepalive domain
import '@/app/api/keepalive/openapi';

// Payments domain
import '@/app/api/payments/openapi';

// Feed roster domain
import '@/app/api/feed-roster/openapi';

// SMS status domain
import '@/app/api/sms-status/openapi';

// Weather domain
import '@/app/api/weather/openapi';

// Features domain
import '@/app/api/features/me/openapi';

// Public checkout domain
import '@/app/api/public/checkout/openapi';

// Documentation routes
import '@/app/api/docs/openapi';
import '@/app/api/openapi/openapi';

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
