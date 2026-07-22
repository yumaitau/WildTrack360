import { test, expect } from '@playwright/test';
import { mark, RBAC_FIXTURES } from './constants';
import { browserApi, refreshAuthenticatedPage } from './browser-api';

type Role = 'ADMIN' | 'COORDINATOR_ALL' | 'COORDINATOR' | 'CARER_ALL' | 'CARER';

const PROJECT_ROLES: Record<string, Role> = {
  admin: 'ADMIN',
  'coordinator-all': 'COORDINATOR_ALL',
  coordinator: 'COORDINATOR',
  'carer-all': 'CARER_ALL',
  carer: 'CARER',
};

const ALL_FIXTURES = Object.values(RBAC_FIXTURES);

function currentRole(projectName: string): Role {
  const role = PROJECT_ROLES[projectName];
  if (!role) throw new Error(`No role mapping for Playwright project ${projectName}`);
  return role;
}

function isCoordinator(role: Role): boolean {
  return role === 'ADMIN' || role === 'COORDINATOR_ALL' || role === 'COORDINATOR';
}

function expectedAnimals(role: Role): string[] {
  switch (role) {
    case 'COORDINATOR':
      return [RBAC_FIXTURES.koala, RBAC_FIXTURES.possum];
    case 'CARER':
      return [RBAC_FIXTURES.kangaroo];
    default:
      return ALL_FIXTURES;
  }
}

test('session resolves the exact application role', async ({ page }, testInfo) => {
  const role = currentRole(testInfo.project.name);
  const response = await browserApi<{ data?: Record<string, unknown> }>(page, 'GET', '/api/rbac/my-role');
  expect(response.ok).toBeTruthy();
  const body = response.body;
  const data = body.data ?? body;
  expect(data.role).toBe(role);
  expect(data.orgMember?.role).toBe(role);
});

test('authenticated dashboard and animals pages render', async ({ page }) => {
  for (const path of ['/', '/animals']) {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
    await expect(page).not.toHaveURL(/\/sign-in|\/landing|\/unauthorized/);
    await expect(page.getByText(/Application error|Something went wrong/i)).toHaveCount(0);
  }
});

test('admin and compliance sections enforce the role rank', async ({ page }, testInfo) => {
  const allowed = isCoordinator(currentRole(testInfo.project.name));
  for (const path of ['/admin', '/compliance']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    if (allowed) {
      await expect(page).toHaveURL((url) => url.pathname === path);
    } else {
      await expect(page).toHaveURL((url) => url.pathname === '/');
    }
    await expect(page).not.toHaveURL(/\/sign-in/);
  }
});

test('custom reporting enforces report permissions', async ({ page }, testInfo) => {
  const allowed = isCoordinator(currentRole(testInfo.project.name));
  await page.goto('/tools/reporting', { waitUntil: 'domcontentloaded' });
  const denial = page.getByText(/don't have access|access to custom reporting/i);
  if (allowed) await expect(denial).toHaveCount(0);
  else await expect(denial).toBeVisible();
});

test('desktop navigation matches the role family', async ({ page }, testInfo) => {
  const coordinator = isCoordinator(currentRole(testInfo.project.name));
  await page.setViewportSize({ width: 1440, height: 900 });
  await refreshAuthenticatedPage(page);
  const navigation = page.getByRole('navigation', { name: 'Workspace' });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole('link', { name: coordinator ? 'Animals' : 'My Animals' })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Compliance' })).toHaveCount(coordinator ? 1 : 0);
  await expect(navigation.getByRole('link', { name: 'Organisation' })).toHaveCount(coordinator ? 1 : 0);
});

test('mobile navigation matches the role family', async ({ page }, testInfo) => {
  const coordinator = isCoordinator(currentRole(testInfo.project.name));
  await page.setViewportSize({ width: 390, height: 844 });
  await refreshAuthenticatedPage(page);
  const navigation = page.getByRole('navigation', { name: 'Primary workspace' });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole('link', { name: coordinator ? 'Calls' : 'Feed' })).toBeVisible();
  await expect(navigation.getByRole('link', { name: coordinator ? 'Compliance' : 'Tools' })).toBeVisible();
});

test('animal API applies the role data scope', async ({ page }, testInfo) => {
  const role = currentRole(testInfo.project.name);
  const response = await browserApi<{ data?: Array<{ name?: string }> } | Array<{ name?: string }>>(
    page,
    'GET',
    '/api/animals',
  );
  expect(response.ok).toBeTruthy();
  const body = response.body;
  const rows = Array.isArray(body) ? body : body.data;
  const visible = rows
    .map((animal: { name?: string }) => animal.name)
    .filter((name: string | undefined): name is string => ALL_FIXTURES.includes(name as never))
    .sort();
  expect(visible).toEqual(expectedAnimals(role).sort());
});

test('animal creation permission matches the role', async ({ page }, testInfo) => {
  const role = currentRole(testInfo.project.name);
  const canCreate = isCoordinator(role);
  const response = await browserApi<{ data?: { id?: string }; id?: string }>(
    page,
    'POST',
    '/api/animals',
    {
      name: mark(`role-create-${role.toLowerCase()}`),
      species: 'Koala',
      status: 'ADMITTED',
      dateFound: new Date().toISOString(),
    },
  );
  expect(response.status).toBe(canCreate ? 201 : 403);

  if (role === 'ADMIN' && response.ok) {
    const body = response.body;
    const id = body.data?.id ?? body.id;
    const deleted = await browserApi(page, 'DELETE', `/api/animals/${id}`);
    expect(deleted.ok).toBeTruthy();
  }
});

test('cross-tenant animal queries are rejected', async ({ page }) => {
  const response = await browserApi(
    page,
    'GET',
    '/api/animals?orgId=org_e2e_cross_tenant_probe',
  );
  expect(response.status).toBe(403);
});
