// Access policy for custom-QL reporting.
//
// Custom QL returns organisation-wide aggregates, so it is limited to roles that
// already have org-wide visibility: ADMIN and COORDINATOR_ALL. Species-scoped
// coordinators and carers are excluded so they cannot read aggregates spanning
// data they are not otherwise entitled to see.
//
// Pure (only a type import) so it can be shared by server guards, the page
// route, and client components alike.

import type { OrgRole } from '@prisma/client';

export function canUseCustomReports(role: OrgRole | string): boolean {
  return role === 'ADMIN' || role === 'COORDINATOR_ALL';
}
