import { test, expect } from '@playwright/test';

// RBAC enforcement for a CARER. The /admin and /compliance sections are gated at
// the layout with requireMinimumRole(COORDINATOR), which redirects a CARER back
// to home ('/'). The allowed pages must still render for them.

// Gated pages: a CARER hitting these is redirected to '/'.
const GATED_PAGES: string[] = [
  '/admin',
  '/admin/members',
  '/admin/news',
  '/admin/carer-interest',
  '/compliance',
  '/compliance/overview',
  '/compliance/register',
  '/compliance/carers',
  '/compliance/incidents',
  '/compliance/incidents/new',
  '/compliance/hygiene',
  '/compliance/call-logs',
  '/compliance/release-checklist',
  '/compliance/nsw-report',
  '/compliance/preserved-specimens',
];

// Allowed pages: a CARER can view these (data is role-filtered server-side).
const ALLOWED_PAGES: string[] = [
  '/',
  '/animals',
  '/forms',
  '/tools',
  '/tools/feed-roster',
  '/tools/feed-calculator/flying-fox',
  '/tools/feed-calculator/macropod',
];

for (const path of GATED_PAGES) {
  test(`carer is blocked from ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    // The layout gate redirects to home. Assert we did NOT stay on the gated
    // route (and weren't sent to sign-in — the carer is authenticated).
    await expect(page).not.toHaveURL((url) => url.pathname === path);
    await expect(page).not.toHaveURL(/\/sign-in/);
    await expect(page).toHaveURL((url) => url.pathname === '/');
  });
}

for (const path of ALLOWED_PAGES) {
  test(`carer can view ${path}`, async ({ page }) => {
    const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(res, `no response for ${path}`).toBeTruthy();
    expect(res!.status(), `${path} → HTTP ${res!.status()}`).toBeLessThan(400);
    await expect(page).not.toHaveURL(/\/sign-in/);
    await expect(page.getByText(/Application error|Something went wrong/i)).toHaveCount(0);
  });
}

// /tools/reporting renders for a carer but shows an access-denied message
// (no report:view_species permission) rather than the reporting workbench.
test('carer sees access-denied on /tools/reporting', async ({ page }) => {
  await page.goto('/tools/reporting', { waitUntil: 'domcontentloaded' });
  await expect(page).not.toHaveURL(/\/sign-in/);
  await expect(page.getByText(/don't have access|access to custom reporting/i)).toBeVisible();
});

test('carer workspace navigation stays focused on care tasks', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const desktopNavigation = page.getByRole('navigation', { name: 'Workspace' });
  await expect(desktopNavigation).toBeVisible();
  await expect(desktopNavigation.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  await expect(desktopNavigation.getByRole('link', { name: 'My Animals' })).toBeVisible();
  await expect(desktopNavigation.getByRole('link', { name: 'Feed Roster' })).toBeVisible();
  await expect(desktopNavigation.getByRole('link', { name: 'Forms' })).toBeVisible();
  await expect(desktopNavigation.getByRole('link', { name: 'Care Tools' })).toBeVisible();
  await expect(desktopNavigation.getByRole('link', { name: 'Compliance' })).toHaveCount(0);
  await expect(desktopNavigation.getByRole('link', { name: 'Organisation' })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileNavigation = page.getByRole('navigation', { name: 'Primary workspace' });
  await expect(mobileNavigation).toBeVisible();
  await expect(mobileNavigation.getByRole('link', { name: 'Feed' })).toBeVisible();
  await expect(mobileNavigation.getByRole('link', { name: 'Forms' })).toBeVisible();
});
