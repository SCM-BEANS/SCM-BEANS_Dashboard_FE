import { expect, type Page } from "@playwright/test";

export function pageActionBar(page: Page) {
  return page.locator('footer[aria-label^="Thao tác"]').last();
}

export async function expectPageAction(page: Page, id: string) {
  const bar = pageActionBar(page);
  await expect(bar).toBeVisible();
  await expect(bar.locator("[data-action-id]").first()).toBeAttached();
  let action = bar.locator(`[data-action-id="${id}"]`);
  if (!(await action.count())) {
    const more = bar.getByRole("button", { name: "Thêm thao tác", exact: true });
    if (await more.count() && await more.getAttribute("aria-expanded") !== "true") await more.click();
    action = bar.locator(`[data-action-id="${id}"]`);
  }
  await expect(action).toBeVisible();
}

export async function expectPrimaryPageAction(page: Page, id: string) {
  const bar = pageActionBar(page);
  const action = bar.locator(`[data-action-id="${id}"]`);
  await expect(action).toBeVisible();
  await expect(action).toHaveClass(/primary/);
  await expect(bar.locator("button").last()).toHaveAttribute("data-action-id", id);
}

export async function expectNonPrimaryPageAction(page: Page, id: string) {
  const action = pageActionBar(page).locator(`[data-action-id="${id}"]`);
  await expect(action).toBeVisible();
  await expect(action).not.toHaveClass(/primary/);
}

export async function clickPageAction(page: Page, id: string) {
  const bar = pageActionBar(page);
  await expect(bar).toBeVisible();
  await expect(bar.locator("[data-action-id]").first()).toBeAttached();
  let action = bar.locator(`[data-action-id="${id}"]`);
  if (!(await action.isVisible().catch(() => false))) {
    const more = bar.getByRole("button", { name: "Thêm thao tác", exact: true });
    if (await more.count() && await more.getAttribute("aria-expanded") !== "true") await more.click();
    action = bar.locator(`[data-action-id="${id}"]`);
  }
  await action.click();
}

export async function expectNoPageAction(page: Page, id: string) {
  await expect(pageActionBar(page).locator(`[data-action-id="${id}"]`)).toHaveCount(0);
}

export async function expectNoPageActionLabel(page: Page, label: string) {
  await expect(pageActionBar(page).getByRole("button", { name: label, exact: true })).toHaveCount(0);
}

export async function expectPageActionOrder(page: Page, ids: string[]) {
  const bar = pageActionBar(page);
  await expect(bar).toBeVisible();
  await expect(bar.locator("[data-action-id]").first()).toBeAttached();
  const more = bar.getByRole("button", { name: "Thêm thao tác", exact: true });
  if (await more.count() && await more.getAttribute("aria-expanded") !== "true") await more.click();
  const actual = await bar.locator("[data-action-id]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-action-id") ?? ""));
  expect(actual).toEqual(ids);
  if (await more.count() && await more.getAttribute("aria-expanded") === "true") await page.keyboard.press("Escape");
}
