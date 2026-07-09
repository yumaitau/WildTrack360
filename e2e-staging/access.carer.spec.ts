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
    await expect(
      page.getByText(/Application error|Something went wrong/i),
    ).toHaveCount(0);
  });
}

// /tools/reporting renders for a carer but shows an access-denied message
// (no report:view_species permission) rather than the reporting workbench.
test('carer sees access-denied on /tools/reporting', async ({ page }) => {
  await page.goto('/tools/reporting', { waitUntil: 'domcontentloaded' });
  await expect(page).not.toHaveURL(/\/sign-in/);
  await expect(
    page.getByText(/don't have access|access to custom reporting/i),
  ).toBeVisible();
});
