import { test, expect } from '@playwright/test';
import { mark } from '../constants';
import { selectOption, pickDate, expectToast } from '../ui';

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
    await page.goto('/compliance/incidents/new');
    await pickDate(page, /Pick a date|Date of Incident/i);
    await selectOption(page, /Incident Type/i);
    await selectOption(page, /Severity/i);
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
    await expectToast(page, /created successfully/i);

    // ---- READ -----------------------------------------------------------
    await page.goto(`/compliance/incidents/${id}`);
    await expect(page.getByText(description)).toBeVisible();

    // ---- UPDATE ---------------------------------------------------------
    await page.getByRole('link', { name: /Edit Report/i }).click();
    await expect(page).toHaveURL(/\/compliance\/incidents\/[^/]+\/edit$/);
    await page.getByLabel(/Description/i).fill(editedDescription);
    await page
      .getByRole('button', { name: /Save|Update/i })
      .first()
      .click();
    await expect(page).toHaveURL(
      (url) => url.pathname === `/compliance/incidents/${id}`,
    );
    await expect(page.getByText(editedDescription)).toBeVisible();

    // ---- DELETE (via API — no UI affordance) ----------------------------
    const del = await page.request.delete(`/api/incidents/${id}`);
    expect(del.ok(), 'incident delete failed').toBeTruthy();
    await page.goto(`/compliance/incidents/${id}`);
    await expect(page.getByText(editedDescription)).toHaveCount(0);
  });
});
