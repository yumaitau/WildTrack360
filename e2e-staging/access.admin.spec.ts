import { test, expect } from '@playwright/test';

// ADMIN can reach every authenticated page. Asserts each renders with a real
// (<400) status, isn't bounced to sign-in / unauthorized, and shows no Next.js
// error boundary. Read-only — makes no writes.
//
// Static routes only (dynamic /[id] pages are exercised by the CRUD specs).
// /admin/payments/* is feature-gated per org, so it's covered separately.
const ADMIN_PAGES: string[] = [
  '/',
  '/animals',
  '/admin',
  '/admin/carer-interest',
  '/admin/members',
  '/admin/members/fields',
  '/admin/news',
  '/compliance',
  '/compliance/overview',
  '/compliance/register',
  '/compliance/call-logs',
  '/compliance/call-logs/new',
  '/compliance/call-logs/lookups',
  '/compliance/carers',
  // NB: /compliance/carers/new redirects to /admin (carers are managed via the
  // members flow, not a dedicated form) — so it's intentionally not listed here.
  '/compliance/carers/map',
  '/compliance/carers/training',
  '/compliance/carers/contact-report',
  '/compliance/hygiene',
  '/compliance/hygiene/new',
  '/compliance/incidents',
  '/compliance/incidents/new',
  '/compliance/nsw-report',
  '/compliance/preserved-specimens',
  '/compliance/release-checklist',
  '/compliance/release-checklist/new',
  '/tools',
  '/tools/feed-roster',
  '/tools/feed-calculator/flying-fox',
  '/tools/feed-calculator/macropod',
  '/tools/reporting',
];

for (const path of ADMIN_PAGES) {
  test(`admin can view ${path}`, async ({ page }) => {
    const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(res, `no response for ${path}`).toBeTruthy();
    expect(res!.status(), `${path} → HTTP ${res!.status()}`).toBeLessThan(400);

    await expect(page).not.toHaveURL(/\/sign-in/);
    await expect(page).not.toHaveURL(/\/unauthorized/);
    // Admin is never bounced off a gated section back to home.
    if (path.startsWith('/admin') || path.startsWith('/compliance')) {
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, '\\/')));
    }

    await expect(
      page.getByText(/Application error|Something went wrong/i),
    ).toHaveCount(0);
  });
}
