import { test as setup, expect } from '@playwright/test';
import { signIn } from './clerk-auth';
import { STORAGE_STATE } from './constants';

// Signs in once as the E2E user (member of the throwaway E2E monitor org) and
// persists the session for the spec projects to reuse. Uses password auth if
// E2E_CLERK_USER_PASSWORD is set, else a Backend-API sign-in token — see
// clerk-auth.ts.
const identifier = process.env.E2E_CLERK_USER_EMAIL;
const password = process.env.E2E_CLERK_USER_PASSWORD;

setup('authenticate', async ({ page }) => {
  if (!identifier) {
    throw new Error('E2E_CLERK_USER_EMAIL (email or username) is required.');
  }

  await signIn(page, identifier, password);

  // Prove the session lands us in the app, not back on sign-in. baseURL already
  // points at the tenant subdomain, so "/" renders the authenticated home.
  await page.goto('/');
  await expect(page).not.toHaveURL(/\/sign-in/);
  await expect(page).not.toHaveURL(/\/landing/);

  await page.context().storageState({ path: STORAGE_STATE });
});
