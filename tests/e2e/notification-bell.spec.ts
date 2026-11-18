import { test, expect, type Page } from "@playwright/test";

async function setup(page: Page, role = "admin", failRead = false) {
  const subject = "00000000-0000-4000-8000-000000000001";
  const contractId = "00000000-0000-4000-8000-000000000009";
  const items = Array.from({ length: 3 }, (_, index) => ({ id: `00000000-0000-4000-8000-${String(index + 10).padStart(12, "0")}`, title: `Thông báo mới ${index + 1}`, message: index === 2 ? `Machine ${subject} is online but not reporting valid GPS coordinates.` : `Hợp đồng ${contractId} sẽ hết hạn vào 2026-11-22.`, type: index === 2 ? "MACHINE_GPS_SIGNAL_MISSING" : "CONTRACT_EXPIRING", read: false, createdAt: `2026-11-14T0${index + 1}:00:00Z` }));
  const writes: string[] = [];
  await page.context().addCookies([{ name: "access_token", value: `header.${Buffer.from(JSON.stringify({ roles: [role], sub: subject })).toString("base64url")}.signature`, url: test.info().project.use.baseURL as string }]);
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/dolores/v1", "");
    let body: unknown = [];
    let status = 200;
    if (path === "/notifications/unread-count") body = { unreadCount: items.filter(item => !item.read).length };
    else if (path === "/notifications") body = items;
    else if (path.startsWith("/notifications/") && path.endsWith("/read")) {
      const item = items.find(item => path.includes(item.id))!;
      writes.push(item.id);
      if (failRead) { status = 503; body = { message: "Service unavailable" }; }
      else { item.read = true; body = item; }
    }
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto(`/${role === "owner" ? "dashboard" : role}/notifications`);
  await expect(page.getByRole("button", { name: "Danh sách thông báo: 3 chưa đọc", exact: true }).first()).toBeVisible();
  return { writes, add: () => { const index = items.length; items.push({ ...items[0], id: `00000000-0000-4000-8000-${String(index + 10).padStart(12, "0")}`, title: `Thông báo mới ${index + 1}`, read: false, createdAt: "2026-11-14T09:00:00Z" }); } };
}

test("opening unread records marks them read and exposes only evidence-backed profile links", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  const api = await setup(page);
  const bell = page.getByRole("button", { name: /Danh sách thông báo: .*chưa đọc/ }).first();
  await bell.click();
  const drawer = page.getByRole("dialog", { name: "Thông báo", exact: true });
  await expect(drawer).toBeVisible();
  await expect(drawer.locator("article")).toHaveCount(3);
  expect(api.writes).toHaveLength(0);
  await drawer.getByRole("button", { name: "Hợp đồng", exact: true }).click();
  await expect(drawer.locator("article")).toHaveCount(2);
  expect(api.writes).toHaveLength(0);
  await drawer.getByRole("button", { name: /Thông báo mới 2/ }).click();
  await expect(drawer.getByText("2 chưa đọc", { exact: true })).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Thông báo mới 2", exact: true })).toHaveAttribute("href", "/admin/contracts?view=detail&id=00000000-0000-4000-8000-000000000009");
  expect(api.writes).toHaveLength(1);
  await drawer.getByRole("button", { name: "Đánh dấu tất cả đã đọc", exact: true }).click();
  await expect(drawer.getByText("1 chưa đọc", { exact: true })).toBeVisible();
  expect(api.writes).toHaveLength(2);
  await drawer.getByRole("button", { name: "Tất cả", exact: true }).click();
  await expect(drawer.getByRole("img", { name: "Chưa đọc", exact: true })).toHaveCount(1);
  await drawer.getByRole("button", { name: /chưa gửi được vị trí GPS/ }).click();
  await expect(drawer.getByText("0 chưa đọc", { exact: true })).toBeVisible();
  await expect(drawer.getByRole("link", { name: /chưa gửi được vị trí GPS/ })).toHaveAttribute("href", "/admin/machines/00000000-0000-4000-8000-000000000001");
  expect(api.writes).toHaveLength(3);
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(bell).toBeFocused();
});

test("new notifications create one toast, auto-dismiss without read changes, and DND preserves badge updates", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.clock.install();
  const api = await setup(page);
  await expect(page.getByRole("region", { name: "Thông báo mới", exact: true })).toHaveCount(0);
  api.add();
  await page.clock.runFor(15_100);
  const toasts = page.getByRole("region", { name: "Thông báo mới", exact: true });
  await expect(toasts.locator("article")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Danh sách thông báo: 4 chưa đọc", exact: true }).first()).toBeVisible();
  await page.clock.runFor(250);
  await page.clock.runFor(3100);
  await expect(toasts).toHaveCount(0);
  expect(api.writes).toHaveLength(0);
  await page.getByRole("button", { name: /Danh sách thông báo:/ }).first().click();
  const drawer = page.getByRole("dialog", { name: "Thông báo", exact: true });
  await drawer.getByRole("combobox", { name: "Không làm phiền", exact: true }).selectOption("1");
  await drawer.getByRole("button", { name: "Cài đặt thông báo", exact: true }).click();
  await drawer.getByLabel("Vị trí thông báo nổi", { exact: true }).selectOption("bottom-center");
  await drawer.getByRole("button", { name: "Đóng bảng thông báo", exact: true }).click();
  await page.clock.runFor(250);
  api.add();
  await page.clock.runFor(15_100);
  await expect(page.getByRole("button", { name: "Danh sách thông báo: 5 chưa đọc", exact: true }).first()).toBeVisible();
  await expect(toasts).toHaveCount(0);
  await page.getByRole("button", { name: /Danh sách thông báo:/ }).first().click();
  await expect(drawer.locator("article")).toHaveCount(5);
  await drawer.getByRole("combobox", { name: "Không làm phiền", exact: true }).selectOption("off");
  await drawer.getByRole("button", { name: "Đóng bảng thông báo", exact: true }).click();
  await page.clock.runFor(250);
  api.add();
  await page.clock.runFor(12_000);
  await expect(toasts).toHaveAttribute("data-position", "bottom-center");
  await toasts.getByRole("button", { name: /Đóng thông báo nổi:/ }).click();
  await expect(toasts).toHaveCount(0);
  expect(api.writes).toHaveLength(0);
});

for (const role of ["moderator", "owner"]) test(`${role} drawer fits mobile, settings persist and failed read keeps unread`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const api = await setup(page, role, true);
  await page.getByRole("button", { name: /Danh sách thông báo:/ }).last().click();
  const drawer = page.getByRole("dialog", { name: "Thông báo", exact: true });
  await drawer.getByRole("button", { name: /chưa gửi được vị trí GPS/ }).click();
  await expect(drawer.getByRole("alert")).toContainText("Chưa cập nhật được trạng thái");
  await expect(drawer.getByRole("img", { name: "Chưa đọc", exact: true })).toHaveCount(3);
  await drawer.getByRole("button", { name: "Cài đặt thông báo", exact: true }).click();
  await drawer.getByLabel("Vị trí thông báo nổi", { exact: true }).selectOption("bottom-left");
  await drawer.getByRole("combobox", { name: "Không làm phiền", exact: true }).selectOption("custom");
  await drawer.getByLabel("Tạm tắt đến", { exact: true }).fill("2020-01-01T10:00");
  await drawer.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect(drawer.getByText("Chọn thời gian sau thời điểm hiện tại.")).toBeVisible();
  const box = (await drawer.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.width).toBeLessThanOrEqual(390);
  expect(await drawer.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: /Danh sách thông báo:/ }).last().click();
  await drawer.getByRole("button", { name: "Cài đặt thông báo", exact: true }).click();
  await expect(drawer.getByLabel("Vị trí thông báo nổi", { exact: true })).toHaveValue("bottom-left");
  expect(api.writes).toHaveLength(1);
});
