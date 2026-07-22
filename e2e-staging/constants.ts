import path from 'node:path';

// Saved Clerk sessions per role so the spec projects don't each re-authenticate.
export const ADMIN_STATE = path.join(
  process.cwd(),
  'playwright/.clerk/staging-admin.json',
);
export const CARER_STATE = path.join(
  process.cwd(),
  'playwright/.clerk/staging-carer.json',
);

export const COORDINATOR_ALL_STATE = path.join(
  process.cwd(),
  'playwright/.clerk/staging-coordinator-all.json',
);

export const COORDINATOR_STATE = path.join(
  process.cwd(),
  'playwright/.clerk/staging-coordinator.json',
);

export const CARER_ALL_STATE = path.join(
  process.cwd(),
  'playwright/.clerk/staging-carer-all.json',
);

export const RBAC_FIXTURES = {
  koala: 'E2E-RBAC-KOALA',
  kangaroo: 'E2E-RBAC-KANGAROO',
  possum: 'E2E-RBAC-POSSUM',
} as const;

// Every record the CRUD specs create stamps a free-text field (name / title /
// notes) with a value starting with this marker. Specs delete their own record
// as the "D" in CRUD; the teardown project sweeps anything a crashed run left
// behind (see helpers.ts).
export const E2E_MARKER = 'E2E-STAGING';

// A per-record unique marker so parallel-safe lookups never collide and teardown
// can match precisely. Index keeps it stable within a single spec file run.
let seq = 0;
export function mark(label = ''): string {
  seq += 1;
  return `${E2E_MARKER}-${label}${label ? '-' : ''}${seq}`;
}
