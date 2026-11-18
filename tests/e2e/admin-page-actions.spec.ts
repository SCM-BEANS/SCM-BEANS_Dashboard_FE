import { expect, test, type Page } from "@playwright/test";
import { expectPrimaryPageAction, pageActionBar } from "./page-actions-test-helpers";

const contractId = "f5000000-0000-4000-8000-000000000001";
const ownerId = "f5000000-0000-4000-8000-000000000002";
const machineId = "f5000000-0000-4000-8000-000000000003";
const modelId = "f5000000-0000-4000-8000-000000000004";

const policySnapshot = {
  policyVersion: 1,
  maintenanceIntervalMonths: 6,
  maintenanceWindowDays: 7,
  allowedReplacementMachineTypes: ["CONVENTIONAL", "SMART_IOT"],
  repairCostResponsibility: "TENANT",
  paymentDueEligibleDays: 14,
  paymentDestinationReference: "TEST_DATA",
  offlineViolationAction: "WARN_ONLY",
  buybackEnabled: false,
  buybackMinimumMonths: 24,
  buybackValuationMethod: "MANUAL_APPRAISAL",
  offlineLimitMinutes: 60,
};

function contract(status: "ACTIVE" | "TERMINATED") {
  return {
    id: contractId,
    ownerId,
    ownerName: "TEST_DATA Owner",
    machineId,
    startDate: "2025-10-01",
    endDate: "2026-10-01",
    terms: "TEST_DATA contract terms",
    status,
    machineTypeSnapshot: "CONVENTIONAL",
    monthlyRentalFee: 1_000_000,
    depositAmount: 500_000,
    installationFee: 0,
    paygUnitPrice: 2_500,
    contractTermsSnapshot: policySnapshot,
  };
}

const overview = {
  scope: "PLATFORM",
  ownerId: null,
  asOfDate: "2026-11-07",
  usagePeriodStart: "2026-11-01",
  usagePeriodEnd: "2026-11-07",
  operationalMetrics: {
    totalOwners: 0,
    cupsInSelectedPeriod: 0,
    dailyAcceptedCupUsage: [],
    openMaintenanceTickets: 0,
    openInstallationWorkOrders: 0,
  },
  financialMetrics: [],
};

async function prepareAdminPage(page: Page, contractStatus: "ACTIVE" | "TERMINATED" = "ACTIVE") {
  const claims = Buffer.from(JSON.stringify({ roles: ["admin"] })).toString("base64url");
  await page.context().addCookies([{
    name: "access_token",
    value: `header.${claims}.signature`,
    domain: "127.0.0.1",
    path: "/",
  }]);

  await page.route("**/api/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const path = requestUrl.pathname.replace(/^\/api\/dolores\/v1/, "");
    let response: unknown = [];

    if (path === "/contracts") {
      response = [contract(contractStatus)];
    } else if (path === `/contracts/${contractId}`) {
      response = contract(contractStatus);
    } else if (path.endsWith("/expiry-status")) {
      response = {};
    } else if (path.endsWith("/policy-history") || path.endsWith("/documents")) {
      response = [];
    } else if (path === "/profiles") {
      response = { items: [], page: 0, size: 100, totalElements: 0, totalPages: 0 };
    } else if (path === "/machines") {
      response = [];
    } else if (path === "/inventory/summary") {
      response = { totalMachines: 0, statusCounts: {} };
    } else if (path === "/machine-models") {
      response = [{
        id: modelId,
        modelCode: "TEST_DATA-MODEL",
        manufacturer: "TEST_DATA Manufacturer",
        displayName: "TEST_DATA Machine",
        machineType: "CONVENTIONAL",
        active: true,
      }];
    } else if (path.startsWith("/dashboard/overview")) {
      response = overview;
    }

    await route.fulfill({ status: 200, json: response });
  });
}

test("report summary links to invoice management in the action bar", async ({ page }) => {
  await prepareAdminPage(page);
  await page.goto("/admin/reports?fromDate=2026-11-01&toDate=2026-11-07");
  const link = pageActionBar(page).getByRole("link", { name: "Quản lý hóa đơn" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "/admin/invoices");
});

test("paid coffee order offers handover in the action bar", async ({ page }) => {
  await prepareAdminPage(page);
  await page.route("**/api/**", route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith(`/coffee-package-orders/${contractId}`) ? { id: contractId, status: "PAID", quantity: 1 } : [] }));
  await page.goto(`/admin/coffee-packages/${contractId}`);
  const action = pageActionBar(page).getByRole("button", { name: "Xác nhận bàn giao" });
  await expect(action).toBeDisabled();
  await page.getByLabel("Người nhận").fill("TEST_DATA recipient");
  await expect(action).toBeEnabled();
});

test("active contract shows termination and policy amendment", async ({ page }) => {
  await prepareAdminPage(page, "ACTIVE");
  await page.goto(`/admin/contracts?view=detail&id=${contractId}`);

  const bar = pageActionBar(page);
  const terminate = bar.locator('[data-action-id="contract-lifecycle-terminate"]');
  await expect(terminate).toBeVisible();
  await expect(terminate).toHaveClass(/danger/);
  await expect(bar.locator('[data-action-id="contract-lifecycle-amend"]')).toBeVisible();
});

test("terminated contract offers continuation as its primary action", async ({ page }) => {
  await prepareAdminPage(page, "TERMINATED");
  await page.goto(`/admin/contracts?view=detail&id=${contractId}`);

  const bar = pageActionBar(page);
  await expect(bar.locator('[data-action-id="contract-lifecycle-terminate"]')).toHaveCount(0);
  await expect(bar.locator('[data-action-id="contract-lifecycle-amend"]')).toHaveCount(0);
  await expectPrimaryPageAction(page, "contract-lifecycle-continue");
  await expect(bar.locator('[data-action-id="contract-lifecycle-continue"]')).toHaveText("Tạo hợp đồng tiếp nối");
});

test("opening contract policy amendment shows cancel and the primary submit action", async ({ page }) => {
  await prepareAdminPage(page, "ACTIVE");
  await page.goto(`/admin/contracts?view=detail&id=${contractId}`);

  const bar = pageActionBar(page);
  await expect(bar).toBeVisible();
  await bar.locator('[data-action-id="contract-lifecycle-amend"]').click();
  await expect(bar.getByRole("button")).toHaveCount(2);
  await expect(bar.getByRole("button", { name: "Thêm thao tác", exact: true })).toHaveCount(0);
  await expect(bar.locator('[data-action-id="contract-lifecycle-cancel-amend"]')).toHaveText("Hủy");
  const submit = bar.locator('[data-action-id="contract-lifecycle-submit-amend"]');
  await expect(submit).toBeVisible();
  await expect(submit).toHaveText("Xác nhận sửa đổi");
  await expect(submit).toHaveClass(/primary/);
  await expect(submit).toHaveAttribute("type", "submit");
  await expect(submit).toHaveAttribute("form", "contract-policy-amend-form");
});

test("contract list puts create first and keeps retry out of the action bar", async ({ page }) => {
  await prepareAdminPage(page);
  await page.goto("/admin/contracts");

  const bar = pageActionBar(page);
  await expectPrimaryPageAction(page, "contracts-create");
  await expect(bar.getByRole("button", { name: "Thử lại", exact: true })).toHaveCount(0);
});

test("machine list uses create as its primary page action", async ({ page }) => {
  await prepareAdminPage(page);
  await page.goto("/admin/machines");

  await expectPrimaryPageAction(page, "admin-machines-create");
  await expect(pageActionBar(page).locator('[data-action-id="admin-machines-create"]')).toHaveText("Tạo máy");
});

test("machine create form exposes a disabled primary submit with a reason until valid", async ({ page }) => {
  await prepareAdminPage(page);
  await page.goto("/admin/machines?view=create");

  const bar = pageActionBar(page);
  const submit = bar.locator('[data-action-id="machine-create-submit"]');
  await expect(submit).toBeVisible();
  await expect(submit).toHaveText("Tạo máy");
  await expect(submit).toHaveClass(/primary/);
  await expect(submit).toHaveAttribute("type", "submit");
  await expect(submit).toHaveAttribute("form", "machine-create-form");
  await expect(submit).toBeDisabled();
  const reasonId = await submit.getAttribute("aria-describedby");
  expect(reasonId).toBeTruthy();
  await expect(page.locator(`[id="${reasonId}"]`)).toHaveText("Chọn mẫu máy trước khi tạo máy.");
});

test("overview keeps the reporting period without duplicate shortcut actions", async ({ page }) => {
  await prepareAdminPage(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin");
  const heading = page.getByRole("heading", { name: "Tổng quan vận hành", exact: true }).locator("xpath=../..");
  await expect(heading.locator('a[href="/admin/iot"], a[href="/admin/machines"]')).toHaveCount(0);
  await expect(page.getByLabel("Chọn kỳ báo cáo", { exact: true })).toBeVisible();
  await expect(pageActionBar(page)).toBeHidden();
  await page.screenshot({ path: ".playwright-cli/designs/ui-after-admin-overview.png" });
});

test("text tabs keep keyboard selection, panel relationships and mobile scrolling", async ({ page }) => {
  await prepareAdminPage(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin/coffee-packages");
  const tabs = page.getByRole("tablist", { name: "Nhóm quản lý gói cà phê" });
  const orders = tabs.getByRole("tab", { name: "Đơn hàng", exact: true });
  await expect(orders).toHaveAttribute("aria-selected", "true");
  await expect(orders).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(orders).toHaveCSS("border-bottom-width", "2px");
  await expect(orders).toHaveCSS("color", "rgb(31, 90, 81)");
  await expect(orders).toHaveCSS("font-weight", "600");
  await page.screenshot({ path: ".playwright-cli/designs/ui-after-admin-coffee-packages.png" });
  await orders.focus();
  await orders.press("ArrowRight");
  const refunds = tabs.getByRole("tab", { name: "Hoàn tiền", exact: true });
  await expect(refunds).toBeFocused();
  await expect(refunds).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "Hoàn tiền", exact: true })).toBeVisible();
  await refunds.press("End");
  await expect(tabs.getByRole("tab", { name: "Thanh toán ngoại lệ" })).toBeFocused();
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(tabs).toHaveCSS("overflow-x", "auto");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin/menu");
  const recipe = page.getByRole("navigation", { name: "Khu vực công thức" });
  await expect(recipe).toBeVisible();
  const active = recipe.locator('[aria-pressed="true"], [aria-current="page"]');
  await expect(active).toHaveCSS("border-bottom-width", "2px");
  await expect(active).toHaveCSS("font-weight", "600");
  await expect(active).toHaveCSS("color", "rgb(31, 90, 81)");
  await page.screenshot({ path: ".playwright-cli/designs/ui-after-admin-recipes.png" });
});

test("invoice export shows progress until the completed file can be downloaded", async ({ page }) => {
  await prepareAdminPage(page);
  let status = "PROCESSING";
  await page.route(`**/billing/exports/${contractId}`, (route) => route.fulfill({ json: { id: contractId, status, format: "CSV" } }));
  await page.goto(`/admin/invoices/exports/${contractId}`);
  await expect(page.getByRole("status").filter({ hasText: "Trạng thái tự cập nhật" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tệp chưa sẵn sàng" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tải xuống dolores-invoices.csv", exact: true })).toHaveCount(0);
  status = "COMPLETED";
  await page.getByRole("button", { name: "Làm mới", exact: true }).click();
  await expect(page.getByRole("button", { name: "Tải xuống dolores-invoices.csv", exact: true })).toBeEnabled();
});

test("mobile contract shows its two actions at the top without a footer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareAdminPage(page, "TERMINATED");
  await page.goto(`/admin/contracts?view=detail&id=${contractId}`);

  const bar = pageActionBar(page);
  await expect(bar).toBeVisible();
  await expect(bar.getByRole("button", { name: "Lịch sử hợp đồng", exact: true })).toBeVisible();
  await expect(bar.locator('[data-action-id="contract-lifecycle-continue"]')).toHaveClass(/primary/);
  await expect(page.locator("footer")).toHaveCount(0);
  expect((await bar.boundingBox())!.y).toBeLessThan((await page.getByRole("heading", { level: 1 }).boundingBox())!.y);
});


test("invoice export requires one owner and submits filtered invoices", async ({ page }) => {
  await prepareAdminPage(page);
  const otherOwner = "f5000000-0000-4000-8000-000000000005";
  const invoice = (id: string, owner: string) => ({ id, ownerId: owner, amount: 100, period: "2026-01", type: "RENTAL", status: "UNPAID", currency: "VND" });
  let posted: unknown;
  await page.route("**/api/dolores/v1/billing/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/exports")) { posted = route.request().postDataJSON(); return route.fulfill({ json: { id: contractId, status: "QUEUED" } }); }
    const rows = [invoice(contractId, ownerId), invoice(machineId, otherOwner)];
    return route.fulfill({ json: url.searchParams.has("ownerId") ? rows.slice(0, 1) : rows });
  });
  await page.route("**/api/dolores/v1/profiles*", (route) => route.fulfill({ json: { items: [{ idaasUserId: ownerId, email: "owner@example.com", fullName: "TEST_DATA Owner", emailVerified: true, roles: ["OWNER"], status: "ACTIVE" }], page: 0, size: 100, totalElements: 1, totalPages: 1 } }));
  await page.goto("/admin/invoices");
  const filters = page.getByRole("button", { name: "Tìm kiếm", exact: true }).locator("xpath=../..");
  const button = filters.getByRole("button", { name: "Xuất danh sách" });
  await expect(button).toBeVisible();
  await expect(button).toBeDisabled();
  await expect(button).toHaveAccessibleDescription("Lọc theo một chủ sở hữu để xuất hóa đơn.");
  await page.getByRole("combobox", { name: "Khách hàng", exact: true }).selectOption(ownerId);
  await page.getByRole("button", { name: "Tìm kiếm" }).click();
  await expect(button).toBeEnabled();
  await button.click();
  await expect.poll(() => posted).toEqual({ format: "CSV", ownerId, invoiceIds: [contractId] });
});

test("notifications expose bulk read in the action bar", async ({ page }) => {
  await prepareAdminPage(page);
  await page.goto("/admin/notifications");
  await expect(pageActionBar(page)).toBeVisible();
});


test("pending coffee order decisions use the action bar", async ({ page }) => {
  await prepareAdminPage(page);
  await page.route("**/api/**", route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith(`/coffee-package-orders/${contractId}`) ? { id: contractId, status: "PENDING_APPROVAL", quantity: 1 } : [] }));
  await page.goto(`/admin/coffee-packages/${contractId}`);
  const bar = pageActionBar(page);
  await expect(bar.locator('[data-action-id="coffee-order-approve"]')).toHaveClass(/primary/);
  await expect(bar.locator('[data-action-id="coffee-order-reject"]')).toHaveClass(/danger/);
  await page.getByLabel("Ghi chú", { exact: true }).fill("Đã kiểm tra nguồn cung");
  await page.getByLabel("Lý do", { exact: true }).fill("Không đủ nguồn cung");
  await expect(bar.locator('[data-action-id="coffee-order-approve"]')).toBeEnabled();
  await expect(bar.locator('[data-action-id="coffee-order-reject"]')).toBeEnabled();
});


test("invoice proof rows show one button and open review controls in the preview", async ({ page }) => {
  await prepareAdminPage(page);
  const ownerId = contract("ACTIVE").ownerId;
  await page.route(`**/billing/invoices/${contractId}`, route => route.fulfill({ json: {
    id: contractId, ownerId, type: "REPAIR", amount: 12500, currency: "VND", status: "UNPAID", period: "2026-10",
  } }));
  await page.route(`**/billing/invoices/${contractId}/payment-proofs?*`, route => route.fulfill({ json: [{
    id: modelId, invoiceId: contractId, ownerId, paymentId: modelId, originalFilename: "chung-tu.zip",
    sizeBytes: 100, sha256: "a".repeat(64), contentType: "application/zip", status: "SUBMITTED",
    submittedBy: ownerId, submittedAt: "2026-11-01T10:00:00Z",
  }] }));
  await page.goto(`/admin/invoices/${contractId}`);
  const row = page.getByRole("row").filter({ hasText: "chung-tu.zip" });
  await expect(row.getByRole("button")).toHaveCount(1);
  await row.getByRole("button", { name: "Xem chứng từ" }).click();
  const preview = page.getByRole("dialog", { name: "Chứng từ thanh toán" });
  await expect(preview.getByRole("button", { name: /Tải xuống/ })).toBeVisible();
  await expect(preview.getByRole("button", { name: "Từ chối chứng từ" })).toBeEnabled();
  await preview.getByRole("button", { name: "Duyệt chứng từ" }).click();
  await expect(preview).toHaveCount(0);
  await expect(page.getByRole("alertdialog").getByRole("textbox")).toBeVisible();
});


test("dashboard lists align their titles and keep one settings entry", async ({ page }) => {
  test.setTimeout(90_000);
  await prepareAdminPage(page);
  const routes = ["invoices", "machines", "notifications", "buybacks", "coffee-packages", "technical-requests"];
  for (const viewport of [{ width: 1440, height: 560 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    let firstTitle: { x: number; y: number } | undefined;
    for (const route of routes) {
      await page.goto(`/admin/${route}`);
      const title = page.getByRole("heading", { level: 1 });
      await expect(title).toBeVisible();
      const bounds = (await title.boundingBox())!;
      firstTitle ??= bounds;
      expect(bounds.x, route).toBeCloseTo(firstTitle.x, 0);
      expect(bounds.y, route).toBeCloseTo(firstTitle.y, 0);
      await expect(page.getByRole("button", { name: "Cài đặt", exact: true })).toHaveCount(1);
    }
    if (viewport.width > 1023) {
      const nav = page.getByRole("navigation", { name: "Điều hướng Admin" });
      await expect(nav).toHaveCSS("scrollbar-width", "none");
      const lastLink = nav.getByRole("link", { name: "Thông báo", exact: true });
      await lastLink.focus();
      await expect(lastLink).toBeInViewport();
    }
    await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
    await expect(page.getByRole("menuitem", { name: "Hồ sơ" })).toBeVisible();
  }
});
