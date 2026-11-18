import { test, expect } from "@playwright/test";

const common = ["Tổng quan", "Cửa hàng", "Hợp đồng", "Hóa đơn", "Quản lý máy", "Yêu cầu kỹ thuật", "Công thức pha chế", "Gói cà phê", "Thu mua máy", "Thông báo"];

for (const role of ["admin", "moderator", "owner"]) test(`${role} has consistent navigation names, order and TailAdmin selection on desktop and mobile`, async ({ page }) => {
  const root = role === "owner" ? "dashboard" : role;
  await page.context().addCookies([{ name: "access_token", value: `header.${Buffer.from(JSON.stringify({ roles: [role], sub: "00000000-0000-4000-8000-000000000001" })).toString("base64url")}.signature`, url: test.info().project.use.baseURL as string }]);
  await page.route("**/api/**", route => route.fulfill({ contentType: "application/json", body: route.request().url().includes("unread-count") ? '{"unreadCount":0}' : "[]" }));
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(`/${root}/notifications`);
  const navigation = page.getByRole("navigation", { name: `Điều hướng ${role === "owner" ? "Khách hàng" : role === "admin" ? "Admin" : "Moderator"}`, exact: true });
  await expect(navigation).toBeVisible();
  const labels = await navigation.getByRole("link").allTextContents();
  expect(labels.filter(label => common.includes(label))).toEqual(common);
  const active = navigation.locator('[aria-current="page"]');
  await expect(active).toHaveText("Thông báo");
  await expect(active).toHaveCSS("background-color", "rgb(236, 243, 255)");
  await expect(active).toHaveCSS("color", "rgb(70, 95, 255)");
  expect(await active.evaluate(el => getComputedStyle(el, "::before").content)).toBe("none");
  await page.screenshot({ path: `.playwright-cli/designs/ta-shell-${role}-navigation-1440x900.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Mở menu điều hướng", exact: true }).click();
  const mobile = page.getByRole("dialog");
  await expect(mobile).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Đăng nhập nhanh theo vai trò" })).toBeHidden();
  const mobileLabels = await mobile.getByRole("link").allTextContents();
  expect(mobileLabels.filter(label => common.includes(label))).toEqual(common);
  await expect(mobile.locator('[aria-current="page"]')).toHaveCSS("background-color", "rgb(236, 243, 255)");
  await page.screenshot({ path: `.playwright-cli/designs/ta-shell-${role}-drawer-390x844.png` });
});


for (const role of ["admin", "moderator", "owner", "technician"]) test(`${role} shell toggles the sidebar and remembers it across reloads`, async ({ page }) => {
  const root = role === "owner" ? "dashboard" : role;
  await page.context().addCookies([{ name: "access_token", value: `header.${Buffer.from(JSON.stringify({ roles: [role], sub: "00000000-0000-4000-8000-000000000001" })).toString("base64url")}.signature`, url: test.info().project.use.baseURL as string }]);
  await page.route("**/api/**", route => route.fulfill({ json: [] }));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/${root}/notifications`);
  await expect(page.getByRole("navigation", { name: "Đường dẫn", exact: true })).toHaveCount(0);
  const toggle = page.getByRole("button", { name: "Thu gọn thanh bên", exact: true });
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const id = await toggle.getAttribute("aria-controls");
  expect(id).toBeTruthy();
  const sidebar = page.locator(`aside[id="${id}"]`);
  await expect(sidebar).toBeVisible();
  const size = await toggle.boundingBox();
  expect(size!.width).toBeGreaterThanOrEqual(44);
  expect(size!.height).toBeGreaterThanOrEqual(44);
  await toggle.focus();
  await toggle.press("Enter");
  await expect(sidebar).toBeHidden();
  await expect(page.getByRole("button", { name: "Mở thanh bên", exact: true })).toBeFocused();
  await page.reload();
  const reopen = page.getByRole("button", { name: "Mở thanh bên", exact: true });
  await expect(reopen).toHaveAttribute("aria-expanded", "false");
  await reopen.press("Space");
  await expect(sidebar).toBeVisible();
  const expandedToggle = page.getByRole("button", { name: "Thu gọn thanh bên", exact: true });
  await expect(expandedToggle).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(expandedToggle).toBeHidden();
  await page.getByRole("button", { name: "Mở menu điều hướng", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
