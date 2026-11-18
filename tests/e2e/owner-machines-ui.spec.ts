import { expect, test, type Page } from "@playwright/test";

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
  await page.setViewportSize({ width: 1440, height: 900 });
  await setup(page); await page.goto("/dashboard/machines");
  const rows = page.getByRole("row");
  await expect(rows.filter({ hasText: "SMART-01" })).toContainText("Đang bảo trì");
  await expect(rows.filter({ hasText: "SMART-01" })).toContainText("Cửa hàng trung tâm");
  await expect(rows.filter({ hasText: "NORMAL-01" })).toContainText("Sẵn sàng cho thuê");
  await expect(rows.filter({ hasText: "NORMAL-01" })).toContainText("Kho");
  const heading = page.getByRole("heading", { name: "Máy của tôi", exact: true }).locator("xpath=../..");
  await expect(heading.getByRole("link", { name: "Đăng ký máy", exact: true })).toBeVisible();
  await expect(heading.getByRole("button", { name: "Làm mới", exact: true })).toHaveCount(0);
  await page.screenshot({ path: ".playwright-cli/designs/ui-after-owner-machines.png" });
  await page.getByRole("combobox", { name: "Loại máy", exact: true }).selectOption("SMART_IOT");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(rows.filter({ hasText: "SMART-01" })).toHaveCount(1);
  await expect(rows.filter({ hasText: "NORMAL-01" })).toHaveCount(0);
});
test("Owner detail shows a single ticket and Smart IoT action", async ({ page }) => {
  await setup(page); await page.goto(`/dashboard/machines/${smartId}`);
  await page.getByText("Thông tin bổ sung", { exact: true }).click();
  await expect(page.getByTitle(smartId)).toHaveText(`${smartId.slice(0, 12)}…`);
  await expect(page.getByText("Cửa hàng trung tâm")).toBeVisible();
  await expect(page.getByRole("link", { name: "Xem chi tiết" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Bảo trì & hỗ trợ" }).click();
  await expect(page.getByText("Cửa hàng trung tâm")).toBeHidden();
  const maintenanceSummary = page.getByLabel("Tóm tắt bảo trì");
  await expect(maintenanceSummary.locator("article").filter({ hasText: "Phiếu mở trong trang" })).toContainText("0");
  await expect(page.getByRole("button", { name: "Tạo phiếu bảo trì" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Phiếu bảo trì (1)" })).toBeVisible();
  await expect(page.getByText("Chưa có yêu cầu hỗ trợ.")).toBeVisible();
  const ticketLink = page.getByRole("link", { name: "Xem chi tiết" });
  await expect(ticketLink).toHaveCount(1);
  await ticketLink.click();
  await expect(page.getByRole("heading", { name: "Chi tiết phiếu bảo trì", exact: true })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`maintenanceTicketId=${ticketId}`));
  await page.goBack();
  await page.getByRole("tab", { name: "Hợp đồng" }).click();
  await expect(page.getByRole("heading", { name: "Lịch sử hợp đồng của máy" })).toBeVisible();
  await page.getByRole("link", { name: "Xem vận hành" }).click();
  await expect(page).toHaveURL(new RegExp(`/machines/${smartId}/operations`));
  await page.getByRole("button", { name: "Về hồ sơ máy" }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ máy · SMART-01" })).toBeVisible();
  await page.goto(`/dashboard/machines/${smartId}/operations`);
  await page.getByRole("button", { name: "Về hồ sơ máy" }).click();
  await expect(page).toHaveURL(new RegExp(`/machines/${smartId}$`));
  await page.goto(`/dashboard/machines/${conventionalId}`);
  await expect(page.getByRole("heading", { name: "Hồ sơ máy · NORMAL-01" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Xem vận hành" })).toHaveCount(0);
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
  await expect(page.getByRole("button", { name: "Trực tiếp", exact: true })).toHaveAttribute("aria-pressed", "true");

  const panel = page.getByRole("tabpanel", { name: "Xem máy" });
  const canvas = panel.locator("canvas");
  const loadError = panel.getByText("Không thể tải mô hình thân máy.", { exact: true });
  await expect.poll(
    async () => (await canvas.isVisible()) || (await loadError.isVisible()),
    { timeout: 30_000 },
  ).toBeTruthy();
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 390, { timeout: 5_000 });
});
test("Owner digital twin displays live telemetry and can replay a recent brew in simulation", async ({ page }) => {
  // The separate viewer smoke test covers GLB loading.
  await page.route("**/models/**/*.glb", route => route.abort());
  const setupControls = await setup(page, {
    brewRecordOnSecondPoll: true,
    alerts: [{
      id: alertId,
      level: "CRITICAL",
      machineId: smartId,
      message: "Nhiệt độ máy tăng cao",
      acknowledged: false,
      ts: new Date().toISOString(),
    }],
    metricsJson: JSON.stringify({ fsm_state: "MAIN_EXTRACTION", recipe_name: "Latte", recipe_step: 5, wifiRssiDbm: -45 }),
  });
  await page.goto(`/dashboard/machines/${smartId}`);
  setupControls.activateBrewTwinPolling();
  // The development overlay reports the intentionally aborted model request.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.getByRole("tab", { name: "Xem máy" }).click();

  const liveButton = page.getByRole("button", { name: "Trực tiếp", exact: true });
  await expect(liveButton).toHaveAttribute("aria-pressed", "true");
  const panel = page.getByRole("tabpanel", { name: "Xem máy" });
  const liveStep = panel.getByRole("region", { name: "Bước pha hiện tại" });
  await expect(liveStep.getByRole("status")).toHaveText("Đang chiết xuất");
  await expect(liveStep).toContainText("Latte");
  await expect(panel.getByRole("alert").filter({ hasText: "Nhiệt độ máy tăng cao" })).toBeVisible();

  await panel.getByRole("button", { name: "Xem thêm", exact: true }).click();
  await panel.getByText("Hiển thị bộ phận", { exact: true }).click();
  const shellLayer = panel.getByRole("checkbox", { name: "Vỏ máy", exact: true });
  await expect(shellLayer).toBeChecked();
  await shellLayer.uncheck();
  await expect(shellLayer).not.toBeChecked();
  await shellLayer.check();

  await panel.getByText("Lịch sử pha", { exact: true }).click();
  const replay = panel.getByRole("button", { name: "Xem lại", exact: true });
  await expect(replay).toBeVisible({ timeout: 15_000 });
  await replay.press("Enter");
  await expect(panel.getByRole("heading", { name: /Món (đang pha|vừa pha): Latte/ })).toBeVisible();

  await expect(page.getByRole("button", { name: "Mô phỏng", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(panel.getByLabel("Món mô phỏng")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Chạy mô phỏng", exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Dừng", exact: true }).click();
  await panel.getByRole("button", { name: "Chạy mô phỏng", exact: true }).click();
  await panel.getByText("Quy trình pha", { exact: true }).click();
  await expect(panel.locator('[aria-current="step"]')).toHaveCount(1);
});
test("Owner live digital twin shows when the machine is offline", async ({ page }) => {
  await setup(page, { heartbeatStatus: "OFFLINE" });
  await page.goto(`/dashboard/machines/${smartId}`);
  await page.getByRole("tab", { name: "Xem máy" }).click();

  const panel = page.getByRole("tabpanel", { name: "Xem máy" });
  await expect(panel.getByText("Mất kết nối", { exact: true })).toBeVisible();
  await expect(panel.getByText(/^Tín hiệu gần nhất:/)).toBeVisible();
});
test("Owner conventional machine opens only the simulation twin", async ({ page }) => {
  await setup(page);
  await page.goto(`/dashboard/machines/${conventionalId}`);
  await page.getByRole("tab", { name: "Xem máy" }).click();

  await expect(page.getByRole("button", { name: "Trực tiếp", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Mô phỏng pha" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Chạy mô phỏng" })).toBeEnabled();
});
test("Owner toolbar wraps at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await setup(page); await page.goto("/dashboard/machines");
  await expect(page.getByRole("button", { name: "Làm mới" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
