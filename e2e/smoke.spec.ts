import { test, expect } from '@playwright/test';

// Daily heartbeat: log in (via the setup project's saved session) and confirm
// the key authenticated pages actually render — correct HTTP status, no bounce
// to sign-in, and no Next.js error boundary. Read-only: makes no writes, so the
// live tenant stays clean and no teardown is needed.
const PAGES: Array<{ path: string; name: string }> = [
  { path: '/', name: 'home' },
  { path: '/animals', name: 'animals' },
  { path: '/compliance', name: 'compliance' },
  { path: '/compliance/overview', name: 'compliance overview' },
  { path: '/compliance/carers', name: 'carers' },
  { path: '/forms', name: 'custom forms' },
  { path: '/tools', name: 'tools' },
];

for (const { path, name } of PAGES) {
  test(`${name} page loads`, async ({ page }) => {
    const res = await page.goto(path, { waitUntil: 'domcontentloaded' });

    // Real HTTP response, not a 4xx/5xx.
    expect(res, `no response for ${path}`).toBeTruthy();
    expect(res!.status(), `${path} returned HTTP ${res!.status()}`).toBeLessThan(400);

    // Session held — not bounced to the sign-in / marketing pages.
    await expect(page).not.toHaveURL(/\/sign-in/);
    await expect(page).not.toHaveURL(/\/landing/);
    await expect(page).not.toHaveURL(/\/unauthorized/);

    // No Next.js error boundary rendered.
    await expect(page.getByText(/Application error|Something went wrong/i)).toHaveCount(0);
  });
}
