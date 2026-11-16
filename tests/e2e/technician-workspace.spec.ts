import { test, expect } from "@playwright/test";

const id = "f4000000-0000-4000-8000-000000000001";
test.beforeEach(async ({ page }) => {
  await page.context().addCookies([{ name: "access_token", value: `header.${Buffer.from(JSON.stringify({ roles: ["technician"], sub: id })).toString("base64url")}.signature`, domain: "127.0.0.1", path: "/" }]);
});

test("technician tasks paginate on the server and keep mobile content inside the screen", async ({ page }) => {
  const calls: URL[] = [];
  await page.route("**/api/**", route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/technician/work-items")) {
      calls.push(url);
      const index = Number(url.searchParams.get("page"));
      return route.fulfill({ json: { items: Array.from({ length: index ? 2 : 10 }, (_, n) => ({ id: `f4000000-0000-4000-8000-${String(n + 1).padStart(12, "0")}`, machineId: id, workType: "INSTALLATION", status: "ASSIGNED", serialNumber: `MAY-${n + 1}`, ownerName: "Khách hàng", detailPath: "", summary: "Lắp đặt máy tại cửa hàng" })), page: index, size: 10, hasNext: !index } });
    }
    return route.fulfill({ json: [] });
  });
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/technician");
  await expect(page.getByRole("link", { name: "Mở việc", exact: true })).toHaveCount(10);
  expect(calls[0].searchParams.get("size")).toBe("10");
  await page.screenshot({ path: ".playwright-cli/technician-tasks-desktop.png" });
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();
  await expect(page.getByRole("link", { name: "Mở việc", exact: true })).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: ".playwright-cli/technician-tasks-mobile.png" });
});

test("machine search applies on submit and opens a dedicated profile", async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith("/machines") ? [{ id, serialNumber: "DOLORES-001", status: "IN_WAREHOUSE", machineType: "SMART_IOT", ownerName: "Khách hàng" }] : [] }));
  await page.goto("/technician/machine-check");
  await expect(page.getByRole("link", { name: "Xem hồ sơ", exact: true })).toHaveAttribute("href", `/technician/machine-check/${id}`);
  await page.getByRole("textbox", { name: "Tìm máy", exact: true }).fill("missing");
  await expect(page.getByRole("link", { name: "Xem hồ sơ", exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page.getByRole("link", { name: "Xem hồ sơ", exact: true })).toHaveCount(0);
});

test("technician work details show the shared progress and maintenance layout", async ({ page }) => {
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith(`/installation-work-orders/${id}`)) return route.fulfill({ json: { workOrder: { id, ownerId: id, contractId: id, machineId: id, machineType: "CONVENTIONAL", status: "IN_PROGRESS", assignedTechnicianId: id, scheduledFor: null, startedAt: null, completedAt: null, handoverRecipient: null, failureReason: null, createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z", createdBy: id }, checklistItems: [], accessories: [], evidence: [], installationNotes: null, checklistItemCount: 0, accessoryCount: 0, evidenceCount: 0 } });
    if (path.endsWith(`/maintenance-tickets/${id}`)) return route.fulfill({ json: { id, machineId: id, status: "ASSIGNED" } });
    return route.fulfill({ json: [] });
  });
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(`/technician/tasks/${id}`);
  await expect(page.getByRole("region", { name: "Tiến độ lắp đặt", exact: true })).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toHaveText(/Đang lắp đặt/);
  await page.screenshot({ path: ".playwright-cli/technician-installation-desktop.png" });
  await page.goto(`/technician/tasks/maintenance-tickets/${id}`);
  await expect(page.getByRole("heading", { name: "Chi tiết phiếu bảo trì", exact: true })).toBeVisible();
  await page.screenshot({ path: ".playwright-cli/technician-maintenance-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
