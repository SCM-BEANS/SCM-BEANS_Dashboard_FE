import { test, expect } from "@playwright/test";

const common = ["Tổng quan", "Cửa hàng", "Hợp đồng", "Hóa đơn", "Quản lý máy", "Yêu cầu kỹ thuật", "Công thức pha chế", "Gói cà phê", "Thu mua máy", "Thông báo"];

for (const role of ["admin", "moderator", "owner"]) test(`${role} has consistent navigation names, order and neutral selection on desktop and mobile`, async ({ page }) => {
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
  await expect(active).toHaveCSS("background-color", "rgb(247, 245, 243)");
  await expect(active).toHaveCSS("color", "rgb(48, 41, 39)");
  expect(await active.evaluate(el => getComputedStyle(el, "::before").content)).toBe("none");
  await page.screenshot({ path: `.playwright-cli/sidebar-${role}-desktop.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Mở menu điều hướng", exact: true }).click();
  const mobile = page.getByRole("dialog");
  await expect(mobile).toBeVisible();
  const mobileLabels = await mobile.getByRole("link").allTextContents();
  expect(mobileLabels.filter(label => common.includes(label))).toEqual(common);
  await expect(mobile.locator('[aria-current="page"]')).toHaveCSS("background-color", "rgb(247, 245, 243)");
  await page.screenshot({ path: `.playwright-cli/sidebar-${role}-mobile.png` });
});
