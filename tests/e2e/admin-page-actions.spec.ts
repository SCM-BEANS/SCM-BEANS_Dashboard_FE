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
    } else if (path === "/notifications/unread-count") {
      response = { unreadCount: 1 };
    }

    await route.fulfill({ status: 200, json: response });
  });
}

test("admin overview links to invoice management", async ({ page }) => {
  await prepareAdminPage(page);
  await page.goto("/admin");
  const link = page.getByRole("link", { name: "Xem tất cả hóa đơn" });
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
  await expect(terminate).toHaveAttribute("data-ui-button-variant", "danger");
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
  await expect(submit).toHaveAttribute("data-ui-button-variant", "primary");
  await expect(submit).toHaveAttribute("type", "submit");
  await expect(submit).toHaveAttribute("form", "contract-policy-amend-form");
});

test("contract list uses the shared create button without moving retry into an action bar", async ({ page }) => {
  await prepareAdminPage(page);
  await page.goto("/admin/contracts");

  const create = page.getByRole("main").getByRole("button", { name: "Tạo hợp đồng", exact: true });
  await expect(create).toBeVisible();
  await expect(create).toHaveAttribute("data-ui-button");
  await expect(pageActionBar(page)).toBeHidden();
  await expect(page.getByRole("main").getByRole("button", { name: "Thử lại", exact: true })).toHaveCount(0);
});

test("machine list uses the shared registration button", async ({ page }) => {
  await prepareAdminPage(page);
  await page.goto("/admin/machines");

  const create = page.getByRole("main").getByRole("button", { name: "Thêm máy", exact: true });
  await expect(create).toBeVisible();
  await expect(create).toHaveAttribute("data-ui-button");
  await expect(pageActionBar(page)).toBeHidden();
});

test("machine create form exposes a disabled primary submit with a reason until valid", async ({ page }) => {
  await prepareAdminPage(page);
  await page.goto("/admin/machines?view=create");

  const bar = pageActionBar(page);
  const submit = bar.locator('[data-action-id="machine-create-submit"]');
  await expect(submit).toBeVisible();
  await expect(submit).toHaveText("Tạo máy");
  await expect(submit).toHaveAttribute("data-ui-button-variant", "primary");
  await expect(submit).toHaveAttribute("type", "submit");
  await expect(submit).toHaveAttribute("form", "machine-create-form");
  await expect(submit).toBeDisabled();
  const reasonId = await submit.getAttribute("aria-describedby");
  expect(reasonId).toBeTruthy();
  await expect(page.locator(`[id="${reasonId}"]`)).toHaveText("Chọn mẫu máy trước khi tạo máy.");
});

test("overview exposes its two secondary shortcuts without a primary", async ({ page }) => {
  await prepareAdminPage(page);
  await page.goto("/admin");

  const bar = pageActionBar(page);
  await expect(bar).toBeVisible();
  const actions = bar.locator("[data-action-id]");
  await expect(actions).toHaveCount(2);
  const actionClasses = await actions.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("class") ?? ""));
  expect(actionClasses.every((className) => !className.includes("primary"))).toBe(true);
  await expect(bar.locator("a[data-action-id]")).toHaveCount(2);
  await expect(bar.getByRole("link", { name: "Giám sát Smart IoT" })).toHaveAttribute("href", "/admin/iot");
  await expect(bar.getByRole("link", { name: "Quản lý máy" })).toHaveAttribute("href", "/admin/machines");
});

test("mobile contract detail shows only primary and overflow controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareAdminPage(page, "TERMINATED");
  await page.goto(`/admin/contracts?view=detail&id=${contractId}`);

  const bar = pageActionBar(page);
  await expect(bar).toBeVisible();
  await expect(bar.getByRole("button", { name: "Thêm thao tác", exact: true })).toBeVisible();
  const visibleActions = bar.locator('[data-action-id]:visible');
  await expect(visibleActions).toHaveCount(1);
  await expect(visibleActions.first()).toHaveAttribute("data-action-id", "contract-lifecycle-continue");
  await expect(visibleActions.first()).toHaveAttribute("data-ui-button-variant", "primary");
});


test("invoice export uses a neutral shared button and sends the visible invoice IDs", async ({ page }) => {
  await prepareAdminPage(page);
  const otherOwner = "f5000000-0000-4000-8000-000000000005";
  const invoices = [
    { id: contractId, ownerId, amount: 100, period: "2026-01", type: "RENTAL", status: "UNPAID", currency: "VND" },
    { id: machineId, ownerId: otherOwner, amount: 200, period: "2026-01", type: "RENTAL", status: "UNPAID", currency: "VND" },
  ];
  let posted: unknown;
  await page.route("**/api/dolores/v1/billing/invoices**", (route) => route.fulfill({ json: invoices }));
  await page.route("**/api/dolores/v1/billing/exports", async (route) => {
    posted = route.request().postDataJSON();
    return route.fulfill({ json: { id: modelId, status: "QUEUED" } });
  });
  await page.goto("/admin/invoices");
  const button = page.getByRole("main").getByRole("button", { name: "Xuất danh sách", exact: true });
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
  await expect(button).toHaveAttribute("data-ui-button");
  const style = await button.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { background: computed.backgroundColor, color: computed.color, border: computed.borderColor, height: element.getBoundingClientRect().height, transition: computed.transitionProperty, transform: computed.transform, shadow: computed.boxShadow };
  });
  expect(style).toEqual({ background: "rgb(255, 255, 255)", color: "rgb(0, 0, 0)", border: "rgb(233, 226, 220)", height: 44, transition: "none", transform: "none", shadow: "none" });
  await button.hover();
  await expect.poll(() => button.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { background: computed.backgroundColor, color: computed.color, border: computed.borderColor, height: element.getBoundingClientRect().height, transition: computed.transitionProperty, transform: computed.transform, shadow: computed.boxShadow };
  })).toEqual(style);
  await button.click();
  await expect.poll(() => posted).toEqual({ format: "CSV", invoiceIds: [contractId, machineId] });
});

test("notification management keeps bulk read inside the shared panel", async ({ page }) => {
  await prepareAdminPage(page);
  await page.route("**/api/**/alerts", route => route.fulfill({ json: [{
    id: machineId,
    level: "MEDIUM",
    machineId,
    message: "Kiểm tra tình trạng máy tại cửa hàng.",
    acknowledged: false,
    ts: "2026-11-18T08:00:00.000Z",
  }] }));
  await page.goto("/admin/notifications");
  const action = page.getByRole("main").getByRole("button", { name: "Đánh dấu tất cả đã đọc", exact: true });
  await expect(action).toBeVisible();
  await expect(action).toBeEnabled();
  await expect(action).toHaveAttribute("data-ui-button");

  await page.getByRole("group", { name: "Phạm vi thông báo" }).getByRole("button", { name: "Cảnh báo máy" }).click();
  const alertRow = page.locator('[data-ui-button-layout="content"]');
  await expect(alertRow).toBeVisible();
  const style = () => alertRow.evaluate(element => {
    const computed = getComputedStyle(element);
    return {
      background: computed.backgroundColor,
      color: computed.color,
      border: computed.borderColor,
      height: element.getBoundingClientRect().height,
      transition: computed.transitionProperty,
      transform: computed.transform,
      shadow: computed.boxShadow,
    };
  });
  const before = await style();
  expect(before.background).toBe("rgb(255, 255, 255)");
  expect(before.color).toBe("rgb(0, 0, 0)");
  expect(before.height).toBeGreaterThanOrEqual(44);
  await alertRow.hover();
  expect(await style()).toEqual(before);
});


test("pending coffee order decisions use the action bar", async ({ page }) => {
  await prepareAdminPage(page);
  await page.route("**/api/**", route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith(`/coffee-package-orders/${contractId}`) ? { id: contractId, status: "PENDING_APPROVAL", quantity: 1 } : [] }));
  await page.goto(`/admin/coffee-packages/${contractId}`);
  const bar = pageActionBar(page);
  await expect(bar.locator('[data-action-id="coffee-order-approve"]')).toHaveAttribute("data-ui-button-variant", "primary");
  await expect(bar.locator('[data-action-id="coffee-order-reject"]')).toHaveAttribute("data-ui-button-variant", "danger");
  await page.getByLabel("Ghi chú", { exact: true }).fill("Đã kiểm tra nguồn cung");
  await page.getByLabel("Lý do", { exact: true }).fill("Không đủ nguồn cung");
  await expect(bar.locator('[data-action-id="coffee-order-approve"]')).toBeEnabled();
  await expect(bar.locator('[data-action-id="coffee-order-reject"]')).toBeEnabled();
});
