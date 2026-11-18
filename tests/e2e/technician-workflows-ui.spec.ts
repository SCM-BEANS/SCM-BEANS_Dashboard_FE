import { test, expect } from "@playwright/test";
const id = "f4000000-0000-4000-8000-000000000001";
test.beforeEach(async ({ page }) => {
  await page.context().addCookies([{ name: "access_token", value: `header.${Buffer.from(JSON.stringify({ roles: ["technician"], sub: id })).toString("base64url")}.signature`, url: test.info().project.use.baseURL as string }]);
  await page.setViewportSize({ width: 1600, height: 900 });
});
test("recall uses a compact list and a separate progress detail with collapsed history", async ({ page }) => {
  const order = { id, terminationCaseId: id, ownerId: id, contractId: id, machineId: id, machineSerialNumber: "DOLORES-001", ownerName: "Khách hàng", assignedTechnicianId: id, status: "RECEIVED_AT_DEPOT", createdAt: "2026-11-01", updatedAt: "2026-11-01" };
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    const events = Array.from({ length: 7 }, (_, index) => ({ id: `f4000000-0000-4000-8000-${String(index + 2).padStart(12, "0")}`, recallWorkOrderId: id, eventType: "CREATED", occurredAt: "2026-11-01T00:00:00Z", reason: "Ghi chú thu hồi" }));
    return route.fulfill({ json: path.endsWith("/recall-work-orders") ? { content: [order], page: 0, size: 10, totalElements: 1, totalPages: 1, first: true, last: true } : path.endsWith(`/recall-work-orders/${id}`) ? order : path.endsWith("/events") ? { content: events, page: 0, size: 50, totalElements: 7, totalPages: 1, first: true, last: true } : [] });
  });
  await page.goto("/technician/tasks/retrieval");
  await expect(page.getByRole("banner")).toHaveCSS("border-bottom-width", "0px");
  await expect(page.getByRole("region", { name: "Danh sách lệnh thu hồi" })).toHaveCSS("padding-left", "20px");
  await expect(page.getByRole("table")).toHaveCount(1);
  await page.screenshot({ path: ".playwright-cli/technician-retrieval-list.png" });
  await page.getByRole("button", { name: "Mở chi tiết", exact: true }).click();
  await expect(page.getByRole("region", { name: "Tiến độ thu hồi", exact: true })).toBeVisible();
  await expect(page.locator("details").filter({ has: page.locator("summary", { hasText: "Lịch sử xử lý" }) })).not.toHaveAttribute("open");
  await page.getByText("Lịch sử xử lý", { exact: true }).click();
  const history = page.locator("details").filter({ has: page.locator("summary", { hasText: "Lịch sử xử lý" }) });
  await expect(history.getByRole("listitem")).toHaveCount(5);
  await page.getByRole("button", { name: "Xem thêm 2 sự kiện", exact: true }).click();
  await expect(history.getByRole("listitem")).toHaveCount(7);
  await page.getByText("Tạo lệnh thu hồi", { exact: true }).first().click();
  await expect(page.getByText("Ghi chú thu hồi", { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: ".playwright-cli/technician-retrieval-detail.png" });
});

test("machine history opens each request on a dedicated technician page", async ({ page }) => {
  const request = { id, machineId: id, requestType: "REPAIR", status: "TRIAGED", issueDescription: "Máy cần kiểm tra", maintenanceTicketId: id };
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: path.endsWith(`/maintenance-requests/${id}`) ? request : path.endsWith("/maintenance-requests") ? [request] : [] });
  });
  await page.goto("/technician/history");
  await page.getByRole("link", { name: "Mở yêu cầu", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/technician/history/requests/${id}$`));
  await expect(page.getByRole("heading", { name: "Chi tiết yêu cầu kỹ thuật", exact: true })).toBeVisible();
  await expect(page.getByText("Máy cần kiểm tra", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Xem phiếu bảo trì", exact: true })).toHaveAttribute("href", `/technician/tasks/maintenance-tickets/${id}`);
});
test("closed repair case uses the compact workspace and related documents route", async ({ page }) => {
  const forbidden: string[] = [];
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.includes("/replacement-assignments/")) forbidden.push(path);
    const item = { id, maintenanceRequestId: id, maintenanceTicketId: id, ownerId: id, contractId: id, primaryMachineId: id, status: "CLOSED", createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-02T00:00:00Z", closedAt: "2026-11-02T00:00:00Z", timeline: [] };
    return route.fulfill({ json: path.endsWith(`/repair-cases/${id}`) ? item : path.endsWith(`/maintenance-tickets/${id}`) ? { id, machineId: id, status: "RESOLVED", assignedTechnicianId: id } : path.endsWith("/timeline") ? { content: [], number: 0, size: 50, totalElements: 0, totalPages: 0, first: true, last: true } : path.endsWith("/custody-events") ? { items: [], page: 0, size: 50, hasNext: false } : [] });
  });
  await page.goto(`/technician/tasks/repair-cases/${id}`);
  await expect(page.getByRole("heading", { name: "Tiến độ xử lý", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chứng từ hồ sơ sửa chữa", exact: true })).toHaveCount(0);
  const process = page.getByRole("region", { name: "Quy trình xử lý", exact: true });
  await expect(process.getByRole("listitem")).toHaveCount(13);
  await expect(process.locator("details").first()).toHaveAttribute("open");
  await expect(process.locator("details details[open]")).toHaveCount(0);
  await process.screenshot({ path: ".playwright-cli/technician-repair-process-updated.png" });
  await page.getByRole("button", { name: "Bàn giao máy", exact: true }).click();
  await expect(page.getByRole("button", { name: "Bàn giao máy", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Sự kiện", exact: true }).click();
  await page.screenshot({ path: ".playwright-cli/technician-repair-case.png" });
  await page.getByRole("link", { name: "Công việc liên quan & chứng từ", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/repair-cases/${id}/related$`));
  await expect(page.getByRole("heading", { name: "Công việc liên quan & chứng từ", exact: true })).toBeVisible();
  expect(forbidden).toHaveLength(0);
});
test("machine profile hides forbidden sections and stops forbidden heartbeat polling", async ({ page }) => {
  let heartbeatReads = 0;
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith(`/machines/${id}`)) return route.fulfill({ json: { id, serialNumber: "DOLORES-001", status: "DEPLOYED_CONTRACT_OWNER", machineType: "SMART_IOT" } });
    if (path.endsWith("/heartbeats/latest")) heartbeatReads++;
    if (/telemetry|certificate|active-menu|available-menus/.test(path)) return route.fulfill({ status: 403, json: { message: "Forbidden" } });
    return route.fulfill({ json: [] });
  });
  await page.goto(`/technician/machine-check/${id}`);
  await expect(page.getByRole("heading", { name: /Chi tiết máy/ })).toBeVisible();
  await expect.poll(() => heartbeatReads).toBe(1);
  await expect(page.getByRole("heading", { name: "Định danh thiết bị", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Chứng chỉ kết nối", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Kết nối & sức khỏe máy", exact: true })).toHaveCount(0);
  await page.screenshot({ path: ".playwright-cli/technician-machine-permissions.png" });
  await page.waitForTimeout(5500); // Verify that the former five-second polling loop stays stopped after a 403.
  expect(heartbeatReads).toBe(1);
});
