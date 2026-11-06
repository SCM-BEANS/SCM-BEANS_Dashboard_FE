import { expect, test, type Page, type Request } from "@playwright/test";

const workOrderId = "f4000000-0000-4000-8000-000000000001";
const ownerId = "f4000000-0000-4000-8000-000000000002";
const contractId = "f4000000-0000-4000-8000-000000000003";
const machineId = "f4000000-0000-4000-8000-000000000004";
const technicianId = "f4000000-0000-4000-8000-000000000005";
const checklistItemId = "f4000000-0000-4000-8000-000000000006";
const secondChecklistItemId = "f4000000-0000-4000-8000-000000000007";
const accessoryId = "f4000000-0000-4000-8000-000000000008";
const evidenceId = "f4000000-0000-4000-8000-000000000009";

type MockOptions = { emptyChecklist?: boolean };

function tokenFor(role: "moderator" | "technician") {
  const claims = Buffer.from(JSON.stringify({ roles: [role] })).toString("base64url");
  return `header.${claims}.signature`;
}

function workOrderDetails() {
  return {
    workOrder: {
      id: workOrderId,
      ownerId,
      contractId,
      machineId,
      machineType: "CONVENTIONAL",
      status: "IN_PROGRESS",
      assignedTechnicianId: technicianId,
      scheduledFor: "2026-11-07T09:00:00+07:00",
      startedAt: "2026-11-06T09:00:00+07:00",
      completedAt: null,
      handoverRecipient: null,
      failureReason: null,
      createdAt: "2026-11-01T09:00:00+07:00",
      updatedAt: "2026-11-06T09:00:00+07:00",
      createdBy: technicianId,
    },
    checklistItems: [
      { id: checklistItemId, itemCode: "OLD", label: "Dữ liệu cũ trong chi tiết", required: true, displayOrder: 1, result: "PENDING" },
    ],
    accessories: [],
    evidence: [],
    installationNotes: null,
    checklistItemCount: 2,
    accessoryCount: 1,
    evidenceCount: 1,
  };
}

function checklistPage(page: number, empty = false) {
  if (empty) return [];
  return page === 0
    ? [{ id: checklistItemId, itemCode: "POWER", label: "Kiểm tra nguồn điện", required: true, displayOrder: 1, result: "PASSED", notes: null }]
    : [{ id: secondChecklistItemId, itemCode: "WATER", label: "Kiểm tra đường nước", required: true, displayOrder: 2, result: "PENDING", notes: null }];
}

async function installMockApi(page: Page, options: MockOptions = {}) {
  const reads: Array<{ path: string; page: string | null }> = [];
  const downloads: Request[] = [];
  await page.route("**/api/dolores/v1/installation-work-orders/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/dolores/v1", "");
    if (request.method() === "GET" && path === `/installation-work-orders/${workOrderId}`) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(workOrderDetails()) });
      return;
    }
    if (request.method() === "GET" && path.endsWith("/checklist-items")) {
      const pageValue = url.searchParams.get("page") ?? "0";
      const currentPage = Number(pageValue);
      reads.push({ path, page: pageValue });
      const items = checklistPage(currentPage, options.emptyChecklist);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "X-Page": pageValue,
          "X-Page-Size": url.searchParams.get("size") ?? "50",
          "X-Has-Next": String(!options.emptyChecklist && currentPage === 0),
        },
        body: JSON.stringify(items),
      });
      return;
    }
    if (request.method() === "GET" && path.endsWith("/accessories")) {
      reads.push({ path, page: url.searchParams.get("page") });
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{
        id: accessoryId, accessoryName: "Bộ lọc nước", quantity: 1, serialNumber: null, notes: null,
        recordedBy: technicianId, recordedAt: "2026-11-06T09:30:00+07:00",
      }]), headers: { "X-Page": "0", "X-Page-Size": "50", "X-Has-Next": "false" } });
      return;
    }
    if (request.method() === "GET" && path.endsWith("/evidence")) {
      reads.push({ path, page: url.searchParams.get("page") });
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{
        id: evidenceId, originalFilename: "Bien-ban-ban-giao.pdf", contentType: "application/pdf", sizeBytes: 1024,
        sha256: "abc123", uploadedBy: technicianId, uploadedAt: "2026-11-06T09:35:00+07:00",
      }]), headers: { "X-Page": "0", "X-Page-Size": "50", "X-Has-Next": "false" } });
      return;
    }
    if (request.method() === "GET" && path === `/installation-work-orders/${workOrderId}/evidence/${evidenceId}`) {
      downloads.push(request);
      await route.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4 test evidence" });
      return;
    }
    await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ message: "Not found" }) });
  });
  return { reads, downloads };
}

async function openWorkOrder(page: Page, role: "moderator" | "technician") {
  await page.context().addCookies([{
    name: "access_token",
    value: tokenFor(role),
    domain: "127.0.0.1",
    path: "/",
  }]);
  const path = role === "moderator"
    ? `/moderator/technical-requests/${workOrderId}`
    : `/technician/tasks/${workOrderId}`;
  await page.goto(path);
}

test.describe("installation work-order paged records", () => {
  test.setTimeout(120_000);

  for (const role of ["moderator", "technician"] as const) {
    test(`${role} sees the shared records and can request the next checklist page`, async ({ page }) => {
      const api = await installMockApi(page);
      await openWorkOrder(page, role);

      await expect(page.getByRole("tab", { name: "Danh sách kiểm tra" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Phụ kiện bàn giao" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Chứng từ" })).toBeVisible();
      await expect(page.getByText("Kiểm tra nguồn điện")).toBeVisible();
      await expect(page.getByText("Dữ liệu cũ trong chi tiết")).toHaveCount(0);

      await page.getByRole("button", { name: "Trang sau" }).click();
      await expect(page.getByText("Kiểm tra đường nước")).toBeVisible();
      expect(api.reads).toContainEqual({ path: `/installation-work-orders/${workOrderId}/checklist-items`, page: "1" });
    });
  }

  test("shows the checklist empty state", async ({ page }) => {
    await installMockApi(page, { emptyChecklist: true });
    await openWorkOrder(page, "moderator");
    await expect(page.getByRole("status").filter({ hasText: "Chưa có mục kiểm tra nào." })).toBeVisible();
  });

  test("downloads evidence through the existing evidence content endpoint", async ({ page }) => {
    const api = await installMockApi(page);
    await openWorkOrder(page, "technician");
    await page.getByRole("tab", { name: "Chứng từ" }).click();
    await expect(page.getByText("Bien-ban-ban-giao.pdf")).toBeVisible();

    const downloadRequest = page.waitForRequest((request) => request.url().includes(`/installation-work-orders/${workOrderId}/evidence/${evidenceId}`));
    await page.getByRole("button", { name: "Tải xuống" }).click();
    const request = await downloadRequest;
    expect(request.method()).toBe("GET");
    expect(api.downloads).toHaveLength(1);
  });
});
