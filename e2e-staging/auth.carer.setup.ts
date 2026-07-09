import { test as setup, expect } from '@playwright/test';
import { signIn } from '../e2e/clerk-auth';
import { CARER_STATE } from './constants';

// Signs in once as the staging CARER user (OrgRole CARER in the staging tenant)
// and persists the session for the access/RBAC spec. Uses password auth if
// E2E_CARER_PASSWORD is set, else a Backend-API sign-in token.
const identifier = process.env.E2E_CARER_EMAIL;
const password = process.env.E2E_CARER_PASSWORD;

setup('authenticate carer', async ({ page }) => {
  if (!identifier) {
    throw new Error('E2E_CARER_EMAIL (email or username) is required.');
  }

  await signIn(page, identifier, password);

  // Carer lands in the app (home), and the section gate bounces them OFF
  // /compliance back to home — prove the session took first.
  await page.goto('/');
  await expect(page).not.toHaveURL(/\/sign-in/);
  await expect(page).not.toHaveURL(/\/landing/);

  await page.context().storageState({ path: CARER_STATE });
});
