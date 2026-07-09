import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import { STORAGE_STATE } from './e2e/constants';

// Load .env then .env.local (local overrides), matching where you keep secrets.
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

// Daily synthetic monitor: drives the LIVE product in a browser, logs in via
// Clerk, and asserts the real tenant works end-to-end. The app is multi-tenant
// by subdomain, so the target MUST be the tenant subdomain host (not the apex).
//
// TODO(justin): replace the placeholder below with the real E2E tenant URL,
// e.g. "https://e2e.wildtrack360.com.au". Overridable at runtime via
// E2E_BASE_URL (GitHub secret / workflow_dispatch input).
const DEFAULT_BASE_URL = 'https://REPLACE-ME.wildtrack360.com.au';
const baseURL = (process.env.E2E_BASE_URL || DEFAULT_BASE_URL).replace(
  /\/$/,
  '',
);

export default defineConfig({
  testDir: './e2e',
  // Derives CLERK_FAPI from the publishable key for the one-time sign-in.
  globalSetup: './e2e/clerk-global-setup.ts',
  // Generous timeouts: GitHub-hosted runners are US-based and the target is AU,
  // so every request carries extra latency.
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // One worker: we hit a shared live tenant, so keep any writes serialised.
  workers: 1,
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
  ],
});
