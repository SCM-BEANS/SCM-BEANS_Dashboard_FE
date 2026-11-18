import { expect, test, type Page } from "@playwright/test";

const machineId = "f4000000-0000-4000-8000-000000000001";

async function login(page: Page, role: "owner" | "technician") {
  const claims = Buffer.from(JSON.stringify({ roles: [role], sub: machineId })).toString("base64url");
  await page.context().addCookies([
    { name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" },
  ]);
}

async function mockApi(page: Page) {
  await page.route("**/api/**", (route) => route.fulfill({ status: 200, json: [] }));
}

test("orders primary and danger actions, supports overflow keyboard use, and cancels confirmation", async ({ page }) => {
  await page.goto("/dev/action-bar-fixture");

  const dock = page.getByRole("region", { name: "Thao tác kiểm thử" });
  await expect(dock).toBeVisible();
  const visibleActions = dock.locator("button, a");
  await expect(visibleActions).toHaveCount(4);
  await expect(visibleActions.nth(0)).toHaveAccessibleName("Xóa mục");
  const dangerColor = await dock.evaluate(element => getComputedStyle(element).getPropertyValue("--ta-color-red-600").trim());
  const resolvedDangerColor = await page.evaluate(color => {
    const sample = document.createElement("span");
    sample.style.color = color;
    document.body.append(sample);
    const resolved = getComputedStyle(sample).color;
    sample.remove();
    return resolved;
  }, dangerColor);
  await expect(visibleActions.nth(0)).toHaveCSS("border-top-color", resolvedDangerColor);
  await expect(visibleActions.last()).toHaveAccessibleName("Lưu thay đổi");
  await expect(visibleActions.last()).toHaveCSS("background-color", "rgb(70, 95, 255)");

  const trigger = dock.getByRole("button", { name: "Thêm thao tác", exact: true });
  await trigger.focus();
  await trigger.press("ArrowDown");

  const menu = page.getByRole("menu", { name: "Thêm thao tác" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem")).toHaveCount(3);
  const enabledItems = menu.locator('[role="menuitem"]:not([disabled])');
  await expect(enabledItems).toHaveCount(2);
  await expect(enabledItems.nth(0)).toBeFocused();
  await enabledItems.nth(0).press("ArrowDown");
  await expect(enabledItems.nth(1)).toBeFocused();
  await enabledItems.nth(1).press("ArrowUp");
  await expect(enabledItems.nth(0)).toBeFocused();

  const disabledItem = menu.getByRole("menuitem", { name: "Tác vụ bị khóa" });
  await expect(disabledItem).toHaveAttribute("title", "Cần quyền quản lý để tiếp tục.");
  const descriptionId = await disabledItem.getAttribute("aria-describedby");
  expect(descriptionId).toBeTruthy();
  const description = page.locator(`[id="${descriptionId}"]`);
  await expect(description).toHaveText("Cần quyền quản lý để tiếp tục.");
  await expect(description).toHaveCSS("position", "absolute");
  await expect(menu.locator(`[id="${descriptionId}"]`)).toHaveCount(0);

  await enabledItems.nth(0).press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await menu.getByRole("menuitem", { name: "Tiếp tục" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Xác nhận thao tác" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/dev\/action-bar-fixture$/);
});

test("confirm action navigates with the client router", async ({ page }) => {
  await page.goto("/dev/action-bar-fixture");
  let documentRequests = 0;
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.resourceType() === "document" && request.frame() === page.mainFrame()) documentRequests += 1;
  });

  const dock = page.getByRole("region", { name: "Thao tác kiểm thử" });
  await dock.getByRole("button", { name: "Thêm thao tác", exact: true }).click();
  await page.getByRole("menu").getByRole("menuitem", { name: "Tiếp tục" }).click();
  await page.getByRole("alertdialog", { name: "Xác nhận thao tác" }).getByRole("button", { name: "Thực hiện" }).click();

  await expect(page).toHaveURL("/");
  expect(documentRequests).toBe(0);
});

for (const width of [1440, 390]) test(`customer machine read screen has no shortcut dock at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await login(page, "owner");
  await mockApi(page);
  await page.goto("/dashboard/machines");
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator('section[aria-label^="Thao tác"]')).toBeHidden();
  await expect(page.locator("main")).toHaveCSS("padding-bottom", "0px");
  if (width > 1023) await expect(page.getByRole("navigation", { name: "Điều hướng Khách hàng", exact: true }).getByRole("link", { name: "Quản lý máy", exact: true })).toBeVisible();
});

test("customer workflow and technician screens register page actions", async ({ page }) => {
  await login(page, "owner");
  await mockApi(page);
  await page.goto("/dashboard/support/new");
  await expect(page.getByRole("region", { name: /Thao tác/ })).toBeVisible();

  await expect(page.locator('[data-action-id="repair-intake-submit"]')).toHaveAttribute("form", "repair-intake-form");
  await expect(page.locator('[data-action-id="repair-intake-submit"]')).toHaveClass(/primary/);

  await login(page, "technician");
  await page.goto("/technician/tasks/standard-handover");
  await expect(page.getByRole("region", { name: /Thao tác/ })).toHaveCount(0);
});

test("customer operational read screen hides the dock when it has no actions", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page, "owner");
  await mockApi(page);
  await page.goto(`/dashboard/machines/${machineId}/operations`);

  await expect(page.locator("main")).toBeVisible();
  const dock = page.locator('section[aria-label^="Thao tác"]');
  await expect(dock).toBeHidden();
  await expect(dock).toHaveCSS("position", "relative");
});
