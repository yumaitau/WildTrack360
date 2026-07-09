import { test as teardown } from '@playwright/test';
import { sweepAll } from './helpers';

// Runs after the admin project (config `teardown: "cleanup"`). Final safety net
// so the staging tenant never accumulates E2E records if a spec crashed before
// its own delete. Loads the app first so the session cookie is fresh for the
// page.request API calls.
teardown('sweep leftover E2E data', async ({ page }) => {
  await page.goto('/');
  const deleted = await sweepAll(page.request);
  console.log(`[e2e-staging-teardown] deleted ${deleted} leftover record(s)`);
});
