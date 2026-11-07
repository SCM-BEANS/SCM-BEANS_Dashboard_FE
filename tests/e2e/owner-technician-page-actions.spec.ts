import { expect, test } from "@playwright/test";
import { expectPrimaryPageAction, pageActionBar } from "./page-actions-test-helpers";

test("technician maintenance ticket links to its repair workflow from the action bar", async ({ page }) => {
  const id = "f4000000-0000-4000-8000-000000000001";
  const claims = Buffer.from(JSON.stringify({ roles: ["technician"] })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/**", (route) => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith(`/maintenance-tickets/${id}`) ? { id, machineId: id, status: "IN_PROGRESS", repairCaseId: id } : [] }));
  await page.goto(`/technician/tasks/maintenance-tickets/${id}`);
  await expect(pageActionBar(page).getByRole("link", { name: "Mở hồ sơ sửa chữa" })).toHaveAttribute("href", `/technician/tasks/repair-cases/${id}`);
});

test("recall depot review places approval last and rejection in the bar", async ({ page }) => {
  const id = "f4000000-0000-4000-8000-000000000002";
  const claims = Buffer.from(JSON.stringify({ roles: ["admin"] })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  const work = { id, terminationCaseId: id, ownerId: id, contractId: id, machineId: id, status: "RECEIPT_REVIEW_PENDING", createdAt: "2026-01-01", updatedAt: "2026-01-01" };
  const caseData = { id, ownerId: id, contractId: id, machineId: id, type: "NORMAL", status: "RECOVERY_PENDING", requestedBy: id, reason: "test", createdAt: "2026-01-01", updatedAt: "2026-01-01" };
  await page.route("**/api/dolores/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/dolores/v1", "");
    if (path === "/recall-work-orders") return route.fulfill({ json: { content: [work], page: 0, size: 20, totalElements: 1, totalPages: 1 } });
    if (path === `/recall-work-orders/${id}`) return route.fulfill({ json: work });
    if (path === `/termination-cases/${id}`) return route.fulfill({ json: caseData });
    if (path === `/contracts/${id}`) return route.fulfill({ json: { id, ownerId: id, machineId: id, status: "ACTIVE" } });
    if (path === "/profiles") return route.fulfill({ json: [], headers: { "x-page": "0", "x-page-size": "20", "x-has-next": "false" } });
    if (path.endsWith("/events")) return route.fulfill({ json: { content: [], page: 0, size: 50, totalElements: 0, totalPages: 0 } });
    return route.fulfill({ json: [] });
  });
  await page.goto(`/admin/contracts/${id}/termination`);
  await page.getByRole("button", { name: "Mở chi tiết" }).click();
  await expectPrimaryPageAction(page, "recall-depot-approve");
  await expect(pageActionBar(page).locator('[data-action-id="recall-depot-reject"]')).toBeVisible();
});

test("admin contract creation offers cancel and primary form submission", async ({ page }) => {
  const claims = Buffer.from(JSON.stringify({ roles: ["admin"] })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    await route.fulfill({ status: 200, json: path.endsWith("/profiles") ? { items: [], page: 0, size: 100, totalElements: 0, totalPages: 0 } : [] });
  });
  await page.goto("/admin/contracts?view=create");
  await expectPrimaryPageAction(page, "create");
  const bar = pageActionBar(page);
  await expect(bar.locator('[data-action-id="create"]')).toHaveAttribute("form", "contract-create-form");
  await expect(bar.getByRole("button", { name: "Hủy", exact: true })).toBeVisible();
  await page.locator("#contract-terms").fill("Điều khoản thử nghiệm");
  await bar.getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
});

test("technician installation completion is the primary page action", async ({ page }) => {
  const id = "f4000000-0000-4000-8000-000000000001";
  const claims = Buffer.from(JSON.stringify({ roles: ["technician"] })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith(`/installation-work-orders/${id}`)) {
      return route.fulfill({ json: { workOrder: { id, ownerId: id, contractId: id, machineId: id, machineType: "CONVENTIONAL", status: "IN_PROGRESS", assignedTechnicianId: id, scheduledFor: null, startedAt: null, completedAt: null, handoverRecipient: null, failureReason: null, createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z", createdBy: id }, checklistItems: [], accessories: [], evidence: [], installationNotes: null, checklistItemCount: 0, accessoryCount: 0, evidenceCount: 1 } });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto(`/technician/tasks/${id}`);
  await expectFooter(page, "complete-installation");
  await expect(pageActionBar(page).getByRole("button", { name: "Về danh sách" })).toHaveCount(0);
});


test("recall inspection creation is the primary page action", async ({ page }) => {
  const id = "f4000000-0000-4000-8000-000000000002";
  const claims = Buffer.from(JSON.stringify({ roles: ["admin"] })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  const work = { id, terminationCaseId: id, ownerId: id, contractId: id, machineId: id, status: "RECEIVED_AT_DEPOT", createdAt: "2026-01-01", updatedAt: "2026-01-01" };
  const caseData = { id, ownerId: id, contractId: id, machineId: id, type: "NORMAL", status: "INSPECTION_PENDING", requestedBy: id, reason: "test", createdAt: "2026-01-01", updatedAt: "2026-01-01" };
  await page.route("**/api/dolores/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/dolores/v1", "");
    if (path === "/recall-work-orders") return route.fulfill({ json: { content: [work], page: 0, size: 20, totalElements: 1, totalPages: 1 } });
    if (path === `/recall-work-orders/${id}`) return route.fulfill({ json: work });
    if (path === `/termination-cases/${id}`) return route.fulfill({ json: caseData });
    if (path === `/contracts/${id}`) return route.fulfill({ json: { id, ownerId: id, machineId: id, status: "ACTIVE" } });
    if (path === "/profiles") return route.fulfill({ json: [], headers: { "x-page": "0", "x-page-size": "20", "x-has-next": "false" } });
    if (path.endsWith("/events")) return route.fulfill({ json: { content: [], page: 0, size: 50, totalElements: 0, totalPages: 0 } });
    return route.fulfill({ json: [] });
  });
  await page.goto(`/admin/contracts/${id}/termination`);
  await page.getByRole("button", { name: "M\u1edf chi ti\u1ebft" }).click();
  await expectPrimaryPageAction(page, "recall-create-inspection");
});


test("recall assignment submits its form from the action bar", async ({ page }) => {
  const id = "f4000000-0000-4000-8000-000000000002";
  const claims = Buffer.from(JSON.stringify({ roles: ["admin"] })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  const work = { id, terminationCaseId: id, ownerId: id, contractId: id, machineId: id, status: "UNASSIGNED", createdAt: "2026-01-01", updatedAt: "2026-01-01" };
  const caseData = { id, ownerId: id, contractId: id, machineId: id, type: "NORMAL", status: "RECOVERY_PENDING", requestedBy: id, reason: "test", createdAt: "2026-01-01", updatedAt: "2026-01-01" };
  await page.route("**/api/dolores/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/dolores/v1", "");
    if (path === "/recall-work-orders") return route.fulfill({ json: { content: [work], page: 0, size: 20, totalElements: 1, totalPages: 1 } });
    if (path === `/recall-work-orders/${id}`) return route.fulfill({ json: work });
    if (path === `/termination-cases/${id}`) return route.fulfill({ json: caseData });
    if (path === `/contracts/${id}`) return route.fulfill({ json: { id, ownerId: id, machineId: id, status: "ACTIVE" } });
    if (path === "/profiles") return route.fulfill({ json: [], headers: { "x-page": "0", "x-page-size": "20", "x-has-next": "false" } });
    if (path.endsWith("/events")) return route.fulfill({ json: { content: [], page: 0, size: 50, totalElements: 0, totalPages: 0 } });
    return route.fulfill({ json: [] });
  });
  await page.goto(`/admin/contracts/${id}/termination`);
  await page.getByRole("button", { name: "M\u1edf chi ti\u1ebft" }).click();
  await expectPrimaryPageAction(page, "recall-assign");
  await expect(pageActionBar(page).locator('[data-action-id="recall-assign"]')).toHaveAttribute("form", "recall-assign-form");
});


test("coffee catalog creation submits from the action bar", async ({ page }) => {
  const claims = Buffer.from(JSON.stringify({ roles: ["admin"] })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/**", (route) => route.fulfill({ json: [] }));
  await page.goto("/admin/coffee-packages");
  await page.getByRole("button", { name: "Danh mục gói" }).click();
  await expectPrimaryPageAction(page, "coffee-catalog-save");
  await expect(pageActionBar(page).locator('[data-action-id="coffee-catalog-save"]')).toHaveAttribute("form", "coffee-catalog-form");
});

test("machine registration submits from the action bar", async ({ page }) => {
  const claims = Buffer.from(JSON.stringify({ roles: ["owner"], sub: "f3000000-0000-4000-8000-000000000001" })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/**", (route) => route.fulfill({ json: [] }));
  await page.goto("/dashboard/machines/new");
  await expectPrimaryPageAction(page, "machine-register");
  await expect(pageActionBar(page).locator('[data-action-id="machine-register"]')).toHaveAttribute("form", "machine-registration-form");
});

test("global menu creation is a primary page action", async ({ page }) => {
  const claims = Buffer.from(JSON.stringify({ roles: ["admin"] })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/**", (route) => route.fulfill({ json: [] }));
  await page.goto("/admin/menu");
  await expectPrimaryPageAction(page, "menu-create");
});

test("location creation submits from the action bar", async ({ page }) => {
  const id = "f3000000-0000-4000-8000-000000000001";
  const claims = Buffer.from(JSON.stringify({ roles: ["owner"], sub: id })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/**", (route) => route.fulfill({ json: [] }));
  await page.goto("/dashboard/locations");
  await expectPrimaryPageAction(page, "location-create");
  await pageActionBar(page).locator('[data-action-id="location-create"]').click();
  await expectPrimaryPageAction(page, "location-save");
  await expect(pageActionBar(page).locator('[data-action-id="location-save"]')).toHaveAttribute("form", "location-create-form");
});

test("legacy recipe form submits from the action bar", async ({ page }) => {
  const id = "f3000000-0000-4000-8000-000000000001";
  const claims = Buffer.from(JSON.stringify({ roles: ["owner"], sub: id })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/**", (route) => route.fulfill({ json: [] }));
  await page.goto("/dashboard/menu/adjustments?view=legacy");
  await expectPrimaryPageAction(page, "legacy-save");
  await expect(pageActionBar(page).locator('[data-action-id="legacy-save"]')).toHaveAttribute("form", "legacy-recipe-form");
});

test("recipe sync request is a primary page action", async ({ page }) => {
  const id = "f3000000-0000-4000-8000-000000000001";
  const claims = Buffer.from(JSON.stringify({ roles: ["owner"], sub: id })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/**", (route) => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith("/machines") ? [{ id, ownerId: id, serialNumber: "SYNC-1", status: "IN_WAREHOUSE", machineType: "CONVENTIONAL" }] : [] }));
  await page.goto("/dashboard/menu/sync");
  await expectPrimaryPageAction(page, "recipe-sync");
});

const actionTestId = "f4000000-0000-4000-8000-000000000002";
async function actionLogin(page: import("@playwright/test").Page, role: string) {
  const claims = Buffer.from(JSON.stringify({ roles: [role], sub: actionTestId })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
}
async function expectFooter(page: import("@playwright/test").Page, id: string, form?: string) {
  await expectPrimaryPageAction(page, id);
  const bar = pageActionBar(page);
  if (form) {
    await expect(bar.locator(`[data-action-id="${id}"]`)).toHaveAttribute("type", "submit");
    await expect(bar.locator(`[data-action-id="${id}"]`)).toHaveAttribute("form", form);
    await expect(page.locator(`form#${form}`)).toBeAttached();
  }
  await expect(bar.getByRole("button", { name: /quay lại|về danh sách|làm mới|tải lại|refresh|back/i })).toHaveCount(0);
}

test("operator coffee handover submits from the footer", async ({ page }) => {
  await actionLogin(page, "admin");
  await page.route("**/api/**", route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith(`/coffee-package-orders/${actionTestId}`) ? { id: actionTestId, status: "WAITING_STOCK", quantity: 1 } : [] }));
  await page.goto(`/admin/coffee-packages/${actionTestId}`);
  await expectFooter(page, "coffee-order-handover", "coffee-order-handover-form");
});

test("operator coffee refund approval submits from the footer", async ({ page }) => {
  await actionLogin(page, "admin");
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: path.endsWith("/coffee-package-refunds") ? [{ id: actionTestId, status: "REQUESTED", amount: 100 }] : path.endsWith(`/coffee-package-refunds/${actionTestId}`) ? { id: actionTestId, status: "REQUESTED", amount: 100 } : [] });
  });
  await page.goto("/admin/coffee-packages");
  await page.getByRole("button", { name: "Hoàn tiền", exact: true }).click();
  await page.getByRole("button", { name: "Mở khoản hoàn" }).click();
  await expectFooter(page, "coffee-refund-approve", "coffee-refund-approve-form");
});

test("owner confirms a coffee refund from the footer", async ({ page }) => {
  await actionLogin(page, "owner");
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    const refund = { id: actionTestId, orderId: actionTestId, status: "PAYOUT_RECORDED", amount: 100 };
    return route.fulfill({ json: path.endsWith(`/coffee-package-orders/${actionTestId}`) ? { id: actionTestId, status: "CANCELLED" } : path.endsWith("/refund") || path.endsWith(`/coffee-package-refunds/${actionTestId}`) ? refund : path.endsWith("/payout-attempts") ? [{ id: actionTestId, refundId: actionTestId, attemptNumber: 1, status: "RECORDED" }] : [] });
  });
  await page.goto(`/dashboard/coffee-packages/${actionTestId}`);
  await expectFooter(page, "confirm-refund");
});

test("technician repair step is the primary footer action", async ({ page }) => {
  await actionLogin(page, "technician");
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith(`/installation-work-orders/${actionTestId}`)) return route.fulfill({ status: 404, json: {} });
    const data = path.endsWith(`/repair-cases/${actionTestId}`) ? { id: actionTestId, maintenanceRequestId: actionTestId, maintenanceTicketId: actionTestId, ownerId: actionTestId, contractId: actionTestId, primaryMachineId: actionTestId, status: "DIAGNOSIS", createdAt: "2026-01-01T00:00:00", updatedAt: "2026-01-01T00:00:00", timeline: [] } : path.endsWith(`/maintenance-tickets/${actionTestId}`) ? { id: actionTestId, repairCaseId: actionTestId, status: "ASSIGNED", assignedTechnicianId: actionTestId } : path.endsWith("/timeline") ? { content: [], totalElements: 0, totalPages: 0, number: 0, size: 50 } : [];
    return route.fulfill({ json: data });
  });
  await page.goto(`/technician/tasks/${actionTestId}`);
  await expectFooter(page, "start-repair");
});

test("repair case current step submits from the footer", async ({ page }) => {
  await actionLogin(page, "technician");
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith(`/installation-work-orders/${actionTestId}`)) return route.fulfill({ status: 404, json: {} });
    const data = path.endsWith(`/repair-cases/${actionTestId}`) ? { id: actionTestId, maintenanceRequestId: actionTestId, maintenanceTicketId: actionTestId, ownerId: actionTestId, contractId: actionTestId, primaryMachineId: actionTestId, status: "DIAGNOSIS", createdAt: "2026-01-01T00:00:00", updatedAt: "2026-01-01T00:00:00", timeline: [] } : path.endsWith(`/maintenance-requests/${actionTestId}`) ? { id: actionTestId, machineId: actionTestId, requestType: "REPAIR", status: "IN_PROGRESS", replacementAssignmentId: actionTestId } : path.endsWith(`/maintenance-tickets/${actionTestId}`) ? { id: actionTestId, repairCaseId: actionTestId, status: "ASSIGNED", assignedTechnicianId: actionTestId } : path.endsWith(`/replacement-assignments/${actionTestId}`) ? { id: actionTestId, ownerId: actionTestId, contractId: actionTestId, repairCaseId: actionTestId, primaryMachineId: actionTestId, replacementMachineId: actionTestId, status: "ACTIVE", startAt: "2026-01-01T00:00:00", endAt: "2027-01-01T00:00:00" } : path.endsWith("/custody-events") ? [{ id: actionTestId, maintenanceRequestId: actionTestId, repairCaseId: actionTestId, eventType: "REPLACEMENT_DELIVERED", machineId: actionTestId, actorRole: "TECHNICIAN", occurredAt: "2026-01-01T00:00:00", ownerAcknowledgedAt: "2026-01-01T00:00:00" }] : path.endsWith("/timeline") ? { content: [], number: 0, size: 50, totalElements: 0, totalPages: 0, numberOfElements: 0, first: true, last: true, empty: true } : [];
    return route.fulfill({ json: data });
  });
  await page.goto(`/technician/tasks/repair-cases/${actionTestId}`);
  await expectFooter(page, "start-repair-work", "start-repair-work-form");
});

test("owner buyback price decision is the primary footer action", async ({ page }) => {
  await actionLogin(page, "owner");
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith(`/buybacks/${actionTestId}`) ? { id: actionTestId, ownerId: actionTestId, status: "APPROVED", workflowVersion: 2, approvedPrice: 100, currency: "VND", reason: "Buyback", requestedAt: "2026-01-01", updatedAt: "2026-01-01", createdAt: "2026-01-01", collectionEvidenceRecorded: false } : [];
    return route.fulfill({ json: data });
  });
  await page.goto(`/dashboard/buyback?caseId=${actionTestId}`);
  await expectFooter(page, "accept-price");
  await expect(pageActionBar(page).locator('[data-action-id="reject-price"]')).toBeVisible();
});

test("billing refund rejection is dangerous and requires confirmation", async ({ page }) => {
  await actionLogin(page, "admin");
  const refund = { id: actionTestId, ownerId: actionTestId, contractId: actionTestId, invoiceId: null, terminationCaseId: actionTestId, refundKind: "DEPOSIT", amount: 100, currency: "VND", status: "TENANT_CONFIRMED", requestedAt: "2026-01-01" };
  const work = { id: actionTestId, terminationCaseId: actionTestId, ownerId: actionTestId, contractId: actionTestId, machineId: actionTestId, status: "RECEIVED_AT_DEPOT", createdAt: "2026-01-01", updatedAt: "2026-01-01" };
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith(`/billing/refunds/${actionTestId}`) ? refund : path.endsWith(`/termination-cases/${actionTestId}`) ? { id: actionTestId, ownerId: actionTestId, contractId: actionTestId, machineId: actionTestId, type: "NORMAL", status: "SETTLEMENT_PENDING", requestedBy: actionTestId, reason: "test", settlementId: actionTestId, depositRefundAmount: 100, refundId: actionTestId, createdAt: "2026-01-01", updatedAt: "2026-01-01" } : path.endsWith(`/contracts/${actionTestId}`) ? { id: actionTestId, ownerId: actionTestId, machineId: actionTestId, status: "ACTIVE" } : path.endsWith("/recall-work-orders") ? { content: [work], page: 0, size: 20, totalElements: 1, totalPages: 1 } : path.endsWith("/events") ? { content: [], page: 0, size: 50, totalElements: 0, totalPages: 0 } : [];
    return route.fulfill({ json: data });
  });
  await page.goto(`/admin/contracts/${actionTestId}/termination`);
  await expectFooter(page, "refund-approve");
  const reject = pageActionBar(page).locator('[data-action-id="refund-reject"]');
  await expect(reject).toHaveClass(/danger/);
  await page.getByLabel("Lý do xử lý *").fill("Không đủ điều kiện");
  await reject.click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
});

for (const [role, path] of [["owner", "/dashboard/notifications"], ["technician", "/technician/notifications"]] as const) {
  test(`${role} marks all notifications read from the action bar`, async ({ page }) => {
    await actionLogin(page, role);
    let marked = false;
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith("/notifications/read-all")) {
        marked = true;
        return route.fulfill({ status: 200, body: "" });
      }
      return route.fulfill({ json: url.pathname.endsWith("/notifications/unread-count") ? { unreadCount: 1 } : [] });
    });
    await page.goto(path);
    const action = pageActionBar(page).locator('[data-action-id="notifications-read-all"]');
    await expect(action).toBeVisible();
    await action.click();
    await expect.poll(() => marked).toBe(true);
  });
}


test("owner exports visible invoices and can download the completed job", async ({ page }) => {
  const id = "f4000000-0000-4000-8000-000000000002";
  const claims = Buffer.from(JSON.stringify({ roles: ["owner"] })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  let posted: unknown;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/billing/invoices")) return route.fulfill({ json: [{ id, amount: 100, period: "2026-01", type: "RENTAL", status: "UNPAID", currency: "VND" }] });
    if (path.endsWith("/billing/exports") && route.request().method() === "POST") { posted = route.request().postDataJSON(); return route.fulfill({ json: { id, status: "QUEUED" } }); }
    if (path.endsWith(`/billing/exports/${id}`)) return route.fulfill({ json: { id, status: "COMPLETED" } });
    return route.fulfill({ json: [] });
  });
  await page.goto("/dashboard/invoices");
  const button = pageActionBar(page).getByRole("button", { name: "Xuất hóa đơn" });
  await expect(button).toBeEnabled();
  await button.click();
  await expect.poll(() => posted).toEqual({ format: "CSV", invoiceIds: [id] });
  await expect(page.getByRole("button", { name: "Tải file hóa đơn" })).toBeVisible();
});


test("owner menu lists creation actions in the action bar", async ({ page }) => {
  await actionLogin(page, "owner");
  await page.route("**/api/**", route => route.fulfill({ json: [] }));
  await page.goto("/dashboard/menu/adjustments");
  await expect(pageActionBar(page).locator('[data-action-id="owner-menu-create"]')).toBeVisible();
  await expectPrimaryPageAction(page, "owner-recipe-create");
});
