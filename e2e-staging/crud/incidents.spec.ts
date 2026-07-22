import { test, expect } from '@playwright/test';
import { mark } from '../constants';
import { selectOption } from '../ui';
import { browserApi } from '../browser-api';

// Incident report: Create → Read → Update through the real UI (dedicated
// /new and /[id]/edit pages). The UI has NO delete button for incidents, so the
// "D" is done via the REST API (DELETE /api/incidents/[id]) — both to complete
// CRUD coverage and to keep the staging tenant clean.
//
// The list columns don't show the description, so we capture the created id from
// the POST response instead of hunting the row by marker text.
test.describe.serial('incidents CRUD', () => {
  const description = `${mark('incident')} — automated E2E incident`;
  const editedDescription = `${description} (edited)`;

  test('create → read → update → delete an incident', async ({ page }) => {
    // ---- CREATE ---------------------------------------------------------
    // Date of Incident defaults to today, so no date interaction is needed.
    // This plain form's Selects aren't label-linked → target by placeholder.
    await page.goto('/compliance/incidents/new');
    await selectOption(page, /Select incident type/i);
    await selectOption(page, /Select severity/i);
    await page.getByLabel(/Description/i).fill(description);

    const [createRes] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/incidents') && r.request().method() === 'POST',
      ),
      page.getByRole('button', { name: /Create Report/i }).click(),
    ]);
    expect(createRes.ok(), 'incident create failed').toBeTruthy();
    const created = await createRes.json();
    const id: string = created?.data?.id ?? created?.id;
    expect(id, 'no incident id in create response').toBeTruthy();

    // ---- READ -----------------------------------------------------------
    await page.goto(`/compliance/incidents/${id}`);
    await expect(page.getByText(description)).toBeVisible();

    // ---- UPDATE ---------------------------------------------------------
    await page.getByRole('link', { name: /Edit Report/i }).click();
    await expect(page).toHaveURL(/\/compliance\/incidents\/[^/]+\/edit$/);
    // The edit form hydrates from a fetch — wait for it before editing, or the
    // other required fields are still empty and the submit is silently blocked.
    const descField = page.getByLabel(/Description/i);
    await expect(descField).toHaveValue(description);
    await descField.fill(editedDescription);
    await page.getByRole('button', { name: /Update Report/i }).click();
    await expect(page).toHaveURL(
      (url) => url.pathname === `/compliance/incidents/${id}`,
    );
    await expect(page.getByText(editedDescription)).toBeVisible();

    // ---- DELETE (via API — no UI affordance) ----------------------------
    const del = await browserApi(page, 'DELETE', `/api/incidents/${id}`);
    expect(del.ok, 'incident delete failed').toBeTruthy();
    await page.goto(`/compliance/incidents/${id}`);
    await expect(page.getByText(editedDescription)).toHaveCount(0);
  });
});
