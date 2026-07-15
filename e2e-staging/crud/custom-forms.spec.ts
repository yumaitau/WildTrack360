import { test, expect } from '@playwright/test';
import { mark } from '../constants';
import { chooseOption, expectToast } from '../ui';

// Custom forms exercise the complete manager-to-submitter workflow through the
// real UI. The form title carries the marker so global teardown can delete the
// form, its versions, and its submissions if the test stops before cleanup.
test.describe.serial('custom forms lifecycle', () => {
  const title = mark('custom-form');
  const description = `${title} field observation workflow`;
  const fieldLabel = 'Observation summary';
  const fieldValue = `${title} animal sighted near creek`;
  const notes = `${title} submission notes`;
  const photoUrl = 'https://example.com/wildtrack360-e2e-photo.jpg';

  test('create → build → publish → submit → review → delete', async ({ page }) => {
    // ---- CREATE ---------------------------------------------------------
    await page.goto('/forms');
    await expect(page.getByRole('heading', { name: 'Forms' })).toBeVisible();
    await page.getByRole('button', { name: 'New form' }).first().click();

    const createDialog = page.getByRole('dialog', { name: 'New form' });
    await createDialog.getByLabel('Title').fill(title);
    await createDialog.getByLabel('Description').fill(description);

    const [createRes] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/custom-forms') && response.request().method() === 'POST'
      ),
      createDialog.getByRole('button', { name: 'Create form' }).click(),
    ]);
    expect(createRes.ok(), `custom form create failed: HTTP ${createRes.status()}`).toBeTruthy();
    const created = await createRes.json();
    const formId: string = created?.id;
    expect(formId, 'no form id in create response').toBeTruthy();
    await expect(page).toHaveURL((url) => url.pathname === `/forms/${formId}/edit`);

    // ---- BUILD ----------------------------------------------------------
    await expect(page.getByLabel('Title')).toHaveValue(title);

    const locationSwitch = page.getByRole('switch', { name: 'Require location' });
    await expect(locationSwitch).toHaveAttribute('aria-checked', 'true');
    await locationSwitch.click();

    const addField = page.getByRole('combobox').filter({ hasText: 'Add field' });
    await chooseOption(page, addField, 'Short text');
    await page.getByLabel('Label', { exact: true }).fill(fieldLabel);
    await page.getByRole('switch', { name: 'Required' }).click();
    await page.getByLabel('Change summary (optional)').fill('Add required observation field');

    const [saveRes] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes(`/api/custom-forms/${formId}`) &&
          response.request().method() === 'PATCH'
      ),
      page.getByRole('button', { name: 'Save new version' }).click(),
    ]);
    expect(saveRes.ok(), `custom form save failed: HTTP ${saveRes.status()}`).toBeTruthy();
    await expectToast(page, 'Form saved');
    await expect(page.getByText('v2', { exact: true }).first()).toBeVisible();

    const [publishRes] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes(`/api/custom-forms/${formId}`) &&
          response.request().method() === 'PATCH'
      ),
      page.getByRole('button', { name: 'Publish' }).click(),
    ]);
    expect(publishRes.ok(), `custom form publish failed: HTTP ${publishRes.status()}`).toBeTruthy();
    await expectToast(page, 'Form published');
    await expect(page.getByText('Published', { exact: true }).first()).toBeVisible();

    // ---- FILL -----------------------------------------------------------
    await page.goto(`/forms/${formId}/fill`);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();

    // Prove required-field feedback is wired before completing the response.
    await page.getByRole('button', { name: 'Submit' }).click();
    await expectToast(page, 'Please fill in the required fields');
    await expect(page.getByText(`${fieldLabel} is required.`)).toBeVisible();

    await page.getByLabel(new RegExp(fieldLabel)).fill(fieldValue);
    await page.getByRole('button', { name: 'Add photo URL' }).click();
    await page.getByRole('textbox', { name: 'Photo URL 1', exact: true }).fill(photoUrl);
    await page.getByLabel('Notes').fill(notes);

    const [submitRes] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/custom-forms/submissions') &&
          response.request().method() === 'POST'
      ),
      page.getByRole('button', { name: 'Submit' }).click(),
    ]);
    expect(
      submitRes.ok(),
      `custom form submission failed: HTTP ${submitRes.status()}`
    ).toBeTruthy();
    await expectToast(page, 'Submission recorded');

    // ---- REVIEW + DELETE SUBMISSION ------------------------------------
    await page.goto(`/forms/${formId}/submissions`);
    await expect(
      page.getByRole('heading', { name: new RegExp(`${title}(?: —|:) submissions`) })
    ).toBeVisible();
    const row = page.getByRole('row').filter({ hasText: fieldValue });
    await expect(row).toBeVisible();
    await expect(row).toContainText(notes);
    await row.getByRole('button', { name: 'View submission' }).click();

    const detailsDialog = page.getByRole('dialog', { name: 'Submission details' });
    await expect(detailsDialog.getByText(fieldValue)).toBeVisible();
    await expect(detailsDialog.getByText(notes)).toBeVisible();
    await expect(detailsDialog.getByRole('img', { name: 'Submission photo 1' })).toHaveAttribute(
      'src',
      photoUrl
    );
    await detailsDialog.getByRole('button', { name: 'Close' }).click();

    await row.getByRole('button', { name: 'Delete submission' }).click();
    const deleteSubmissionDialog = page.getByRole('alertdialog', {
      name: 'Delete this submission?',
    });
    const [deleteSubmissionRes] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/custom-forms/submissions/') &&
          response.request().method() === 'DELETE'
      ),
      deleteSubmissionDialog.getByRole('button', { name: 'Delete submission' }).click(),
    ]);
    expect(
      deleteSubmissionRes.ok(),
      `submission delete failed: HTTP ${deleteSubmissionRes.status()}`
    ).toBeTruthy();
    await expectToast(page, 'Submission deleted');
    await expect(page.getByText('No submissions yet.')).toBeVisible();

    // ---- DELETE FORM ----------------------------------------------------
    await page.goto('/forms');
    const formCard = page
      .getByText(title, { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
    await expect(formCard).toBeVisible();
    await formCard.getByRole('button', { name: 'Delete' }).click();

    const deleteFormDialog = page.getByRole('alertdialog', {
      name: `Delete “${title}”?`,
    });
    const [deleteFormRes] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes(`/api/custom-forms/${formId}`) &&
          response.request().method() === 'DELETE'
      ),
      deleteFormDialog.getByRole('button', { name: 'Delete form' }).click(),
    ]);
    expect(
      deleteFormRes.ok(),
      `custom form delete failed: HTTP ${deleteFormRes.status()}`
    ).toBeTruthy();
    await expectToast(page, 'Form deleted');
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  });
});
