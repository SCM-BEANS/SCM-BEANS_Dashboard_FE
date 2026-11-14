import { test, expect, type Page } from "@playwright/test";

async function setup(page: Page, failList = false, failRead = false, role: "admin" | "moderator" | "owner" = "admin", path?: string) {
  const subject = "00000000-0000-4000-8000-000000000001";
  const notifications = Array.from({ length: 12 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 10).padStart(12, "0")}`,
    title: `Thông báo kiểm tra ${index + 1}`, message: `Nội dung thông báo ${index + 1} dành cho quản trị viên.`,
    type: index % 2 ? "MAINTENANCE" : "CONTRACT_EXPIRING", ownerId: subject,
    read: index % 2 === 1, createdAt: index < 8 ? "2026-11-14T08:00:00Z" : "2020-11-12T08:00:00Z",
  }));
  if (role === "owner") {
    notifications[0].type = "REPAIR_COST_REVIEW";
    notifications[0].title = "Chi phí sửa chữa cần xem xét";
    notifications[0].message = `Review ID: ${subject}`;
  }
  const alerts = [{ id: subject, machineId: subject, level: "HIGH", message: "Máy cần được kiểm tra kết nối", acknowledged: false, ts: "2026-11-14T08:00:00Z" }, { id: "00000000-0000-4000-8000-000000000002", machineId: subject, level: "WASTAGE_ANOMALY", message: "Wastage anomaly detected: 100.00% exceeds threshold 5.0%", acknowledged: false, ts: "2026-11-13T08:00:00Z" }];
  await page.context().addCookies([{ name: "access_token", value: `header.${Buffer.from(JSON.stringify({ roles: [role], sub: subject })).toString("base64url")}.signature`, url: test.info().project.use.baseURL as string }]);
  let writes = 0;
  let alertReads = 0;
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api/dolores/v1", "");
    let body: unknown = [];
    let status = 200;
    if (path === "/notifications/unread-count") body = { unreadCount: notifications.filter(item => !item.read).length };
    else if (path === "/notifications") { body = notifications; if (failList) { status = 503; body = { message: "Service unavailable" }; } }
    else if (path === "/notifications/read-all") { writes++; notifications.forEach(item => { item.read = true; }); body = {}; }
    else if (path.startsWith("/notifications/") && path.endsWith("/read")) { writes++; const item = notifications.find(item => path.includes(item.id))!; if (failRead) { status = 503; body = { message: "Service unavailable" }; } else { item.read = true; body = item; } }
    else if (path === "/alerts") { alertReads++; body = alerts; }
    else if (path.endsWith("/ack")) { writes++; alerts[0].acknowledged = true; body = {}; }
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto(path ?? `/${role === "owner" ? "dashboard" : role}/notifications`);
  return { writes: () => writes, alertReads: () => alertReads };
}

test("admin notifications paginate, filter and mark read only through explicit action", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  const api = await setup(page);
  const panel = page.getByRole("region", { name: "Danh sách thông báo", exact: true });
  await expect(panel.locator("article")).toHaveCount(10);
  const detail = page.getByRole("complementary", { name: "Chi tiết thông báo" });
  await expect(detail).toBeVisible();
  const feedBox = (await panel.boundingBox())!;
  expect((await detail.boundingBox())!.x).toBeGreaterThan(feedBox.x + feedBox.width);
  await expect(panel.getByRole("heading", { name: "Trước đó", exact: true })).toBeVisible();
  await expect(panel.locator('article[data-selected="true"]')).toHaveCSS("background-color", "rgb(253, 248, 247)");
  await panel.locator("article").nth(1).hover();
  await expect(panel.locator("article").nth(1)).toHaveCSS("background-color", "rgb(253, 248, 247)");
  const secondMenu = panel.locator("article").nth(1).locator("details");
  await secondMenu.locator("summary").click();
  await secondMenu.getByRole("button", { name: "Xem chi tiết", exact: true }).click();
  await expect(detail.getByRole("heading", { name: "Thông báo kiểm tra 2", exact: true })).toBeVisible();
  await expect(detail).toBeFocused();
  expect(api.writes()).toBe(0);
  await page.screenshot({ path: ".playwright-cli/notifications-list-verified.png" });
  await panel.getByRole("button", { name: "Trang sau", exact: true }).click();
  await expect(panel.locator("article")).toHaveCount(2);
  await panel.getByRole("textbox", { name: "Tìm thông báo" }).fill("kiểm tra 12");
  await panel.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(panel.locator("article")).toHaveCount(1);
  await panel.getByRole("button", { name: /Thông báo kiểm tra 12/ }).click();
  await expect(detail.getByRole("heading", { name: "Thông báo kiểm tra 12", exact: true })).toBeVisible();
  await detail.getByRole("button", { name: "Đóng chi tiết thông báo" }).click();
  await expect(detail).toHaveCount(0);
  await expect(panel.getByRole("button", { name: /Thông báo kiểm tra 12/ })).toBeFocused();
  expect(api.writes()).toBe(0);
  await panel.getByRole("textbox", { name: "Tìm thông báo" }).fill("");
  await panel.getByRole("button", { name: "Chưa đọc", exact: true }).click();
  await panel.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(panel.locator("article")).toHaveCount(6);
  const menu = panel.locator("article").first().locator("details");
  await menu.locator("summary").click();
  await expect(menu.getByRole("button", { name: "Đánh dấu đã đọc", exact: true })).toBeVisible();
  await menu.locator("summary").press("Escape");
  await expect(menu).not.toHaveAttribute("open", "");
  await menu.locator("summary").click();
  await menu.getByRole("button", { name: "Đánh dấu đã đọc", exact: true }).click();
  await expect(panel.locator("article")).toHaveCount(5);
  await panel.getByRole("button", { name: "Đánh dấu tất cả đã đọc", exact: true }).click();
  await expect(panel.getByText("Không có thông báo phù hợp với bộ lọc.")).toBeVisible();
  expect(api.writes()).toBe(2);
  await page.screenshot({ path: ".playwright-cli/notifications-empty-verified.png" });
});

test("alerts occupy their own view and remain usable on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  const api = await setup(page);
  await page.getByRole("button", { name: "Cảnh báo máy", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Danh sách thông báo", exact: true })).toHaveCount(0);
  const alertFeed = page.getByRole("region", { name: "Cảnh báo máy", exact: true });
  const alertDetail = page.getByRole("complementary", { name: "Chi tiết cảnh báo" });
  await expect(alertFeed.locator("article")).toHaveCount(2);
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(alertDetail.getByText("Máy cần được kiểm tra kết nối", { exact: true })).toBeVisible();
  await page.screenshot({ path: ".playwright-cli/notifications-alerts-verified.png" });
  await page.getByRole("button", { name: "Xác nhận cảnh báo", exact: true }).click();
  await expect(alertDetail.getByText("Đã xác nhận", { exact: true })).toBeVisible();
  expect(api.writes()).toBe(1);
  await alertFeed.getByRole("button", { name: /Hao hụt bất thường/ }).click();
  await expect(alertDetail.getByRole("heading", { name: "Hao hụt bất thường", exact: true })).toBeVisible();
  await expect(alertDetail.getByRole("button", { name: "Xác nhận cảnh báo", exact: true })).toHaveCount(0);
  await expect(alertDetail.getByText("Cảnh báo này chỉ để theo dõi, không yêu cầu xác nhận.")).toBeVisible();
  await alertFeed.getByRole("textbox", { name: "Tìm cảnh báo" }).fill("KHÔNG TỒN TẠI");
  await alertFeed.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(alertFeed.getByText("Không có cảnh báo phù hợp với bộ lọc.")).toBeVisible();
  await expect(alertDetail).toHaveCount(0);
  await alertFeed.getByRole("textbox", { name: "Tìm cảnh báo" }).fill("");
  await alertFeed.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await alertFeed.locator("article").last().getByRole("button").click();
  await expect(alertDetail).toBeFocused();
  await page.getByRole("button", { name: "Thông báo", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Tìm thông báo" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("region", { name: "Danh sách thông báo", exact: true }).locator("article").first().getByRole("button").click();
  await expect(page.getByRole("complementary", { name: "Chi tiết thông báo" })).toBeFocused();
  await page.screenshot({ path: ".playwright-cli/notifications-mobile-detail.png" });
});

test("failed mark-read preserves unread state and offers an error", async ({ page }) => {
  const api = await setup(page, false, true);
  const detail = page.getByRole("complementary", { name: "Chi tiết thông báo" });
  await detail.getByRole("button", { name: "Đánh dấu đã đọc", exact: true }).click();
  await expect(page.getByRole("region", { name: "Danh sách thông báo", exact: true }).getByRole("alert")).toContainText("Không thể cập nhật thông báo.");
  await expect(detail.getByText("Chưa đọc", { exact: true })).toBeVisible();
  await expect(detail.getByRole("button", { name: "Đánh dấu đã đọc", exact: true })).toBeEnabled();
  expect(api.writes()).toBe(1);
});

test("a failed list is an error with retry, not an empty inbox", async ({ page }) => {
  await setup(page, true);
  const panel = page.getByRole("region", { name: "Danh sách thông báo", exact: true });
  await expect(panel.getByRole("alert")).toContainText("Không thể tải danh sách thông báo.");
  await expect(panel.getByRole("button", { name: "Thử lại", exact: true })).toBeVisible();
  await expect(panel.getByText("Không có thông báo phù hợp với bộ lọc.")).toHaveCount(0);
});

for (const role of ["moderator", "owner"] as const) {
  test(`${role} uses the shared inbox layout with the correct available actions`, async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    const api = await setup(page, false, false, role);
    const notificationHref = `/${role === "owner" ? "dashboard" : "moderator"}/notifications`;
    const desktopNavigation = page.getByRole("navigation", { name: role === "owner" ? "Điều hướng Khách hàng" : "Điều hướng Moderator", exact: true });
    const notificationLink = desktopNavigation.getByRole("link", { name: "Thông báo", exact: true });
    await expect(notificationLink).toBeVisible();
    await expect(notificationLink).toHaveAttribute("href", notificationHref);
    await expect(notificationLink).toHaveAttribute("aria-current", "page");
    await notificationLink.click();
    const feed = page.getByRole("region", { name: "Danh sách thông báo", exact: true });
    const detail = page.getByRole("complementary", { name: "Chi tiết thông báo" });
    await expect(feed.locator("article")).toHaveCount(10);
    await expect(detail).toBeVisible();
    expect((await detail.boundingBox())!.x).toBeGreaterThan((await feed.boundingBox())!.x + (await feed.boundingBox())!.width);
    await expect(feed.locator('article[data-selected="true"]')).toHaveCSS("background-color", "rgb(253, 248, 247)");
    if (role === "owner") {
      await expect(page.getByRole("button", { name: "Cảnh báo máy", exact: true })).toHaveCount(0);
      await expect(detail.getByRole("link", { name: "Mở chi tiết xem xét chi phí" })).toHaveAttribute("href", "/dashboard/repair-cost-reviews/00000000-0000-4000-8000-000000000001");
      expect(api.alertReads()).toBe(0);
    } else {
      await expect(page.getByRole("button", { name: "Cảnh báo máy", exact: true })).toBeVisible();
    }
    await page.screenshot({ path: `.playwright-cli/${role}-notifications-aligned.png` });
    await detail.getByRole("button", { name: "Đánh dấu đã đọc", exact: true }).click();
    await expect(detail.getByText("Đã đọc", { exact: true })).toBeVisible();
    expect(api.writes()).toBe(1);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Mở menu điều hướng", exact: true }).click();
    const mobileMenu = page.getByRole("dialog");
    const mobileNotificationLink = mobileMenu.getByRole("link", { name: "Thông báo", exact: true });
    await expect(mobileNotificationLink).toBeVisible();
    await expect(mobileNotificationLink).toHaveAttribute("href", notificationHref);
    await mobileNotificationLink.click();
    await expect(mobileMenu).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(notificationHref + "$"));
  });
}

test("moderator alert deep link opens the new alert list directly and preserves acknowledgement", async ({ page }) => {
  const api = await setup(page, false, false, "moderator", "/moderator/notifications/alerts");
  const detail = page.getByRole("complementary", { name: "Chi tiết cảnh báo" });
  await expect(page.getByRole("region", { name: "Cảnh báo máy", exact: true }).locator("article")).toHaveCount(2);
  await expect(page.getByRole("note")).toContainText("toàn hệ thống");
  await detail.getByRole("button", { name: "Xác nhận cảnh báo", exact: true }).click();
  await expect(detail.getByText("Đã xác nhận", { exact: true })).toBeVisible();
  expect(api.writes()).toBe(1);
  await page.getByRole("button", { name: "Thông báo", exact: true }).click();
  await expect(page.getByRole("region", { name: "Danh sách thông báo", exact: true }).locator("article")).toHaveCount(10);
});
