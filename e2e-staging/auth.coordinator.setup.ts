import { test as setup, expect } from '@playwright/test';
import { signIn } from '../e2e/clerk-auth';
import { COORDINATOR_STATE } from './constants';

const identifier = process.env.E2E_COORDINATOR_EMAIL;
const password = process.env.E2E_COORDINATOR_PASSWORD;

setup('authenticate coordinator', async ({ page }) => {
  if (!identifier) throw new Error('E2E_COORDINATOR_EMAIL is required.');
  await signIn(page, identifier, password);
  await page.goto('/');
  await expect(page).not.toHaveURL(/\/sign-in|\/landing/);
  await page.context().storageState({ path: COORDINATOR_STATE });
});
