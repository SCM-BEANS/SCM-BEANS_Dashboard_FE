import { expect, test, type Page } from "@playwright/test";

const id = "f1000000-0000-4000-8000-000000000004";
const secondId = "f1000000-0000-4000-8000-000000000005";
const ownerId = "f1000000-0000-4000-8000-000000000001";
const machine = { id, ownerId, serialNumber: "E2E-IOT-01", machineType: "SMART_IOT", status: "DEPLOYED_CONTRACT_OWNER" };
const stable = { status: "STABLE", score: 95, condition: "Boiler is holding temperature", evidence: "Mean droop 1.4°C" };
const health = {
  machineId: id, serialNumber: machine.serialNumber, connectionStatus: "ONLINE", overallStatus: "MONITOR",
  evaluatedAt: "2026-11-18T09:00:00Z",
  dataQuality: { evaluatedCycles14d: 12, recentIncidents7d: 0, stuckSensorDetected: false, sufficientHistory: true },
  subsystems: {
    thermal: stable,
    hydraulics: { status: "MONITOR", score: 72, condition: "Water inlet flow is weak", evidence: "Inlet flow 2.00 mL/s" },
    kinematics: { ...stable, condition: "Movement is normal" },
    milk: { ...stable, status: "DISABLED", condition: "Milk module is disabled", evidence: null },
  },
  brewStability: [{ recipeName: "Double Espresso", brewCount: 8, meanYieldMl: 59.2, yieldCvPct: 2.4, meanDurationSec: 28.6, durationCvPct: 3.1, stabilityStatus: "STABLE" }],
  cleaningHygiene: { lastCleanedAt: "2026-11-17T06:00:00Z", cupsSinceLastClean: 14, overdue: false },
  recommendations: ["Hydraulics: Water inlet flow is weak"],
  processStabilityDisclaimer: "Sensory taste requires manual tasting.",
};
const priority = {
  machineId: id, serialNumber: machine.serialNumber, location: "Hồ Chí Minh", priorityScore: 62,
  overallStatus: "INSPECT", connectionStatus: "ONLINE", activeAlerts: 1, cupsLast14d: 48,
  cleaningOverdue: false, primaryReason: "Open alert", recommendedFirstCheck: "Check water inlet flow",
};

async function mockMonitoring(page: Page, role: string, assessment: object = health) {
  const token = Buffer.from(JSON.stringify({ roles: [role], sub: ownerId })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${token}.signature`, url: test.info().project.use.baseURL as string }]);
  const requests: string[] = [];
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    requests.push(path);
    if (path.endsWith("/machines/priority-queue")) {
      return route.fulfill({ json: [priority, { ...priority, machineId: secondId, serialNumber: "E2E-IOT-02", priorityScore: 20 }] });
    }
    if (path.endsWith(`/machines/${id}/health`)) return route.fulfill({ json: assessment });
    if (path.endsWith(`/machines/${id}/points`)) {
      const end = Date.parse(url.searchParams.get("to")!);
      const timestamp = new Date(end - 7_200_000).toISOString();
      return route.fulfill({ json: [
        { timestamp, field: "boiler_c", value: 90, machineId: id },
        { timestamp, field: "boiler_sp_c", value: 95, machineId: id },
      ] });
    }
    if (path.endsWith(`/machines/${id}`)) return route.fulfill({ json: machine });
    if (path.endsWith("/machines")) return route.fulfill({ json: [machine] });
    return route.fulfill({ json: path.endsWith("/unread-count") ? { unreadCount: 0 } : [] });
  });
  return requests;
}

for (const role of ["admin", "moderator"]) {
  test(`${role} follows ranked priority into health without loading detailed telemetry in advance`, async ({ page }) => {
    const requests = await mockMonitoring(page, role);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${role}/iot`);
    await page.getByRole("button", { name: "Ưu tiên bảo trì", exact: true }).click();
    const queue = page.getByRole("region", { name: "Ưu tiên bảo trì", exact: true });
    await expect(queue.getByRole("link", { name: "E2E-IOT-01" })).toBeVisible();
    await expect(queue.getByRole("link").first()).toHaveText("E2E-IOT-01");
    await expect(queue.getByText("Check water inlet flow").first()).toBeInViewport();
    expect(await queue.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(requests.some(path => path.endsWith("/health"))).toBe(false);

    await queue.getByRole("link", { name: "E2E-IOT-01" }).click();
    await expect(page.getByRole("tab", { name: "Sức khỏe máy" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Water inlet flow is weak", { exact: true })).toBeVisible();
    await expect(page.getByText("Inlet flow 2.00 mL/s", { exact: false })).toBeHidden();
    await page.locator("summary").filter({ hasText: "Hệ thống nước" }).click();
    await expect(page.getByText("Inlet flow 2.00 mL/s", { exact: false })).toBeVisible();
    expect(requests.some(path => path.endsWith("/points"))).toBe(false);

    await page.locator("summary").filter({ hasText: "Gia nhiệt" }).click();
    const chart = page.getByRole("figure", { name: "Biểu đồ nhiệt độ nồi hơi" });
    await expect(chart.getByText("Mục tiêu đã ghi nhận", { exact: true })).toBeVisible();
    expect(requests.some(path => path.endsWith("/points"))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await page.getByRole("link", { name: /Về danh sách ưu tiên/ }).press("Enter");
    await expect(queue.getByRole("link").first()).toHaveText("E2E-IOT-01");
  });
}

test("owner sees neutral insufficient-data and separate offline badges on their own machine", async ({ page }) => {
  const requests = await mockMonitoring(page, "owner", {
    ...health,
    connectionStatus: "OFFLINE",
    overallStatus: "INSUFFICIENT_DATA",
    dataQuality: { ...health.dataQuality, evaluatedCycles14d: 0, sufficientHistory: false },
    brewStability: [],
  });
  await page.goto(`/dashboard/machines/${id}/operations?tab=health`);
  const overview = page.getByRole("region", { name: "Đánh giá gần nhất" });
  await expect(overview.getByText("Chưa đủ dữ liệu", { exact: true })).toHaveAttribute("data-status", "INSUFFICIENT_DATA");
  await expect(overview.getByText("Mất kết nối", { exact: true })).toBeVisible();
  await expect(page.getByText("Chưa đủ dữ liệu theo công thức.")).toBeVisible();
  expect(requests.some(path => path.endsWith("/priority-queue"))).toBe(false);
  expect(requests.some(path => path.endsWith("/points"))).toBe(false);
});
