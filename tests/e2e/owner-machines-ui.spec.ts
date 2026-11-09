import { expect, test, type Page } from "@playwright/test";
import { clickPageAction, expectNoPageAction, expectPageAction } from "./page-actions-test-helpers";

const ownerId = "f1000000-0000-4000-8000-000000000001";
const smartId = "f1000000-0000-4000-8000-000000000002";
const conventionalId = "f1000000-0000-4000-8000-000000000003";
const locationId = "f1000000-0000-4000-8000-000000000004";
const ticketId = "f1000000-0000-4000-8000-000000000005";
const machines = [
  { id: smartId, ownerId, locationId, serialNumber: "SMART-01", status: "UNDER_MAINTENANCE", machineType: "SMART_IOT" },
  { id: conventionalId, ownerId, locationId: null, serialNumber: "NORMAL-01", status: "AVAILABLE_FOR_RENT", machineType: "CONVENTIONAL" },
];
const ticket = { id: ticketId, machineId: smartId, ownerId, status: "RESOLVED", source: "TERMINATION_INSPECTION", scheduledDueAt: "2026-11-07T10:00:00" };
async function setup(page: Page) {
  const claims = Buffer.from(JSON.stringify({ sub: ownerId, roles: ["owner"] })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/dolores/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api\/dolores\/v1/, "");
    let body: unknown = [];
    if (path === "/machines") body = machines;
    else if (path === "/locations") body = [{ id: locationId, ownerId, name: "Cửa hàng trung tâm" }];
    else if (path === `/machines/${smartId}`) body = machines[0];
    else if (path === `/machines/${conventionalId}`) body = machines[1];
    else if (path.endsWith("/maintenance-schedule")) body = { nextPreventiveMaintenanceAt: null };
    else if (path === "/maintenance-tickets") body = [ticket];
    else if (path === `/maintenance-tickets/${ticketId}`) body = ticket;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
}
test("Owner machine list shows status, location and fleet counts", async ({ page }) => {
  await setup(page); await page.goto("/dashboard/machines");
  const rows = page.getByRole("row");
  await expect(rows.filter({ hasText: "SMART-01" })).toContainText("Đang bảo trì");
  await expect(rows.filter({ hasText: "SMART-01" })).toContainText("Cửa hàng trung tâm");
  await expect(rows.filter({ hasText: "NORMAL-01" })).toContainText("Sẵn sàng cho thuê");
  await expect(rows.filter({ hasText: "NORMAL-01" })).toContainText("Kho");
  const summary = page.getByLabel("Tóm tắt máy");
  for (const [label, count] of [["Tổng số máy", "2"], ["Smart IoT", "1"], ["Thông thường", "1"], ["Đang bảo trì", "1"]]) await expect(summary.locator("article").filter({ hasText: label })).toContainText(count);
  await page.getByRole("button", { name: "Smart IoT", exact: true }).click();
  await expect(summary.locator("article").filter({ hasText: "Tổng số máy" })).toContainText("2");
});
test("Owner detail shows a single ticket and Smart IoT action", async ({ page }) => {
  await setup(page); await page.goto(`/dashboard/machines/${smartId}`);
  await expect(page.getByTitle(smartId)).toHaveText(`${smartId.slice(0, 12)}…`);
  await expect(page.getByText("Cửa hàng trung tâm")).toBeVisible();
  await expect(page.getByRole("button", { name: "Xem chi tiết" })).toHaveCount(1);
  await page.getByRole("button", { name: "Xem chi tiết" }).click();
  await expect(page.getByRole("heading", { name: "Chi tiết phiếu bảo trì" })).toBeVisible();
  await expectPageAction(page, "machine-operational-overview");
  await clickPageAction(page, "machine-operational-overview");
  await page.goto(`/dashboard/machines/${conventionalId}`);
  await expect(page.getByText("NORMAL-01")).toBeVisible();
  await expectNoPageAction(page, "machine-operational-overview");
});
test("Owner toolbar wraps at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await setup(page); await page.goto("/dashboard/machines");
  await expect(page.getByRole("button", { name: "Làm mới" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
