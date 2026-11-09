import { expect, test, type Page } from "@playwright/test";
import { clickPageAction, expectNoPageAction, expectNoPageActionLabel, expectPageAction, expectPageActionOrder } from "./page-actions-test-helpers";

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
    const body = request.postData() ? request.postDataJSON() : undefined;
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
        evidenceReference: custodyInput.evidenceReference,
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
  await expect(page.getByRole("heading", { name: "Chi tiết yêu cầu bảo trì" })).toBeVisible();
}

test.describe("maintenance request actions", () => {
  test.setTimeout(120_000);

  test("records an overdue review with its required reason", async ({ page }) => {
    const api = await installMockApi(page, { status: "OVERDUE_REVIEW" });
    await openRequest(page);
    await expectPageActionOrder(page, ["maintenance-ticket-edit", "maintenance-request-overdue-review"]);
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
    await expectPageActionOrder(page, ["maintenance-ticket-unassign", "maintenance-request-link-replacement", "maintenance-ticket-edit"]);
    await expectPageAction(page, "maintenance-request-link-replacement");
    await clickPageAction(page, "maintenance-request-link-replacement");
    await page.getByRole("button", { name: "Xác nhận liên kết" }).click();
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
    await page.getByLabel("Mã tham chiếu chứng từ").fill("private/custody/primary-collection");
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
        evidenceReference: "private/custody/primary-collection",
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
    await expectPageActionOrder(page, ["maintenance-request-close-exception", "maintenance-ticket-unassign", "maintenance-ticket-edit"]);
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
