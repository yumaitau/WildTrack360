import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import {
  ADMIN_STATE,
  CARER_ALL_STATE,
  CARER_STATE,
  COORDINATOR_ALL_STATE,
  COORDINATOR_STATE,
} from './e2e-staging/constants';

// Load .env then .env.local (local overrides), matching where you keep secrets.
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

// Full multi-role E2E suite. Runs against a DEDICATED STAGING tenant (never
// production — the CRUD specs write and delete real records). The staging tenant
// must be seeded with one user for each application role (see
// docs/e2e-testing.md). Target is the staging tenant's subdomain host.
//
// Configure E2E_STAGING_BASE_URL through the environment or local .env file,
// using a tenant subdomain URL such as "https://e2e.staging.wildtrack360.com.au".
// The apex will not resolve a tenant (subdomain multi-tenancy).
const baseURL = (
  process.env.E2E_STAGING_BASE_URL || 'https://REPLACE-ME.staging.wildtrack360.com.au'
).replace(/\/$/, '');

export default defineConfig({
  testDir: './e2e-staging',
  globalSetup: './e2e/clerk-global-setup.ts',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Shared staging tenant + destructive writes → serialise everything.
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
    { name: 'setup-admin', testMatch: /auth\.admin\.setup\.ts/ },
    { name: 'setup-carer', testMatch: /auth\.carer\.setup\.ts/ },
    { name: 'setup-coordinator-all', testMatch: /auth\.coordinator-all\.setup\.ts/ },
    { name: 'setup-coordinator', testMatch: /auth\.coordinator\.setup\.ts/ },
    { name: 'setup-carer-all', testMatch: /auth\.carer-all\.setup\.ts/ },
    {
      // Full CRUD + admin-side access, under the ADMIN session.
      name: 'admin',
      use: { ...devices['Desktop Chrome'], storageState: ADMIN_STATE },
      dependencies: ['setup-admin'],
      testMatch: [/crud\/.*\.spec\.ts/, /access\.admin\.spec\.ts/, /role-matrix\.spec\.ts/],
    },
    {
      name: 'coordinator-all',
      use: { ...devices['Desktop Chrome'], storageState: COORDINATOR_ALL_STATE },
      dependencies: ['setup-coordinator-all'],
      testMatch: /role-matrix\.spec\.ts/,
    },
    {
      name: 'coordinator',
      use: { ...devices['Desktop Chrome'], storageState: COORDINATOR_STATE },
      dependencies: ['setup-coordinator'],
      testMatch: /role-matrix\.spec\.ts/,
    },
    {
      name: 'carer-all',
      use: { ...devices['Desktop Chrome'], storageState: CARER_ALL_STATE },
      dependencies: ['setup-carer-all'],
      testMatch: /role-matrix\.spec\.ts/,
    },
    {
      // RBAC: carer is blocked from every gated page.
      name: 'carer',
      use: { ...devices['Desktop Chrome'], storageState: CARER_STATE },
      dependencies: ['setup-carer'],
      testMatch: [/access\.carer\.spec\.ts/, /role-matrix\.spec\.ts/],
    },
    {
      // Safety-net sweep of any leftover marked records via the REST API.
      name: 'cleanup',
      testMatch: /global\.teardown\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: ADMIN_STATE },
      dependencies: ['admin', 'coordinator-all', 'coordinator', 'carer-all', 'carer'],
    },
  ],
});
