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

async function prepareModeratorPage(page: Page, contractStatus: "ACTIVE" | "TERMINATED" = "ACTIVE") {
  const claims = Buffer.from(JSON.stringify({ roles: ["moderator"] })).toString("base64url");
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

test("active contract offers termination and amendment, and the form has two actions", async ({ page }) => {
  await prepareModeratorPage(page);
  await page.goto(`/moderator/contracts/${contractId}`);
  const bar = pageActionBar(page);
  await expect(bar.locator('[data-action-id="contract-lifecycle-terminate"]')).toHaveClass(/danger/);
  await bar.locator('[data-action-id="contract-lifecycle-amend"]').click();
  await expect(bar.getByRole("button")).toHaveCount(2);
  await expect(bar.locator('[data-action-id="contract-lifecycle-submit-amend"]')).toHaveClass(/primary/);
});
test("terminated contract offers continuation", async ({ page }) => {
  await prepareModeratorPage(page, "TERMINATED");
  await page.goto(`/moderator/contracts/${contractId}`);
  await expectPrimaryPageAction(page, "contract-lifecycle-continue");
  await expect(pageActionBar(page).locator('[data-action-id="contract-lifecycle-terminate"]')).toHaveCount(0);
});
test("list actions omit placeholders and shortcuts", async ({ page }) => {
  await prepareModeratorPage(page);
  for (const route of ["technical-requests", "buyback", "iot"]) {
    await page.goto(`/moderator/${route}`);
    await expect(pageActionBar(page)).toBeHidden();
    await expect(page.getByRole("button", { name: /Đối soát chứng từ|Tạo yêu cầu kỹ thuật|Yêu cầu thu gom/ })).toHaveCount(0);
  }
  await page.goto("/moderator/contracts");
  await expect(pageActionBar(page).locator('[data-action-id="contracts-create"]')).toHaveClass(/primary/);
  await expect(pageActionBar(page).locator('[data-action-id="contracts-create"]')).toHaveText("Tạo hợp đồng");
  await page.goto("/moderator/machines");
  await expect(pageActionBar(page).locator('[data-action-id="machine-create"]')).toHaveClass(/primary/);
});

test("invoice lists expose export and customer creation uses the dock", async ({ page }) => {
  await prepareModeratorPage(page);
  await page.route("**/api/dolores/v1/billing/invoices*", async (route) => route.fulfill({ json: [{ id: contractId, ownerId, amount: 100, period: "2026-01", type: "RENTAL", status: "UNPAID", currency: "VND" }] }));
  for (const route of ["/moderator/invoices", "/moderator/invoices/list"]) {
    await page.goto(route);
    await expect(pageActionBar(page).locator('[data-action-id="invoice-export"]')).toBeVisible();
  }
  await page.goto("/moderator/customers/new");
  await expect(pageActionBar(page).locator('[data-action-id="customer-create-submit"]')).toBeVisible();
});

 test("invoice detail exposes status actions in the dock", async ({ page }) => {
  await prepareModeratorPage(page);
  await page.route(`**/api/dolores/v1/billing/invoices/${contractId}`, async (route) => route.fulfill({ json: { id: contractId, ownerId, amount: 100, period: "2026-01", type: "RENTAL", status: "DRAFT", currency: "VND" } }));
  await page.goto(`/moderator/invoices/${contractId}`);
  await expectPrimaryPageAction(page, "invoice-status-pending");
  await expect(pageActionBar(page).locator('[data-action-id="invoice-status-cancelled"]')).toBeVisible();
});


test("selected offline review exposes its decision in the dock", async ({ page }) => {
  await prepareModeratorPage(page);
  const claims = Buffer.from(JSON.stringify({ roles: ["moderator"], sub: ownerId })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  const review = { id: contractId, ownerId, contractId, machineId, policyVersionId: modelId, policyVersion: 1, offlineLimitMinutes: 60, status: "REVIEW_REQUIRED", source: "VALKEY_HEARTBEAT_TTL", detectedAt: "2026-11-06T08:30:00", lastObservedAt: "2026-11-06T09:40:00", observedOfflineSince: "2026-11-06T08:30:00", observedOfflineUntil: null, reviewRequiredAt: "2026-11-06T09:30:00", decision: null, reviewerId: null, reviewerRole: null, decisionReason: null, evidenceReferences: null, decidedAt: null };
  await page.route("**/api/dolores/v1/offline-violation-reviews**", route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith(contractId) ? review : [review], headers: { "X-Page": "0", "X-Page-Size": "50", "X-Has-Next": "false" } }));
  await page.goto("/moderator/iot");
  await expect(pageActionBar(page)).toBeHidden();
  await page.getByRole("button", { name: "Mất kết nối" }).click();
  await page.getByRole("button", { name: "Xem hồ sơ" }).click();
  const action = pageActionBar(page).locator('[data-action-id="offline-review-decide"]');
  await expect(action).toBeDisabled();
  await page.getByLabel("Lý do rà soát").fill("Kiểm tra kết nối");
  await page.locator('input[type="file"]').setInputFiles({ name: "review.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-test-file") });
  await expect(action).toBeEnabled();
  await action.click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
});
