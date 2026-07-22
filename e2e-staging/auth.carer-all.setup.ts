import { test as setup, expect } from '@playwright/test';
import { signIn } from '../e2e/clerk-auth';
import { CARER_ALL_STATE } from './constants';

const identifier = process.env.E2E_CARER_ALL_EMAIL;
const password = process.env.E2E_CARER_ALL_PASSWORD;

setup('authenticate carer all', async ({ page }) => {
  if (!identifier) throw new Error('E2E_CARER_ALL_EMAIL is required.');
  await signIn(page, identifier, password);
  await page.goto('/');
  await expect(page).not.toHaveURL(/\/sign-in|\/landing/);
  await page.context().storageState({ path: CARER_ALL_STATE });
});
