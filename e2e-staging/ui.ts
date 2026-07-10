import { expect, type Locator, type Page } from '@playwright/test';

// Shared helpers for the app's two form conventions:
//   - shadcn Form (e.g. Add Animal dialog): labels are linked to controls, so
//     target the trigger with dialog.getByLabel(...) and pass it here.
//   - plain useState forms (e.g. compliance /new pages): Radix Select triggers
//     are NOT label-linked, so target them by placeholder via selectOption().

// Pick a Radix <Select> option given the trigger's Locator.
export async function chooseOption(
  page: Page,
  trigger: Locator,
  optionName?: RegExp | string,
): Promise<void> {
  await trigger.click();
  const listbox = page.getByRole('listbox');
  await expect(listbox).toBeVisible();
  const option = optionName
    ? listbox.getByRole('option', { name: optionName })
    : listbox.getByRole('option').first();
  await option.click();
}

// Pick a Radix <Select> on a plain form where the trigger has no accessible
// name — locate it by the placeholder TEXT it currently renders.
export async function selectOption(
  page: Page,
  placeholder: RegExp | string,
  optionName?: RegExp | string,
): Promise<void> {
  const trigger = page
    .getByRole('combobox')
    .filter({ hasText: placeholder })
    .first();
  await chooseOption(page, trigger, optionName);
}

// Open a date-picker Popover from its trigger Locator and click a day. The
// popover may not auto-close and can overlay the trigger + fields below it, so
// pass `dismiss` — a field ABOVE the trigger (its click closes the popover via
// outside-click, without closing the parent Dialog as Escape would).
export async function chooseDate(
  page: Page,
  trigger: Locator,
  day = new Date().getDate(),
): Promise<void> {
  await trigger.click();
  const grid = page.getByRole('grid');
  await expect(grid).toBeVisible();
  // Day cells are clickable gridcells (no inner button). This sets the date but
  // doesn't auto-close, so toggle the trigger to close the popover afterwards.
  await grid
    .getByRole('gridcell', { name: String(day), exact: true })
    .first()
    .click();
  if (await grid.isVisible().catch(() => false)) {
    await trigger.click({ force: true });
    await expect(grid).toBeHidden();
  }
}

// Wait for the app's custom toast (use-toast) to show given text.
export async function expectToast(
  page: Page,
  text: RegExp | string,
): Promise<void> {
  await expect(page.getByText(text).first()).toBeVisible({ timeout: 15_000 });
}
