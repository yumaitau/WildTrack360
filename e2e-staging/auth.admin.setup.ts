import { test as setup, expect } from '@playwright/test';
import { signIn } from '../e2e/clerk-auth';
import { ADMIN_STATE } from './constants';

// Signs in once as the staging ADMIN user (OrgRole ADMIN in the staging tenant)
// and persists the session for the CRUD + access specs to reuse. Uses password
// auth if E2E_ADMIN_PASSWORD is set, else a Backend-API sign-in token.
const identifier = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

setup('authenticate admin', async ({ page }) => {
  if (!identifier) {
    throw new Error('E2E_ADMIN_EMAIL (email or username) is required.');
  }

  await signIn(page, identifier, password);

  // Admin lands in the app, sees the compliance section (COORDINATOR+ only).
  await page.goto('/compliance');
  await expect(page).not.toHaveURL(/\/sign-in/);
  await expect(page).not.toHaveURL(/\/$/); // not bounced to home by the role gate

  await page.context().storageState({ path: ADMIN_STATE });
});
