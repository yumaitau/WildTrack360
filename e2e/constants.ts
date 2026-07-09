import path from 'node:path';

// Saved Clerk session so the spec projects don't each re-authenticate.
export const STORAGE_STATE = path.join(
  process.cwd(),
  'playwright/.clerk/user.json',
);

// Every write the suite makes (none yet — the daily monitor is read-only) is
// tagged with this marker in a free-text field so a teardown sweep can find and
// delete exactly what the run created. Kept here so it's ready when write-path
// specs are added.
export const E2E_MARKER = 'E2E-MONITOR';
