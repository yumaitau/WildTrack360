import { expect, type Page } from '@playwright/test';

// Shared helpers for the app's shadcn/Radix form conventions (see the UI-audit
// in docs/e2e-testing.md). No data-testids exist, so we drive by accessible
// name / label.

// Open a Radix <Select> by its trigger's accessible name and pick an option.
// If `optionName` is omitted, selects the first real option (useful when the
// concrete list — e.g. species — is seeded and not known ahead of time).
export async function selectOption(
  page: Page,
  triggerName: RegExp | string,
  optionName?: RegExp | string,
): Promise<void> {
  await page.getByRole('combobox', { name: triggerName }).click();
  const listbox = page.getByRole('listbox');
  await expect(listbox).toBeVisible();
  const option = optionName
    ? listbox.getByRole('option', { name: optionName })
    : listbox.getByRole('option').first();
  await option.click();
}

// Open a date-picker Popover (button currently shows "Pick a date") and choose
// a day. Defaults to today's visible day number.
export async function pickDate(
  page: Page,
  triggerName: RegExp | string,
  day = new Date().getDate(),
): Promise<void> {
  await page.getByRole('button', { name: triggerName }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole('gridcell', { name: String(day), exact: true })
    .first()
    .click();
}

// Wait for the app's custom toast (use-toast) to show given text.
export async function expectToast(
  page: Page,
  text: RegExp | string,
): Promise<void> {
  await expect(page.getByText(text).first()).toBeVisible({ timeout: 15_000 });
}
