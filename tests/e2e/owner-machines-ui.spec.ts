import { expect, test, type Page } from "@playwright/test";
import { clickPageAction, expectNoPageAction, expectPageAction } from "./page-actions-test-helpers";

const ownerId = "f1000000-0000-4000-8000-000000000001";
const smartId = "f1000000-0000-4000-8000-000000000002";
const conventionalId = "f1000000-0000-4000-8000-000000000003";
const locationId = "f1000000-0000-4000-8000-000000000004";
const ticketId = "f1000000-0000-4000-8000-000000000005";
const alertId = "f1000000-0000-4000-8000-000000000006";
const recipeId = "f1000000-0000-4000-8000-000000000007";
const brewRecordId = "f1000000-0000-4000-8000-000000000008";
const brewEventId = "f1000000-0000-4000-8000-000000000009";
const machines = [
  { id: smartId, ownerId, locationId, serialNumber: "SMART-01", status: "UNDER_MAINTENANCE", machineType: "SMART_IOT", activeMenuId: null },
  { id: conventionalId, ownerId, locationId: null, serialNumber: "NORMAL-01", status: "AVAILABLE_FOR_RENT", machineType: "CONVENTIONAL", activeMenuId: null },
];
const ticket = { id: ticketId, machineId: smartId, ownerId, status: "RESOLVED", source: "TERMINATION_INSPECTION", scheduledDueAt: "2026-11-07T10:00:00" };
type SetupOptions = {
  heartbeatStatus?: "ONLINE" | "OFFLINE" | "UNKNOWN";
  brewRecordOnSecondPoll?: boolean;
  alerts?: unknown[];
  metricsJson?: unknown;
};
async function setup(page: Page, options: SetupOptions = {}) {
  const claims = Buffer.from(JSON.stringify({ sub: ownerId, roles: ["owner"] })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  let brewRecordPollCount = 0;
  let brewTwinPollingEnabled = false;
  await page.route("**/api/dolores/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api\/dolores\/v1/, "");
    let body: unknown = [];
    if (path === "/machines") body = machines;
    else if (path === "/locations") body = [{ id: locationId, ownerId, name: "Cửa hàng trung tâm" }];
    else if (path === `/machines/${smartId}`) body = machines[0];
    else if (path === `/machines/${conventionalId}`) body = machines[1];
    else if (path.endsWith("/heartbeats/latest")) {
      const matchedMachineId = path.match(/\/machines\/([^/]+)\/heartbeats\/latest$/)?.[1];
      body = matchedMachineId ? {
        machineId: decodeURIComponent(matchedMachineId),
        status: options.heartbeatStatus ?? "ONLINE",
        lastSeenAt: new Date().toISOString(),
        sequenceNumber: 1,
        metricsJson: options.metricsJson ?? { wifiRssiDbm: -45, cupsServed: 27 },
      } : [];
    }
    else if (path === "/owner/brew-records") {
      if (brewTwinPollingEnabled) brewRecordPollCount += 1;
      const hasNewRecord = options.brewRecordOnSecondPoll && brewTwinPollingEnabled && brewRecordPollCount >= 2;
      const brewedAt = new Date(Date.now() - 5_000).toISOString();
      body = {
        content: hasNewRecord ? [{
          id: brewRecordId,
          eventId: brewEventId,
          machineId: smartId,
          machineSerialNumber: "SMART-01",
          recipeName: "Latte",
          brewedAt,
          receivedAt: brewedAt,
        }] : [],
        page: 0,
        size: 100,
        totalElements: hasNewRecord ? 1 : 0,
        totalPages: hasNewRecord ? 1 : 0,
        first: true,
        last: true,
      };
    }
    else if (path === "/recipes/global") body = [{ id: recipeId, name: "Latte", revision: 1, menuId: null }];
    else if (path === `/recipes/global/${recipeId}`) body = {
      id: recipeId,
      name: "Latte",
      steps: ["PREMILK:5", "DOSE:18", "TAMP:100", "HOLDTAMP:50", "PREINFUSE:3", "EXTRACT:40", "POSTMILK:20"],
      revision: 1,
      menuId: null,
    };
    else if (path === "/alerts") body = options.alerts ?? [];
    else if (path.endsWith("/maintenance-schedule")) body = { nextPreventiveMaintenanceAt: null };
    else if (path === "/maintenance-tickets") body = [ticket];
    else if (path === `/maintenance-tickets/${ticketId}`) body = ticket;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
  return {
    activateBrewTwinPolling() {
      brewRecordPollCount = 0;
      brewTwinPollingEnabled = true;
    },
  };
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
  await expect(page.getByRole("button", { name: "Xem chi tiết" })).toHaveCount(0);
  await expectPageAction(page, "maintenance-ticket-create");
  await page.getByRole("tab", { name: "Bảo trì & hỗ trợ" }).click();
  await expect(page.getByText("Cửa hàng trung tâm")).toBeHidden();
  const maintenanceSummary = page.getByLabel("Tóm tắt bảo trì");
  await expect(maintenanceSummary.locator("article").filter({ hasText: "Phiếu đang mở" })).toContainText("0");
  await expect(page.getByRole("heading", { name: "Phiếu bảo trì (1)" })).toBeVisible();
  await expect(page.getByText("Chưa có yêu cầu hỗ trợ.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Xem chi tiết" })).toHaveCount(1);
  await page.getByRole("button", { name: "Xem chi tiết" }).click();
  const ticketDialog = page.getByRole("dialog", { name: "Chi tiết phiếu bảo trì" });
  await expect(ticketDialog).toBeVisible();
  await ticketDialog.getByRole("button", { name: "Đóng" }).click();
  await expect(ticketDialog).toBeHidden();
  await page.getByRole("tab", { name: "Hợp đồng" }).click();
  await expect(page.getByRole("heading", { name: "Lịch sử hợp đồng của máy" })).toBeVisible();
  await expectPageAction(page, "machine-operational-overview");
  await clickPageAction(page, "machine-operational-overview");
  await page.goto(`/dashboard/machines/${conventionalId}`);
  await expect(page.getByText("NORMAL-01")).toBeVisible();
  await expectNoPageAction(page, "machine-operational-overview");
});
test("Owner machine detail opens the local digital twin tab", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.route("**/models/digital-twin/**", (route) => route.continue());
  await page.route("**/draco-gltf/**", (route) => route.continue());
  await page.goto(`/dashboard/machines/${smartId}`);

  const tab = page.getByRole("tab", { name: "Xem máy" });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText(
    "Mô hình phát lại món vừa pha, chậm vài giây so với máy.",
    { exact: true },
  )).toBeVisible();

  const panel = page.getByRole("tabpanel", { name: "Xem máy" });
  const canvas = panel.locator("canvas");
  const loadError = panel.getByText("Không thể tải mô hình thân máy.", { exact: true });
  await expect.poll(
    async () => (await canvas.isVisible()) || (await loadError.isVisible()),
    { timeout: 30_000 },
  ).toBeTruthy();
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 390, { timeout: 5_000 });
});
test("Owner live digital twin replays new brew records and switches to simulation", async ({ page }) => {
  const setupControls = await setup(page, {
    brewRecordOnSecondPoll: true,
    alerts: [{
      id: alertId,
      level: "WARNING",
      machineId: smartId,
      message: "Nhiệt độ máy tăng cao",
      acknowledged: false,
      ts: new Date().toISOString(),
    }],
    metricsJson: JSON.stringify({ wifiRssiDbm: -45, cupsServed: 27, nested: { ignored: true } }),
  });
  await page.goto(`/dashboard/machines/${smartId}`);
  setupControls.activateBrewTwinPolling();
  await page.getByRole("tab", { name: "Xem máy" }).click();

  const liveButton = page.getByRole("button", { name: "Trực tiếp", exact: true });
  await expect(liveButton).toHaveAttribute("aria-pressed", "true");
  const panel = page.getByRole("tabpanel", { name: "Xem máy" });
  await expect(panel.getByRole("heading", { name: "Món đang pha: Latte" })).toBeVisible({ timeout: 20_000 });
  await expect(panel.locator('[aria-current="step"]')).toHaveCount(1);
  await expect(panel.getByRole("button", { name: "Xem lại", exact: true })).toBeVisible();
  await expect(panel.getByText("Nhiệt độ máy tăng cao", { exact: true })).toBeVisible();

  const shellLayer = page.getByRole("button", { name: "Vỏ", exact: true });
  await expect(shellLayer).toHaveAttribute("aria-pressed", "true");
  await shellLayer.click();
  await expect(shellLayer).toHaveAttribute("aria-pressed", "false");
  await shellLayer.click();

  await panel.getByRole("button", { name: "Xem lại", exact: true }).click();
  await expect(panel.getByRole("heading", { name: /Món (đang pha|vừa pha): Latte/ })).toBeVisible();

  await page.getByRole("button", { name: "Mô phỏng", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mô phỏng", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(panel.getByLabel("Chọn công thức")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Chạy món này", exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Dừng", exact: true }).click();
  await panel.getByRole("button", { name: "Chạy món này", exact: true }).click();
  await expect(panel.locator('[aria-current="step"]')).toHaveCount(1);
});
test("Owner live digital twin shows when the machine is offline", async ({ page }) => {
  await setup(page, { heartbeatStatus: "OFFLINE" });
  await page.goto(`/dashboard/machines/${smartId}`);
  await page.getByRole("tab", { name: "Xem máy" }).click();

  await expect(page.getByText(/Mất kết nối — trạng thái cuối lúc/)).toBeVisible();
});
test("Owner conventional machine opens only the simulation twin", async ({ page }) => {
  await setup(page);
  await page.goto(`/dashboard/machines/${conventionalId}`);
  await page.getByRole("tab", { name: "Xem máy" }).click();

  await expect(page.getByRole("button", { name: "Trực tiếp", exact: true })).toHaveCount(0);
  await expect(page.getByText("Máy thông thường không gửi dữ liệu, chỉ xem mô phỏng.", { exact: true })).toBeVisible();
});
test("Owner toolbar wraps at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await setup(page); await page.goto("/dashboard/machines");
  await expect(page.getByRole("button", { name: "Làm mới" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
