import { expect, test, type Page } from "@playwright/test";
async function expectPageAction(page: Page, id: string) { await expect(page.locator('[data-action-id="' + id + '"]')).toBeVisible(); }
async function expectNoPageAction(page: Page, id: string) { await expect(page.locator('[data-action-id="' + id + '"]')).toHaveCount(0); }
async function expectNoPageActionLabel(page: Page, label: string) { await expect(page.locator('footer[aria-label^="Thao t?c"]').getByRole("button", { name: label, exact: true })).toHaveCount(0); }
async function clickPageAction(page: Page, id: string) { await page.locator('[data-action-id="' + id + '"]').click(); }
async function expectInlineActions(page: Page, ids: string[]) {
  for (const id of ids) await expectPageAction(page, id);
}

const requestId = "f3000000-0000-4000-8000-000000000001";
const ticketId = "f3000000-0000-4000-8000-000000000002";
const ownerId = "f3000000-0000-4000-8000-000000000003";
const contractId = "f3000000-0000-4000-8000-000000000004";
const machineId = "f3000000-0000-4000-8000-000000000005";
const replacementMachineId = "f3000000-0000-4000-8000-000000000006";
const assignmentId = "f3000000-0000-4000-8000-000000000007";
const repairCaseId = "f3000000-0000-4000-8000-000000000008";
const custodyEventId = "f3000000-0000-4000-8000-000000000009";

type MockOptions = {
  status?: "OVERDUE_REVIEW" | "CONFIRMED" | "IN_PROGRESS";
  replacementLinked?: boolean;
  events?: Array<Record<string, unknown>>;
};

type MutableMockRequest = Omit<ReturnType<typeof maintenanceRequest>, "status" | "replacementAssignmentId" | "overdueReviewedAt"> & {
  status: string;
  replacementAssignmentId: string | null;
  overdueReviewedAt?: string | null;
  overdueReviewReason?: string;
  closureExceptionReason?: string;
};

function tokenFor(role = "admin") {
  const claims = Buffer.from(JSON.stringify({ roles: [role] })).toString("base64url");
  return `header.${claims}.signature`;
}

function maintenanceRequest(options: MockOptions) {
  return {
    id: requestId,
    requestType: "PREVENTIVE",
    ownerId,
    contractId,
    machineId,
    issueDescription: "Bảo trì định kỳ",
    windowStart: "2026-11-06",
    windowEnd: "2026-11-08",
    confirmedAppointmentAt: "2026-11-06T10:00:00",
    status: options.status ?? "CONFIRMED",
    maintenanceTicketId: ticketId,
    replacementAssignmentId: options.replacementLinked ? assignmentId : null,
    overdueReviewedAt: options.status === "OVERDUE_REVIEW" ? null : undefined,
    createdAt: "2026-11-01T09:00:00",
    updatedAt: "2026-11-01T09:00:00",
  };
}

function activeAssignment() {
  return {
    id: assignmentId,
    ownerId,
    contractId,
    primaryMachineId: machineId,
    replacementMachineId,
    status: "ACTIVE",
    startAt: "2026-11-06T00:00:00Z",
    endAt: "2026-11-08T00:00:00Z",
  };
}

function event(eventType: string, index = 1, extras: Record<string, unknown> = {}) {
  return {
    id: index === 1 ? custodyEventId : `f3000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    maintenanceRequestId: requestId,
    repairCaseId,
    eventType,
    machineId: eventType === "PRIMARY_COLLECTED" || eventType === "PRIMARY_RETURNED" ? machineId : replacementMachineId,
    actorId: ownerId,
    actorRole: "ADMIN",
    occurredAt: "2026-11-06T03:00:00",
    conditionNotes: "Đã kiểm tra tình trạng máy.",
    evidenceReference: `private/custody/${index}`,
    ...extras,
  };
}

async function installMockApi(page: Page, options: MockOptions = {}) {
  const state: {
    request: MutableMockRequest;
    ticket: Record<string, unknown>;
    events: Array<Record<string, unknown>>;
    assignment: ReturnType<typeof activeAssignment> & { maintenanceRequestId?: string };
  } = {
    request: maintenanceRequest(options) as MutableMockRequest,
    ticket: {
      id: ticketId,
      machineId,
      ownerId,
      contractId,
      maintenanceRequestId: requestId,
      status: options.status === "OVERDUE_REVIEW" ? "PENDING" : "ASSIGNED",
      assignedTo: "Kỹ thuật viên E2E",
      assignedTechnicianId: "f3000000-0000-4000-8000-000000000010",
      alertLevel: "Warning",
      version: 1,
      overdueReviewRequired: false,
    },
    events: options.events ?? [],
    assignment: activeAssignment(),
  };
  const mutations: Array<{ method: string; url: string; body: unknown }> = [];

  await page.route("**/api/dolores/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api\/dolores\/v1/, "");
    const method = request.method();
    const multipart = request.headers()["content-type"]?.includes("multipart/form-data");
    const raw = multipart ? request.postDataBuffer()?.toString("utf8") : undefined;
    if (multipart) {
      expect(raw).toContain('name="data"');
      expect(raw).toContain('name="files"');
    }
    const body = multipart ? JSON.parse(raw?.match(/name="data"[^\r]*\r\n(?:[^\r\n]+\r\n)*\r\n([^\r\n]+)/)?.[1] ?? "null") : request.postData() ? request.postDataJSON() : undefined;
    if (["POST", "PATCH", "PUT"].includes(method)) mutations.push({ method, url: `${path}${url.search}`, body });

    let status = 200;
    let response: unknown = [];
    if (method === "GET" && path === `/maintenance-requests/${requestId}`) {
      response = state.request;
    } else if (method === "GET" && path === `/maintenance-tickets/${ticketId}`) {
      response = state.ticket;
    } else if (method === "GET" && path === `/maintenance-requests/${requestId}/custody-events`) {
      response = state.events;
    } else if (method === "GET" && path === `/replacement-assignments/${assignmentId}`) {
      response = state.assignment;
    } else if (method === "GET" && path === `/machines/${machineId}`) {
      response = { id: machineId, ownerId, serialNumber: "E2E-PRIMARY", machineType: "CONVENTIONAL", status: "DEPLOYED_CONTRACT_OWNER" };
    } else if (method === "GET" && path === `/machines/${replacementMachineId}`) {
      response = { id: replacementMachineId, ownerId, serialNumber: "E2E-REPLACEMENT", machineType: "CONVENTIONAL", status: "DEPLOYED_CONTRACT_OWNER" };
    } else if (method === "POST" && path === `/maintenance-requests/${requestId}/overdue-review`) {
      state.request = { ...state.request, overdueReviewedAt: "2026-11-06T03:00:00", overdueReviewReason: (body as { reason: string }).reason };
      response = state.request;
    } else if (method === "PUT" && path === `/maintenance-requests/${requestId}/replacement-assignment/${assignmentId}`) {
      state.request = { ...state.request, replacementAssignmentId: assignmentId };
      state.assignment = { ...state.assignment, maintenanceRequestId: requestId };
      response = state.request;
    } else if (method === "POST" && path === `/maintenance-requests/${requestId}/custody-events`) {
      const custodyInput = body as Record<string, unknown>;
      const created = event(String(custodyInput.eventType), 1, {
        machineId: custodyInput.machineId,
        conditionNotes: custodyInput.conditionNotes,
        acknowledgementUnavailableReason: custodyInput.acknowledgementUnavailableReason,
      });
      state.events = [...state.events, created];
      state.request = { ...state.request, status: "IN_PROGRESS" };
      state.ticket = { ...state.ticket, status: "IN_PROGRESS" };
      response = created;
      status = 201;
    } else if (method === "POST" && path === `/maintenance-requests/${requestId}/closure-exception`) {
      state.request = { ...state.request, status: "CLOSED", closureExceptionReason: (body as { reason: string }).reason };
      response = state.request;
    }

    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(response) });
  });

  return { state, mutations };
}

async function openRequest(page: Page) {
  await page.context().addCookies([{
    name: "access_token",
    value: tokenFor(),
    domain: "127.0.0.1",
    path: "/",
  }]);
  await page.goto(`/admin/technical-requests/requests/${requestId}`);
  await expect(page.getByRole("heading", { name: "Chi tiết yêu cầu kỹ thuật" })).toBeVisible();
  await page.getByRole("button", { name: "Phiếu bảo trì liên quan", exact: true }).click();
}

test.describe("maintenance request actions", () => {
  test.setTimeout(120_000);

  test("records an overdue review with its required reason", async ({ page }) => {
    const api = await installMockApi(page, { status: "OVERDUE_REVIEW" });
    await openRequest(page);
    await expectInlineActions(page, ["maintenance-ticket-edit", "maintenance-request-overdue-review"]);
    await expectPageAction(page, "maintenance-request-overdue-review");
    await expectNoPageAction(page, "maintenance-request-close-exception");

    await clickPageAction(page, "maintenance-request-overdue-review");
    await page.locator("#reason-dialog-input").fill("Đã thống nhất lịch bảo trì mới với Owner.");
    await page.getByRole("button", { name: "Xác nhận" }).click();
    await expectNoPageAction(page, "maintenance-request-overdue-review");
    expect(api.mutations.find((item) => item.url === `/maintenance-requests/${requestId}/overdue-review`)).toEqual({
      method: "POST",
      url: `/maintenance-requests/${requestId}/overdue-review`,
      body: { reason: "Đã thống nhất lịch bảo trì mới với Owner." },
    });
  });

  test("verifies and links an ACTIVE replacement assignment for the same contract and machine type", async ({ page }) => {
    const api = await installMockApi(page, { status: "CONFIRMED" });
    await openRequest(page);
    await page.getByLabel("Mã phân công máy thay thế").fill(assignmentId);
    await page.getByRole("button", { name: "Kiểm tra phân công" }).click();
    await expectInlineActions(page, ["maintenance-ticket-unassign", "maintenance-request-link-replacement", "maintenance-ticket-edit"]);
    await expectPageAction(page, "maintenance-request-link-replacement");
    await clickPageAction(page, "maintenance-request-link-replacement");
    await page.getByRole("button", { name: "Xác nhận liên kết" }).click();
    await page.getByText("Mã liên kết", { exact: true }).click();
    await expect(page.getByText(assignmentId)).toBeVisible();

    expect(api.mutations.find((item) => item.url === `/maintenance-requests/${requestId}/replacement-assignment/${assignmentId}`)).toEqual({
      method: "PUT",
      url: `/maintenance-requests/${requestId}/replacement-assignment/${assignmentId}`,
      body: undefined,
    });
  });

  test("records only the next valid custody step and automatically uses its machine ID", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-11-07T12:00:00Z"));
    const api = await installMockApi(page, { status: "CONFIRMED", replacementLinked: true });
    await openRequest(page);
    await expect(page.getByRole("heading", { name: "Bước tiếp theo: Nhận máy chính" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bước tiếp theo: Bàn giao máy thay thế" })).toHaveCount(0);
    await expectNoPageActionLabel(page, "Ghi nhận bước bàn giao");
    await expect(page.getByText("Máy được ghi nhận:").locator(".." )).toContainText(machineId.slice(0, 8));

    await page.getByLabel("Tình trạng máy").fill("Vỏ máy và phụ kiện đầy đủ.");
    await page.getByLabel("Tệp chứng từ").setInputFiles({ name: "custody.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-test-file") });
    await expect(page.getByText("custody.pdf")).toBeVisible();
    await page.getByLabel("Lý do chưa thể lấy xác nhận của Owner (nếu có)").fill("Owner xác nhận sau qua ứng dụng.");
    await page.getByRole("button", { name: "Ghi nhận bước bàn giao" }).click();

    await expect(page.getByRole("heading", { name: "Bước tiếp theo: Bàn giao máy thay thế" })).toBeVisible();
    await expect(page.getByText("Máy được ghi nhận:").locator(".." )).toContainText(replacementMachineId.slice(0, 8));
    expect(api.mutations.find((item) => item.url === `/maintenance-requests/${requestId}/custody-events`)).toEqual({
      method: "POST",
      url: `/maintenance-requests/${requestId}/custody-events`,
      body: {
        eventType: "PRIMARY_COLLECTED",
        machineId,
        conditionNotes: "Vỏ máy và phụ kiện đầy đủ.",
        acknowledgementUnavailableReason: "Owner xác nhận sau qua ứng dụng.",
      },
    });
  });

  test("shows the audited closure exception only after the primary machine was returned", async ({ page }) => {
    const api = await installMockApi(page, { status: "IN_PROGRESS", replacementLinked: true });
    await openRequest(page);
    await expectNoPageAction(page, "maintenance-request-close-exception");

    api.state.events = [event("PRIMARY_RETURNED")];
    await page.reload();
    await expectInlineActions(page, ["maintenance-request-close-exception", "maintenance-ticket-unassign", "maintenance-ticket-edit"]);
    await expectPageAction(page, "maintenance-request-close-exception");
    await clickPageAction(page, "maintenance-request-close-exception");
    await expect(page.getByText("Thao tác này được lưu trong lịch sử kiểm toán.")).toBeVisible();
    await page.locator("#reason-dialog-input").fill("Đã xác nhận ngoại lệ với biên bản bàn giao.");
    await page.getByRole("alertdialog").getByRole("button", { name: "Đóng yêu cầu", exact: true }).click();
    await expectNoPageAction(page, "maintenance-request-close-exception");
    expect(api.mutations.find((item) => item.url === `/maintenance-requests/${requestId}/closure-exception`)).toEqual({
      method: "POST",
      url: `/maintenance-requests/${requestId}/closure-exception`,
      body: { reason: "Đã xác nhận ngoại lệ với biên bản bàn giao." },
    });
  });
});

for (const role of ["admin", "moderator"]) {
  test(role + " technical list requests ten rows and opens the correct profile without page overflow", async ({ page }) => {
    await installMockApi(page, {});
    await page.context().addCookies([{ name: "access_token", value: tokenFor(role), domain: "127.0.0.1", path: "/" }]);
    const pages: number[] = [];
    await page.route("**/api/dolores/v1/maintenance-requests?*", async route => {
      const url = new URL(route.request().url());
      expect(url.searchParams.get("size")).toBe("10");
      const pageNumber = Number(url.searchParams.get("page"));
      pages.push(pageNumber);
      const rows = Array.from({ length: pageNumber === 0 ? 10 : 1 }, (_, index) => ({
        ...maintenanceRequest({}),
        id: pageNumber === 0 && index === 0 ? requestId : "f3000000-0000-4000-8000-" + String(100 + pageNumber * 10 + index).padStart(12, "0"),
        ownerName: "Khách hàng kiểm thử",
      }));
      await route.fulfill({ status: 200, contentType: "application/json",
        headers: { "x-page": String(pageNumber), "x-page-size": "10", "x-has-next": String(pageNumber === 0) },
        body: JSON.stringify(rows) });
    });
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/" + role + "/technical-requests");
    await expect(page.getByRole("link", { name: "Mở hồ sơ", exact: true })).toHaveCount(10);
    const status = page.getByRole("cell", { name: "Đã xác nhận", exact: true }).first();
    await expect(status).toBeVisible();
    expect(await status.locator("span").evaluate(el => getComputedStyle(el, "::before").content)).toBe('""');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Tiếp", exact: true }).click();
    await expect(page.getByRole("link", { name: "Mở hồ sơ", exact: true })).toHaveCount(1);
    await page.getByRole("button", { name: "Trước", exact: true }).click();
    await expect(page.getByRole("link", { name: "Mở hồ sơ", exact: true })).toHaveCount(10);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("link", { name: "Mở hồ sơ", exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp("/requests/" + requestId + "$"));
    expect(pages).toContain(1);
  });
}

test("Admin cost review keeps financial gates and a compact summary on desktop and mobile", async ({ page }, testInfo) => {
  await installMockApi(page, {});
  await page.context().addCookies([{ name: "access_token", value: tokenFor(), domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/dolores/v1/repair-cost-reviews/" + repairCaseId, route => route.fulfill({ status: 200, json: {
    id: repairCaseId, maintenanceTicketId: ticketId, machineId, ownerId,
    cause: "NORMAL_WEAR", diagnosis: "Thay gioăng cụm pha.", estimatedAmount: 250000, currency: "VND",
    proposedResponsibleParty: "COMPANY", status: "PROPOSED", createdAt: "2026-11-01T09:00:00",
    decisions: [], approvedComponents: [], costComponents: [{ id: assignmentId, category: "PARTS", description: "Gioăng cụm pha", quantity: 1, unitPrice: 250000, amount: 250000 }],
  } }));
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/admin/technical-requests/cost-reviews/" + repairCaseId);
  await expect(page.getByRole("heading", { name: "Tóm tắt chi phí" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ghi quyết định" })).toBeDisabled();
  await expect(page.getByText("Chờ xem xét", { exact: true })).toBeVisible();
  await expect(page.getByText("Hao mòn thông thường", { exact: true })).toBeVisible();
  await expect(page.getByText(repairCaseId, { exact: true })).toBeHidden();
  expect(await page.locator("table").evaluate(table => table.scrollWidth <= table.parentElement!.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("cost-review-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByText("Thông tin đối chiếu", { exact: true }).click();
  await expect(page.getByText(repairCaseId, { exact: true })).toBeVisible();
});

test("Admin request balances its overview and shows a single integrated ticket and evidence area", async ({ page }, testInfo) => {
  await installMockApi(page, { status: "CONFIRMED" });
  await page.setViewportSize({ width: 1366, height: 768 });
  await openRequest(page);
  const overview = page.getByRole("heading", { name: "Thông tin yêu cầu", exact: true }).locator("..");
  const state = page.getByRole("heading", { name: "Tình trạng xử lý", exact: true }).locator("..");
  const left = await overview.boundingBox(), right = await state.boundingBox();
  expect(Math.abs(left!.height - right!.height)).toBeLessThan(2);
  await expect(page.getByRole("heading", { name: "Thông tin phiếu bảo trì", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Phiếu bảo trì", exact: true })).toHaveCount(0);
  const panel = page.getByRole("region", { name: "Nội dung liên quan", exact: true });
  await panel.getByRole("button", { name: "Chứng từ yêu cầu", exact: true }).click();
  await expect(panel.getByRole("heading", { name: "Chứng từ yêu cầu", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Thông tin phiếu bảo trì", exact: true })).toBeHidden();
  await panel.getByRole("button", { name: "Phiếu bảo trì liên quan", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Thông tin phiếu bảo trì", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("technical-request-updated.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const role of ["admin", "moderator"]) {
  test(role + " closed repair case preserves the shared compact layout and expandable history", async ({ page }, testInfo) => {
    await installMockApi(page, {});
    await page.context().addCookies([{ name: "access_token", value: tokenFor(role), domain: "127.0.0.1", path: "/" }]);
    await page.route("**/api/dolores/v1/repair-cases/" + repairCaseId, route => route.fulfill({ status: 200, json: {
      id: repairCaseId, maintenanceRequestId: requestId, ownerId, contractId, primaryMachineId: machineId, status: "CLOSED",
      timeline: [], createdAt: "2026-11-01T09:00:00", updatedAt: "2026-11-07T09:00:00", closedAt: "2026-11-07T09:00:00",
    } }));
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/" + role + "/technical-requests/cases/" + repairCaseId);
    await expect(page.getByRole("heading", { name: "Hồ sơ sửa chữa", exact: true })).toBeVisible();
    const steps = page.getByRole("list", { name: "Quy trình xử lý", exact: true });
    await expect(steps).toBeHidden();
    await page.locator("summary").filter({ hasText: /^Quy trình xử lý$/ }).click();
    await expect(steps).toBeVisible();
    await page.locator("summary").filter({ hasText: /^Quy trình xử lý$/ }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("repair-case-updated.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
