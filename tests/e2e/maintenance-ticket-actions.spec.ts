import { expect, test, type Page } from "@playwright/test";

const machineId = "f2000000-0000-4000-8000-000000000001";
const ownerId = "f2000000-0000-4000-8000-000000000002";
const contractId = "f2000000-0000-4000-8000-000000000003";
const technicianId = "f2000000-0000-4000-8000-000000000004";
const assignedTicketId = "f2000000-0000-4000-8000-000000000005";
const pendingTicketId = "f2100000-0000-4000-8000-000000000006";
const createdTicketId = "f2200000-0000-4000-8000-000000000007";

type RoleCase = { label: string; claim: string; machinePath: string };
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

function tokenFor(role: string) {
  const claims = Buffer.from(JSON.stringify({ roles: [role] })).toString("base64url");
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
    value: tokenFor(role.claim),
    domain: "127.0.0.1",
    path: "/",
  }]);
  await page.goto(role.machinePath);
  await expect(page.locator("main h1")).toBeVisible();
}

test.describe("maintenance ticket actions shared across operator roles", () => {
  test.setTimeout(120_000);

  for (const role of roleCases) {
    test(`${role.label} creates an on-demand ticket and shows the active-contract conflict`, async ({ page }) => {
      const api = await installMockApi(page);
      await openMachine(page, role);

      await page.getByRole("button", { name: "Tạo phiếu bảo trì" }).click();
      await expect(page.getByRole("alertdialog")).toBeVisible();
      await expect(page.getByLabel("Mức cảnh báo")).toHaveValue("Warning");
      await page.getByRole("button", { name: "Tạo phiếu", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Chi tiết phiếu bảo trì" })).toBeVisible();
      await expect(page.getByRole("row").filter({ has: page.getByRole("cell", { name: createdTicketId, exact: true }) })).toBeVisible();
      await expect(page.getByRole("button", { name: new RegExp(`Chi tiết phiếu ${createdTicketId.slice(0, 8)}`) })).toBeVisible();

      await page.getByRole("button", { name: "Tạo phiếu bảo trì" }).click();
      await page.getByRole("button", { name: "Tạo phiếu", exact: true }).click();
      await expect(page.getByRole("alert").getByText("Máy chưa có đúng một hợp đồng đang hiệu lực nên chưa thể tạo phiếu bảo trì.")).toBeVisible();

      const createCalls = api.calls.filter((call) => call.method === "POST" && call.url === `/machines/${machineId}/maintenance-tickets`);
      expect(createCalls).toHaveLength(2);
      expect(createCalls[0]?.body).toEqual({ alertLevel: "Warning" });
    });

    test(`${role.label} edits ticket details, handles version conflicts, reviews overdue work, and unassigns only assigned tickets`, async ({ page }) => {
      const api = await installMockApi(page);
      await openMachine(page, role);

      await page.getByRole("button", { name: new RegExp(`Chi tiết phiếu ${assignedTicketId.slice(0, 8)}`) }).click();
      await expect(page.getByRole("button", { name: "Đánh giá quá hạn" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Hủy phân công" })).toBeVisible();

      await page.getByRole("button", { name: "Chỉnh sửa chi tiết" }).click();
      await expect(page.locator('input[type="datetime-local"]')).toHaveValue("2026-11-07T10:00");
      await page.locator('input[type="datetime-local"]').fill("2026-11-10T09:30");
      await page.getByLabel("Mức cảnh báo").selectOption("Critical");
      await page.getByRole("button", { name: "Lưu thay đổi" }).click();
      await expect(page.getByText("Đã cập nhật chi tiết phiếu bảo trì.")).toBeVisible();

      await page.getByRole("button", { name: "Chỉnh sửa chi tiết" }).click();
      await page.getByLabel("Hướng dẫn xử lý").fill("Giữ nguyên hướng dẫn mới.");
      api.setConflictOnNextPatch();
      await page.getByRole("button", { name: "Lưu thay đổi" }).click();
      await expect(page.getByText("Phiếu đã được cập nhật bởi người khác, hãy tải lại.")).toBeVisible();
      await expect(page.getByLabel("Hướng dẫn xử lý")).toBeVisible();

      await page.getByRole("button", { name: "Đóng biểu mẫu" }).click();
      await page.getByRole("button", { name: "Đánh giá quá hạn" }).click();
      await page.locator("#reason-dialog-input").fill("Đã thống nhất lịch mới với Owner.");
      await page.getByRole("button", { name: "Xác nhận" }).click();
      await expect(page.getByRole("button", { name: "Đánh giá quá hạn" })).toHaveCount(0);

      await page.getByRole("button", { name: "Hủy phân công" }).click();
      await page.getByRole("button", { name: "Hủy phân công" }).last().click();
      await expect(page.getByRole("button", { name: "Hủy phân công" })).toHaveCount(0);

      await page.getByRole("button", { name: new RegExp(`Chi tiết phiếu ${pendingTicketId.slice(0, 8)}`) }).click();
      await expect(page.getByRole("button", { name: "Đánh giá quá hạn" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Hủy phân công" })).toHaveCount(0);

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
});
