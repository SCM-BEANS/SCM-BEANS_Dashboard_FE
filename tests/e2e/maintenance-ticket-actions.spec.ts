import { expect, test, type Page } from "@playwright/test";
import { clickPageAction, expectNoPageAction, expectNonPrimaryPageAction, expectPageAction, expectPageActionOrder, expectPrimaryPageAction, pageActionBar } from "./page-actions-test-helpers";

const machineId = "f2000000-0000-4000-8000-000000000001";
const ownerId = "f2000000-0000-4000-8000-000000000002";
const contractId = "f2000000-0000-4000-8000-000000000003";
const technicianId = "f2000000-0000-4000-8000-000000000004";
const assignedTicketId = "f2000000-0000-4000-8000-000000000005";
const pendingTicketId = "f2100000-0000-4000-8000-000000000006";
const createdTicketId = "f2200000-0000-4000-8000-000000000007";
const technicianTicketId = "f2300000-0000-4000-8000-000000000008";

type RoleCase = { label: string; claim: string; machinePath: string; subject?: string };
type MockTicket = {
  id: string;
  machineId: string;
  ownerId: string;
  contractId: string;
  status: "ASSIGNED" | "PENDING";
  alertLevel: string;
  scheduledDueAt: string;
  actionableInstructions: string;
  version: number;
  overdueReviewRequired: boolean;
  overdueReviewedAt: string | null;
  assignedTo: string | null;
  assignedTechnicianId: string | null;
};

const roleCases: RoleCase[] = [
  { label: "Admin", claim: "admin", machinePath: `/admin/machines/${machineId}` },
  { label: "Moderator", claim: "moderator", machinePath: `/moderator/machines/${machineId}` },
];

function tokenFor(role: string, subject?: string) {
  const claims = Buffer.from(JSON.stringify({ roles: [role], ...(subject ? { sub: subject } : {}) })).toString("base64url");
  return `header.${claims}.signature`;
}

function ticket(id: string, status: "ASSIGNED" | "PENDING", overdueReviewRequired: boolean): MockTicket {
  return {
    id,
    machineId,
    ownerId,
    contractId,
    status,
    alertLevel: "Warning",
    scheduledDueAt: "2026-11-07T10:00:00",
    actionableInstructions: "Kiểm tra bơm nước.",
    version: status === "ASSIGNED" ? 1 : 0,
    overdueReviewRequired,
    overdueReviewedAt: null,
    assignedTo: status === "ASSIGNED" ? "Kỹ thuật viên E2E" : null,
    assignedTechnicianId: status === "ASSIGNED" ? technicianId : null,
  };
}

async function installMockApi(page: Page) {
  const calls: Array<{ method: string; url: string; body: unknown }> = [];
  const tickets = new Map<string, MockTicket>([
    [assignedTicketId, ticket(assignedTicketId, "ASSIGNED", true)],
    [pendingTicketId, ticket(pendingTicketId, "PENDING", false)],
  ]);
  let createCount = 0;
  let conflictOnNextPatch = false;

  await page.route("**/api/dolores/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api\/dolores\/v1/, "");
    const method = request.method();
    const body = request.postData() ? request.postDataJSON() : undefined;
    if (["POST", "PATCH", "PUT"].includes(method)) calls.push({ method, url: `${path}${url.search}`, body });

    let status = 200;
    let response: unknown = [];
    if (method === "GET" && path === `/machines/${machineId}`) {
      response = { id: machineId, ownerId, serialNumber: "E2E-MAINT-01", status: "DEPLOYED_CONTRACT_OWNER", machineType: "CONVENTIONAL" };
    } else if (method === "GET" && path === `/machines/${machineId}/maintenance-schedule`) {
      response = { nextPreventiveMaintenanceAt: null, cupsServedSinceLastDescale: 0 };
    } else if (method === "GET" && path === "/maintenance-tickets") {
      response = [...tickets.values()];
    } else if (method === "GET" && path.startsWith("/maintenance-tickets/")) {
      const id = path.split("/").at(-1) ?? "";
      response = tickets.get(id) ?? {};
    } else if (method === "POST" && path === `/machines/${machineId}/maintenance-tickets`) {
      createCount += 1;
      if (createCount === 1) {
        const created = { ...ticket(createdTicketId, "PENDING", false), alertLevel: (body as { alertLevel: string }).alertLevel };
        tickets.set(createdTicketId, created);
        response = created;
        status = 201;
      } else {
        status = 409;
        response = { message: "Contract scope conflict" };
      }
    } else if (method === "PATCH" && path === `/maintenance-tickets/${assignedTicketId}/details`) {
      if (conflictOnNextPatch) {
        conflictOnNextPatch = false;
        status = 409;
        response = { message: "version conflict" };
      } else {
        const current = tickets.get(assignedTicketId)!;
        const patch = body as Record<string, unknown>;
        const updated = { ...current, ...patch, version: current.version + 1 };
        tickets.set(assignedTicketId, updated);
        response = updated;
      }
    } else if (method === "POST" && path === `/maintenance-tickets/${assignedTicketId}/overdue-review`) {
      const updated: MockTicket = { ...tickets.get(assignedTicketId)!, overdueReviewedAt: "2026-11-06T03:00:00" };
      tickets.set(assignedTicketId, updated);
      response = updated;
    } else if (method === "POST" && path === `/maintenance-tickets/${assignedTicketId}/unassign`) {
      const updated: MockTicket = { ...tickets.get(assignedTicketId)!, status: "PENDING", assignedTo: null, assignedTechnicianId: null };
      tickets.set(assignedTicketId, updated);
      response = updated;
    }

    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(response) });
  });

  return {
    calls,
    tickets,
    setConflictOnNextPatch: () => { conflictOnNextPatch = true; },
  };
}

async function openMachine(page: Page, role: RoleCase) {
  await page.context().addCookies([{
    name: "access_token",
    value: tokenFor(role.claim, role.subject ?? ownerId),
    domain: "127.0.0.1",
    path: "/",
  }]);
  await page.goto(role.machinePath);
  await expect(page.locator("main h1")).toBeVisible();
}

async function installTechnicianMockApi(page: Page) {
  const calls: Array<{ method: string; url: string; body: unknown }> = [];
  let current = {
    id: technicianTicketId,
    machineId,
    ownerId,
    contractId,
    status: "ASSIGNED",
    alertLevel: "Warning",
    scheduledDueAt: "2026-11-07T10:00:00",
    assignedTechnicianId: technicianId,
    assignedTo: "Ká»¹ thuáº­t viĂªn E2E",
  };
  await page.route("**/api/dolores/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api\/dolores\/v1/, "");
    const method = request.method();
    const body = request.postData() ? request.postDataJSON() : undefined;
    if (method === "POST") calls.push({ method, url: `${path}${url.search}`, body });
    if (method === "GET" && path === `/maintenance-tickets/${technicianTicketId}`) {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(current) });
      return;
    }
    if (method === "POST" && path === `/maintenance-tickets/${technicianTicketId}/status`) {
      current = { ...current, status: url.searchParams.get("status") ?? current.status };
    }
    if (method === "POST" && path === `/maintenance-tickets/${technicianTicketId}/parts`) {
      current = { ...current, ...(body as Record<string, unknown>) };
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(current) });
  });
  return calls;
}

async function openTechnicianTicket(page: Page) {
  await page.context().addCookies([{
    name: "access_token",
    value: tokenFor("technician", technicianId),
    domain: "127.0.0.1",
    path: "/",
  }]);
  await page.goto(`/technician/tasks/maintenance-tickets/${technicianTicketId}`);
  await expect(page.locator("main h1")).toBeVisible();
}

test.describe("maintenance ticket actions shared across operator roles", () => {
  test.setTimeout(120_000);

  for (const role of roleCases) {
    test(`${role.label} creates an on-demand ticket and shows the active-contract conflict`, async ({ page }) => {
      const api = await installMockApi(page);
      await openMachine(page, role);

      await expectPrimaryPageAction(page, "maintenance-ticket-create");
      if (role.claim === "admin") await expectNonPrimaryPageAction(page, "machine-edit");
      await clickPageAction(page, "maintenance-ticket-create");
      await expect(page.getByRole("alertdialog")).toBeVisible();
      await expect(page.getByLabel("Mức cảnh báo")).toHaveValue("Warning");
      await page.getByRole("button", { name: "Tạo phiếu", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Chi tiết phiếu bảo trì" })).toBeVisible();
      await expect(page.getByRole("row").filter({ has: page.getByRole("cell", { name: createdTicketId, exact: true }) })).toBeVisible();
      await expect(page.getByRole("button", { name: "Xem chi tiết" }).last()).toBeVisible();

      await clickPageAction(page, "maintenance-ticket-create");
      await page.getByRole("button", { name: "Tạo phiếu", exact: true }).click();
      await expect(page.getByRole("alert").getByText("Máy chưa có đúng một hợp đồng đang hiệu lực nên chưa thể tạo phiếu bảo trì.")).toBeVisible();

      const createCalls = api.calls.filter((call) => call.method === "POST" && call.url === `/machines/${machineId}/maintenance-tickets`);
      expect(createCalls).toHaveLength(2);
      expect(createCalls[0]?.body).toEqual({ alertLevel: "Warning" });
    });

    test(`${role.label} edits ticket details, handles version conflicts, reviews overdue work, and unassigns only assigned tickets`, async ({ page }) => {
      const api = await installMockApi(page);
      await openMachine(page, role);

      await page.getByRole("button", { name: "Xem chi tiết" }).first().click();
      await expectPageAction(page, "maintenance-ticket-overdue-review");
      await expectPageAction(page, "maintenance-ticket-unassign");

      await clickPageAction(page, "maintenance-ticket-edit");
      await expectPrimaryPageAction(page, "maintenance-ticket-save");
      await expect(page.locator('input[type="datetime-local"]')).toHaveValue("2026-11-07T10:00");
      await page.locator('input[type="datetime-local"]').fill("2026-11-10T09:30");
      await page.getByLabel("Mức cảnh báo").selectOption("Critical");
      await clickPageAction(page, "maintenance-ticket-save");
      await expect(page.getByText("Đã cập nhật chi tiết phiếu bảo trì.")).toBeVisible();

      await clickPageAction(page, "maintenance-ticket-edit");
      await page.getByLabel("Hướng dẫn xử lý").fill("Giữ nguyên hướng dẫn mới.");
      api.setConflictOnNextPatch();
      await clickPageAction(page, "maintenance-ticket-save");
      await expect(page.getByText("Phiếu đã được cập nhật bởi người khác, hãy tải lại.")).toBeVisible();
      await expect(page.getByLabel("Hướng dẫn xử lý")).toBeVisible();

      await clickPageAction(page, "maintenance-ticket-cancel-edit");
      await page.getByRole("alertdialog").getByRole("button", { name: "Hủy chỉnh sửa", exact: true }).click();
      await clickPageAction(page, "maintenance-ticket-overdue-review");
      await page.locator("#reason-dialog-input").fill("Đã thống nhất lịch mới với Owner.");
      await page.getByRole("button", { name: "Xác nhận" }).click();
      await expectNoPageAction(page, "maintenance-ticket-overdue-review");

      await clickPageAction(page, "maintenance-ticket-unassign");
      await page.getByRole("alertdialog").getByRole("button", { name: "Hủy phân công", exact: true }).click();
      await expectNoPageAction(page, "maintenance-ticket-unassign");

      await page.getByRole("button", { name: "Xem chi tiết" }).last().click();
      await expectNoPageAction(page, "maintenance-ticket-overdue-review");
      await expectNoPageAction(page, "maintenance-ticket-unassign");

      const patchCalls = api.calls.filter((call) => call.method === "PATCH");
      expect(patchCalls).toHaveLength(2);
      expect(patchCalls[0]).toMatchObject({
        method: "PATCH",
        url: `/maintenance-tickets/${assignedTicketId}/details`,
        body: { expectedVersion: 1, scheduledDueAt: "2026-11-10T09:30:00", alertLevel: "Critical" },
      });
      expect(patchCalls[0]?.body).toEqual({ expectedVersion: 1, scheduledDueAt: "2026-11-10T09:30:00", alertLevel: "Critical" });
      expect(patchCalls[1]?.body).toMatchObject({ expectedVersion: 2, actionableInstructions: "Giữ nguyên hướng dẫn mới." });
      expect(api.calls.find((call) => call.url === `/maintenance-tickets/${assignedTicketId}/overdue-review`)).toMatchObject({
        method: "POST",
        body: { reason: "Đã thống nhất lịch mới với Owner." },
      });
      expect(api.calls.find((call) => call.url === `/maintenance-tickets/${assignedTicketId}/unassign`)).toMatchObject({
        method: "POST",
        body: undefined,
      });
    });
  }

  test("Owner sees machine transfer and maintenance ticket creation in the shared footer", async ({ page }) => {
    await installMockApi(page);
    await openMachine(page, { label: "Owner", claim: "owner", subject: ownerId, machinePath: `/dashboard/machines/${machineId}` });

    await expectPageAction(page, "machine-transfer-location");
    await expectPrimaryPageAction(page, "maintenance-ticket-create");
    await clickPageAction(page, "maintenance-ticket-create");
    await expect(page.getByRole("alertdialog")).toBeVisible();
  });

  test("Technician start and save actions are in the shared footer", async ({ page }) => {
    const calls = await installTechnicianMockApi(page);
    await openTechnicianTicket(page);

    await expectPageActionOrder(page, ["maintenance-ticket-start-work"]);
    await expect(page.getByRole("main").getByRole("button", { name: "Bắt đầu công việc", exact: true })).toHaveCount(0);
    await clickPageAction(page, "maintenance-ticket-start-work");
    await expect(page.getByRole("status").getByText("Đã bắt đầu thực hiện ticket.")).toBeVisible();

    await expectPageActionOrder(page, ["maintenance-ticket-save-parts"]);
    const saveParts = pageActionBar(page).locator('[data-action-id="maintenance-ticket-save-parts"]');
    await expect(saveParts).toBeDisabled();
    await page.getByLabel("Linh kiện đã thay").fill("Bơm nước");
    await clickPageAction(page, "maintenance-ticket-save-parts");
    await expect(page.getByRole("status").getByText("Đã ghi nhận linh kiện và chi phí vật tư.")).toBeVisible();

    expect(calls).toContainEqual({ method: "POST", url: `/maintenance-tickets/${technicianTicketId}/status?status=IN_PROGRESS`, body: undefined });
    expect(calls).toContainEqual({ method: "POST", url: `/maintenance-tickets/${technicianTicketId}/parts`, body: { partsReplaced: "Bơm nước" } });
  });
});

const evidenceId = "f2400000-0000-4000-8000-000000000009";
const uploaderId = "f2500000-0000-4000-8000-00000000000a";

async function mockTicketEvidence(page: Page, mode: "files" | "empty" | "forbidden") {
  await page.route("**/api/dolores/v1/maintenance-tickets/*/evidence**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/content")) {
      await route.fulfill({ status: 200, contentType: "application/pdf", headers: { "Content-Disposition": 'attachment; filename="bien-ban.pdf"' }, body: "PDF" });
      return;
    }
    if (mode === "forbidden") {
      await route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message: "Forbidden" }) });
      return;
    }
    const ticketId = url.pathname.split("/").at(-2) ?? assignedTicketId;
    const items = mode === "empty" ? [] : [{
      id: evidenceId, resourceType: "MAINTENANCE_TICKET", resourceId: ticketId, purpose: "MAINTENANCE_RESOLUTION",
      originalFilename: "bien-ban.pdf", contentType: "application/pdf", sizeBytes: 2048, sha256: "abc",
      uploadedBy: uploaderId, uploadedAt: "2026-11-08T03:00:00Z",
      downloadPath: `/api/v1/maintenance-tickets/${ticketId}/evidence/${evidenceId}/content`,
    }];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items, page: 0, size: 20, hasNext: false }) });
  });
}

test.describe("maintenance ticket evidence", () => {
  test("lists files and downloads one", async ({ page }) => {
    await installMockApi(page);
    await mockTicketEvidence(page, "files");
    await openMachine(page, roleCases[0]);
    await page.getByRole("button", { name: "Xem chi tiết" }).first().click();
    const section = page.getByRole("region", { name: "Chứng từ phiếu bảo trì" });
    await expect(section).toBeVisible();
    await expect(section.getByText("bien-ban.pdf")).toBeVisible();
    await expect(section.getByText("Kết quả bảo trì")).toBeVisible();
    await expect(section.getByText("2,0 KB")).toBeVisible();
    const request = page.waitForRequest((req) => req.url().includes(`/evidence/${evidenceId}/content`));
    const download = page.waitForEvent("download");
    await section.getByRole("button", { name: "Tải xuống bien-ban.pdf" }).click();
    await request;
    expect((await download).suggestedFilename()).toBe("bien-ban.pdf");
  });

  test("shows the empty state", async ({ page }) => {
    await installMockApi(page);
    await mockTicketEvidence(page, "empty");
    await openMachine(page, roleCases[0]);
    await page.getByRole("button", { name: "Xem chi tiết" }).first().click();
    const section = page.getByRole("region", { name: "Chứng từ phiếu bảo trì" });
    await expect(section.getByText("Chưa có chứng từ.")).toBeVisible();
  });

  test("is hidden on 403", async ({ page }) => {
    await installMockApi(page);
    await mockTicketEvidence(page, "forbidden");
    await openMachine(page, roleCases[0]);
    await page.getByRole("button", { name: "Xem chi tiết" }).first().click();
    await expect(page.getByRole("heading", { name: "Chi tiết phiếu bảo trì" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Chứng từ phiếu bảo trì" })).toHaveCount(0);
  });
});
