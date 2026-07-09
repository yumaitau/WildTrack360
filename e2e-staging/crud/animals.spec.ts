import { test, expect } from '@playwright/test';
import { mark } from '../constants';
import { selectOption, pickDate, expectToast } from '../ui';

// Full CRUD for an Animal through the real UI, as ADMIN.
// Create/Edit is a dialog on /animals ("Add Animal" → "Save Animal"); Delete is
// on the /animals/[id] detail page and redirects home on success.
//
// The animal's NAME carries the E2E marker so the list search finds exactly our
// record and teardown can sweep a leftover.
test.describe.serial('animals CRUD', () => {
  const name = mark('animal');
  const editedName = `${name}-edited`;

  test('create → read → update → delete an animal', async ({ page }) => {
    // ---- CREATE ---------------------------------------------------------
    await page.goto('/animals');
    await page.getByRole('button', { name: /Add Animal/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('Name', { exact: false }).fill(name);
    // Species: pick the first seeded option.
    await selectOption(page, /Species/i);
    // Date Found (required).
    await pickDate(page, /Pick a date/i);
    // Status (required) — ADMITTED is always valid.
    await selectOption(page, /Status/i, /Admitted/i);

    await dialog.getByRole('button', { name: /Save Animal/i }).click();
    await expectToast(page, /Animal Added/i);

    // ---- READ -----------------------------------------------------------
    await page.getByPlaceholder(/Search animals/i).fill(name);
    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row).toBeVisible();
    await row.getByRole('link', { name }).click();
    await expect(page).toHaveURL(/\/animals\/[^/]+$/);
    await expect(
      page.getByRole('heading', { name: new RegExp(name) }),
    ).toBeVisible();

    // ---- UPDATE ---------------------------------------------------------
    await page.getByRole('button', { name: /Edit Animal/i }).click();
    const editDialog = page.getByRole('dialog');
    await expect(editDialog).toBeVisible();
    const nameField = editDialog.getByLabel('Name', { exact: false });
    await nameField.fill(editedName);
    await editDialog.getByRole('button', { name: /Save Changes/i }).click();
    await expectToast(page, /Animal Updated/i);
    await expect(
      page.getByRole('heading', { name: new RegExp(editedName) }),
    ).toBeVisible();

    // ---- DELETE ---------------------------------------------------------
    await page.getByRole('button', { name: /^Delete/i }).click();
    const confirm = page.getByRole('dialog');
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: /Delete/i }).click();
    await expectToast(page, /Animal Deleted/i);

    // Verify it's gone from the list.
    await page.goto('/animals');
    await page.getByPlaceholder(/Search animals/i).fill(editedName);
    await expect(
      page.getByRole('row').filter({ hasText: editedName }),
    ).toHaveCount(0);
  });
});
