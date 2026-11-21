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

  const dock = page.getByRole("contentinfo", { name: "Thao tác kiểm thử" });
  await expect(dock).toBeVisible();
  const visibleActions = dock.locator("button, a");
  await expect(visibleActions).toHaveCount(4);
  await expect(visibleActions.nth(0)).toHaveAccessibleName("Xóa mục");
  await expect(visibleActions.nth(0)).toHaveAttribute("data-ui-button-variant", "danger");
  await expect(visibleActions.last()).toHaveAccessibleName("Lưu thay đổi");
  await expect(visibleActions.last()).toHaveAttribute("data-ui-button-variant", "primary");
  const sharedStyle = await visibleActions.nth(0).evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, color: style.color, border: style.borderColor, height: element.getBoundingClientRect().height, transition: style.transitionProperty, transform: style.transform, shadow: style.boxShadow };
  });
  expect(sharedStyle).toEqual({ background: "rgb(255, 255, 255)", color: "rgb(0, 0, 0)", border: "rgb(233, 226, 220)", height: 44, transition: "none", transform: "none", shadow: "none" });
  await expect(visibleActions.last()).toHaveCSS("background-color", sharedStyle.background);
  await expect(visibleActions.last()).toHaveCSS("color", sharedStyle.color);
  await visibleActions.nth(0).hover();
  const hoveredStyle = await visibleActions.nth(0).evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, color: style.color, border: style.borderColor, height: element.getBoundingClientRect().height, transition: style.transitionProperty, transform: style.transform, shadow: style.boxShadow };
  });
  expect(hoveredStyle).toEqual(sharedStyle);

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

test("confirmation navigates to the configured destination", async ({ page }) => {
  await page.goto("/dev/action-bar-fixture");
  const mainFrameNavigations: string[] = [];
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) mainFrameNavigations.push(request.url());
  });

  const dock = page.getByRole("contentinfo", { name: "Thao tác kiểm thử" });
  await dock.getByRole("button", { name: "Thêm thao tác", exact: true }).click();
  await page.getByRole("menu").getByRole("menuitem", { name: "Tiếp tục" }).click();
  await page.getByRole("alertdialog", { name: "Xác nhận thao tác" }).getByRole("button", { name: "Thực hiện" }).click();

  await expect(page).toHaveURL("/");
  expect(mainFrameNavigations).toEqual([]);
});

test("owner machine list uses the shared neutral registration link", async ({ page }) => {
  await login(page, "owner");
  await mockApi(page);
  await page.goto("/dashboard/machines");

  const register = page.getByRole("main").getByRole("link", { name: "Đăng ký máy", exact: true });
  await expect(register).toBeVisible();
  await expect(register).toHaveAttribute("data-ui-button");
  const style = async () => register.evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, color: style.color, border: style.borderColor, height: element.getBoundingClientRect().height, transition: style.transitionProperty, transform: style.transform, shadow: style.boxShadow };
  });
  const beforeHover = await style();
  expect(beforeHover).toEqual({ background: "rgb(255, 255, 255)", color: "rgb(0, 0, 0)", border: "rgb(233, 226, 220)", height: 44, transition: "none", transform: "none", shadow: "none" });
  await register.hover();
  expect(await style()).toEqual(beforeHover);
  await expect(page.locator("[data-ui-page-actions]")).toHaveCount(0);
});

test("mobile owner machine list keeps the registration action in view without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "owner");
  await mockApi(page);
  await page.goto("/dashboard/machines");

  const register = page.getByRole("main").getByRole("link", { name: "Đăng ký máy", exact: true });
  await expect(register).toBeVisible();
  await expect(register).toHaveAttribute("data-ui-button");
  await expect(register).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("customer workflow and technician screens register page actions", async ({ page }) => {
  await login(page, "owner");
  await mockApi(page);
  await page.goto("/dashboard/support/new");
  await expect(page.locator("[data-ui-page-actions]").last()).toBeVisible();

  await expect(page.locator('[data-action-id="repair-intake-submit"]')).toHaveAttribute("form", "repair-intake-form");
  await expect(page.locator('[data-action-id="repair-intake-submit"]')).toHaveAttribute("data-ui-button-variant", "primary");

  await login(page, "technician");
  await page.goto("/technician/tasks/standard-handover");
  await expect(page.locator("[data-ui-page-actions]")).toHaveCount(0);
});

test("customer operational read screen keeps refresh in the heading and hides the empty dock", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page, "owner");
  await mockApi(page);
  await page.goto(`/dashboard/machines/${machineId}/operations`);

  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("main [data-action-id='refresh']")).toBeVisible();
  await expect(page.locator("footer [data-ui-page-actions]")).toHaveCount(0);
});
