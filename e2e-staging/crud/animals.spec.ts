import { test, expect } from '@playwright/test';
import { mark } from '../constants';

// Animal lifecycle as ADMIN. The create + edit forms carry many NSW-conditional
// required fields and a fiddly date-picker, so create + update go through the
// REST API; the UI drives READ (search → detail) and DELETE (the destructive
// confirm dialog). The animal NAME carries the marker for lookup + sweep.
test.describe.serial('animals CRUD', () => {
  const name = mark('animal');
  const editedName = `${name}-edited`;
  let id = '';

  test('create (API) → read → update → delete an animal', async ({ page }) => {
    // ---- CREATE (API) ---------------------------------------------------
    const res = await page.request.post('/api/animals', {
      data: {
        name,
        species: 'Test Species',
        status: 'ADMITTED',
        dateFound: new Date().toISOString(),
      },
    });
    expect(res.ok(), `animal create failed: HTTP ${res.status()}`).toBeTruthy();
    const body = await res.json();
    id = body?.data?.id ?? body?.id;
    expect(id, 'no animal id in create response').toBeTruthy();

    // ---- READ -----------------------------------------------------------
    await page.goto('/animals');
    await page.getByPlaceholder(/Search animals/i).fill(name);
    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row).toBeVisible();
    await row.getByRole('link', { name }).click();
    await expect(page).toHaveURL((url) => url.pathname === `/animals/${id}`);
    await expect(
      page.getByRole('heading', { name: new RegExp(name) }),
    ).toBeVisible();

    // ---- UPDATE (API) ---------------------------------------------------
    const upd = await page.request.patch(`/api/animals/${id}`, {
      data: { name: editedName },
    });
    expect(upd.ok(), `animal update failed: HTTP ${upd.status()}`).toBeTruthy();
    await page.goto(`/animals/${id}`);
    await expect(
      page.getByRole('heading', { name: new RegExp(editedName) }),
    ).toBeVisible();

    // ---- DELETE (UI) ----------------------------------------------------
    await page.getByRole('button', { name: /^Delete/i }).click();
    const confirm = page.getByRole('dialog');
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: /Delete/i }).click();
    // Successful delete redirects to home.
    await expect(page).toHaveURL((url) => url.pathname === '/');

    // Gone from the list.
    await page.goto('/animals');
    await page.getByPlaceholder(/Search animals/i).fill(editedName);
    await expect(
      page.getByRole('row').filter({ hasText: editedName }),
    ).toHaveCount(0);
  });
});
