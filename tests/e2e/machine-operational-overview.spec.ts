import { expect, test, type Page } from "@playwright/test";

const machineId = "f1000000-0000-4000-8000-000000000004";
const ownerId = "f1000000-0000-4000-8000-000000000001";
const machine = {
  id: machineId,
  ownerId,
  serialNumber: "E2E-IOT-01",
  status: "DEPLOYED_CONTRACT_OWNER",
  machineType: "SMART_IOT",
  region: "TEST_DATA",
};
const dashboardOverview = {
  scope: "ROLE_SCOPED",
  ownerId: null,
  asOfDate: "2026-11-01",
  usagePeriodStart: "2026-10-26",
  usagePeriodEnd: "2026-11-01",
  operationalMetrics: {
    cupsInSelectedPeriod: 18,
    dailyAcceptedCupUsage: [{ date: "2026-11-01", cups: 18 }],
    openMaintenanceTickets: 0,
  },
  periodFinancialMetrics: [
    {
      currency: "VND",
      amountIssuedInPeriod: 1000,
      amountCollectedInPeriod: 1000,
      issuanceQuality: { status: "COMPLETE" },
      collectionQuality: { status: "COMPLETE" },
    },
  ],
};

type RoleCase = {
  label: string;
  claim: string;
  listPath: string;
  detailPath: string;
  operationsPath: string;
  pointsAllowed: boolean;
  financialsVisible: boolean;
};

const roleCases: RoleCase[] = [
  {
    label: "Owner",
    claim: "owner",
    listPath: "/dashboard/machines",
    detailPath: `/dashboard/machines/${machineId}`,
    operationsPath: `/dashboard/machines/${machineId}/operations`,
    pointsAllowed: true,
    financialsVisible: false,
  },
  {
    label: "Admin",
    claim: "admin",
    listPath: "/admin/machines",
    detailPath: `/admin/machines/${machineId}`,
    operationsPath: `/admin/machines/${machineId}/operations`,
    pointsAllowed: true,
    financialsVisible: true,
  },
  {
    label: "Moderator",
    claim: "moderator",
    listPath: "/moderator/machines",
    detailPath: `/moderator/machines/${machineId}`,
    operationsPath: `/moderator/machines/${machineId}/operations`,
    pointsAllowed: false,
    financialsVisible: false,
  },
];

const viewportWidths = [390, 768, 1023, 1024, 1440];

function tokenFor(role: string) {
  const claims = Buffer.from(JSON.stringify({ sub: ownerId, roles: [role] })).toString("base64url");
  return `header.${claims}.signature`;
}

async function installMockApi(page: Page, role: RoleCase, requests: string[], options: { cleaningPages?: boolean; cupError?: boolean } = {}) {
  await page.route("**/api/dolores/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api\/dolores\/v1/, "");
    requests.push(`${path}${url.search}`);

    if (role.claim === "owner" && path === "/contracts") {
      await route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message: "Forbidden" }) });
      return;
    }

    let body: unknown = [];
    if (options.cupError && path === "/owner/cup-count") {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Cup service unavailable" }) });
      return;
    }
    if (path === "/machines") {
      body = [machine];
    } else if (path === "/inventory/summary") {
      body = { totalMachines: 1, statusCounts: { DEPLOYED_CONTRACT_OWNER: 1 } };
    } else if (path === `/machines/${machineId}`) {
      body = machine;
    } else if (path === `/machines/${machineId}/maintenance-schedule`) {
      body = { nextPreventiveMaintenanceAt: null, cupsServedSinceLastDescale: 18 };
    } else if (path === "/contracts" || path === `/contracts/machine/${machineId}/history`) {
      body = [{ id: "f1000000-0000-4000-8000-000000000005", ownerId, machineId, status: "ACTIVE", startDate: "2026-01-01", endDate: "2027-01-01" }];
    } else if (path === "/owner/cup-count") {
      const from = url.searchParams.get("from")!;
      const to = url.searchParams.get("to")!;
      body = { ownerId, from, to, totalCups: 18, activeMachineCount: 3,
        machineBreakdown: [{ machineSerialNumber: machine.serialNumber, cups: 18 }],
        dailyBreakdown: [{ date: from.slice(0, 10), cups: 18 }], recipeBreakdown: [{ recipeName: "Espresso", cups: 18 }] };
    } else if (path === "/owner/brew-records" || path === "/owner/cleaning-records") {
      const from = url.searchParams.get("from")!;
      const timestamp = new Date(Date.parse(from) + 60_000).toISOString();
      const pageNumber = Number(url.searchParams.get("page") ?? 0);
      const size = Number(url.searchParams.get("size") ?? 20);
      const base = { id: "f1000000-0000-4000-8000-000000000006", eventId: "f1000000-0000-4000-8000-000000000007", machineId, machineSerialNumber: machine.serialNumber };
      const isCleaning = path.endsWith("cleaning-records");
      const record = isCleaning ? { ...base, cleaningType: url.searchParams.get("cleaningType") ?? "STARTUP", status: url.searchParams.get("status") ?? (pageNumber === 0 ? "ABORTED" : "COMPLETED"), startedAt: timestamp,
        finishedAt: null, coffeeCleaned: true, milkCleaned: false, heatingCompleted: false, groupheadPurged: false, notes: pageNumber === 0 ? "Chu trình đã dừng" : "Đã vệ sinh hoàn tất" }
        : { ...base, recipeName: url.searchParams.get("recipeName") ?? "Espresso", brewedAt: timestamp, receivedAt: null };
      const multiPage = isCleaning && options.cleaningPages && !url.searchParams.has("status");
      const content = multiPage && pageNumber === 0 ? Array.from({ length: size }, (_, index) => ({ ...record, id: `f2000000-0000-4000-8000-${String(index).padStart(12, "0")}` })) : [record];
      body = { content, page: pageNumber, size, totalElements: multiPage ? size + 1 : 1, totalPages: multiPage ? 2 : 1, first: pageNumber === 0, last: !multiPage || pageNumber === 1 };
    } else if (path.includes("/heartbeats/latest")) {
      body = { machineId, status: "ONLINE", evaluatedAt: "2026-11-01T09:00:00Z", lastSeenAt: "2026-11-01T09:00:00Z" };
    } else if (path.endsWith("/points")) {
      body = [{ machineId, timestamp: "2026-11-01T09:00:00Z", field: "cups", value: 18 }];
    } else if (path === "/dashboard/overview") {
      body = {
        ...dashboardOverview,
        ...(role.claim === "owner" ? { scope: "OWNER", ownerId } : {}),
        ...(role.claim === "admin" ? { scope: "PLATFORM" } : {}),
        ...(role.claim === "moderator" ? { scope: "OPERATOR", periodFinancialMetrics: [] } : {}),
      };
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

async function expectNoHorizontalOverflow(page: Page, width: number, screen: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `${screen} should not overflow horizontally at ${width}px`).toBeLessThanOrEqual(1);
}

test.describe("machine operational overview cross-role presentation", () => {
  test.setTimeout(120_000);

  for (const role of roleCases) {
    test(`${role.label} can navigate list → detail → operations at all planned widths`, async ({ page, context }) => {
      await context.addCookies([{
        name: "access_token",
        value: tokenFor(role.claim),
        domain: "127.0.0.1",
        path: "/",
      }]);

      const requests: string[] = [];
      await installMockApi(page, role, requests);

      for (const width of viewportWidths) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(role.listPath);
        const detailLink = page.locator(`a[href="${role.detailPath}"]`).first();
        await expect(detailLink).toBeVisible();
        if (role.claim === "owner") {
          await expect(page.getByRole("cell", { name: /Đầu ngày: Bị gián đoạn/ })).toBeVisible();
        }
        await expectNoHorizontalOverflow(page, width, `${role.label} machine list`);

        await detailLink.click();
        await expect(page).toHaveURL(new RegExp(`${role.detailPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
        const operationsLink = page.locator(`a[href="${role.operationsPath}"]`);
        await expect(operationsLink).toBeVisible();
        await expectNoHorizontalOverflow(page, width, `${role.label} machine detail`);

        await operationsLink.click();
        await expect(page).toHaveURL(new RegExp(`${role.operationsPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
        await expect(page.locator("#machine-operational-overview-title")).toBeVisible();
        await expect(page.getByText("18", { exact: true }).first()).toBeVisible();
        await expectNoHorizontalOverflow(page, width, `${role.label} operational overview`);

        const backToMachine = page.locator(`a[href="${role.detailPath}"]`).last();
        await expect(backToMachine).toBeVisible();
        await page.goBack();
        await expect(page).toHaveURL(new RegExp(`${role.detailPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
        await page.goBack();
        await expect(page).toHaveURL(new RegExp(`${role.listPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
      }

      if (role.claim === "owner") {
        await page.goto(`${role.operationsPath}?tab=connection`);
        await expect.poll(() => requests.some((request) => request.includes("/telemetry-query/machines/") && request.split("?", 1)[0].endsWith("/points"))).toBe(true);
      }
      const heartbeatRequested = requests.some((request) => request.includes("/heartbeats/latest"));
      expect(heartbeatRequested).toBe(role.claim !== "moderator");
      const overviewEndpoint = role.claim === "owner" ? "/owner/cup-count?" : "/dashboard/overview?";
      await expect.poll(() => requests.some((request) => request.startsWith(overviewEndpoint))).toBe(true);
      const dashboardRequest = requests.find((request) => request.startsWith(overviewEndpoint));
      expect(dashboardRequest).toBeTruthy();
      expect(new URLSearchParams(dashboardRequest!.split("?", 2)[1]).has("ownerId")).toBe(false);

      const pointsRequested = requests.some((request) => request.includes("/telemetry-query/machines/") && request.split("?", 1)[0].endsWith("/points"));
      expect(pointsRequested).toBe(role.pointsAllowed);
      if (role.claim === "owner") expect(requests.some((request) => request.startsWith("/dashboard/overview?"))).toBe(false);
      if (role.claim === "owner") {
        expect(requests.some((request) => request.split("?", 1)[0] === "/contracts")).toBe(false);
        expect(requests.some((request) => request.startsWith(`/contracts/machine/${machineId}/history?status=ACTIVE`))).toBe(true);
      }
      if (role.financialsVisible) {
        await page.goto(role.operationsPath);
        await expect(page.locator("#period-finances-title")).toBeVisible();
      } else {
        await page.goto(role.operationsPath);
        await expect(page.locator("#period-finances-title")).toHaveCount(0);
      }
    });
  }
});

const ownerOperationsPath = `/dashboard/machines/${machineId}/operations`;
const fixedDates = "fromDate=2026-11-06&toDate=2026-11-06";

const offlineReviewId = "f3000000-0000-4000-8000-000000000001";
const offlineReview = {
  id: offlineReviewId, ownerId, contractId: "f1000000-0000-4000-8000-000000000005", machineId,
  policyVersionId: "f3000000-0000-4000-8000-000000000002", policyVersion: 1, offlineLimitMinutes: 60,
  status: "REVIEW_REQUIRED", source: "VALKEY_HEARTBEAT_TTL",
  detectedAt: "2026-11-06T08:30:00", lastObservedAt: "2026-11-06T09:40:00", observedOfflineSince: "2026-11-06T08:30:00",
  observedOfflineUntil: null, reviewRequiredAt: "2026-11-06T09:30:00", decision: null, reviewerId: null,
  reviewerRole: null, decisionReason: null, evidenceReferences: null, decidedAt: null,
};

async function installOfflineMock(page: Page, requests: string[], conflict = false) {
  let current: Record<string, unknown> = { ...offlineReview };
  const posts: unknown[] = [];
  await page.route("**/api/dolores/v1/offline-violation-reviews**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api\/dolores\/v1/, "");
    requests.push(`${route.request().method()} ${path}${url.search}`);
    if (route.request().method() === "POST") {
      const input = route.request().postDataJSON();
      posts.push(input);
      if (conflict) {
        await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ message: "Review changed. Refresh and retry." }) });
        return;
      }
      current = { ...current, ...input, status: "REVIEWED", decisionReason: input.reason,
        reviewerId: ownerId, reviewerRole: "MODERATOR", decidedAt: "2026-11-06T10:00:00" };
    }
    const list = path === "/offline-violation-reviews";
    const headers = list ? { "X-Page": url.searchParams.get("page") ?? "0", "X-Page-Size": url.searchParams.get("size") ?? "50", "X-Has-Next": "false" } : {};
    await route.fulfill({ status: 200, contentType: "application/json", headers, body: JSON.stringify(list ? [current] : current) });
  });
  return posts;
}

test.describe("Owner operations analytics and cleaning", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("owner"), domain: "127.0.0.1", path: "/" }]);
  });

  test("Owner operations preserves machine filters, tabs, refresh and browser history in the URL", async ({ page }) => {
    const requests: string[] = [];
    await installMockApi(page, roleCases[0], requests);
    await page.goto(`${ownerOperationsPath}?tab=brewing&${fixedDates}&brewPage=2&keep=existing`);
    await expect(page.locator("#machine-operational-overview-title")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Pha chế", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect.poll(() => requests.some((path) => path.startsWith("/owner/cup-count?"))).toBe(true);
    const cupRequest = new URLSearchParams(requests.find((path) => path.startsWith("/owner/cup-count?"))!.split("?", 2)[1]);
    expect(cupRequest.get("machineId")).toBe(machineId);
    expect(Date.parse(cupRequest.get("from")!)).toBe(Date.parse("2026-11-05T17:00:00Z"));
    expect(Date.parse(cupRequest.get("to")!)).toBe(Date.parse("2026-11-06T17:00:00Z"));
    expect(cupRequest.has("ownerId")).toBe(false);
    await page.getByLabel("Món pha", { exact: true }).fill("Cappuccino");
    await page.getByRole("button", { name: "Áp dụng bộ lọc", exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("recipeName")).toBe("Cappuccino");
    expect(new URL(page.url()).searchParams.get("brewPage") ?? "0").toBe("0");
    expect(new URL(page.url()).searchParams.get("keep")).toBe("existing");
    await page.getByRole("tab", { name: "Vệ sinh", exact: true }).click();
    await expect(page).toHaveURL(/tab=cleaning/);
    await page.reload();
    await expect(page.getByRole("tab", { name: "Vệ sinh", exact: true })).toHaveAttribute("aria-selected", "true");
    await page.goBack();
    await expect(page.getByRole("tab", { name: "Pha chế", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByLabel("Món pha", { exact: true })).toHaveValue("Cappuccino");
    await page.goForward();
    await expect(page.getByRole("tab", { name: "Vệ sinh", exact: true })).toHaveAttribute("aria-selected", "true");
    expect(requests.some((path) => path.startsWith("/dashboard/overview?"))).toBe(false);
    await expect(page.locator("#period-finances-title")).toHaveCount(0);
  });

  test("Owner operations cleaning reads later pages and resets the page when filters change", async ({ page }) => {
    const requests: string[] = [];
    await installMockApi(page, roleCases[0], requests, { cleaningPages: true });
    await page.goto(`${ownerOperationsPath}?tab=cleaning&${fixedDates}`);
    await expect(page.getByRole("tab", { name: "Vệ sinh", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("cell", { name: "Bị gián đoạn", exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Trang sau", exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("cleaningPage")).toBe("1");
    await expect(page.getByRole("cell", { name: "Hoàn tất", exact: true }).first()).toBeVisible();
    await page.getByLabel("Loại vệ sinh", { exact: true }).selectOption("CLOSING");
    await page.getByLabel("Kết quả", { exact: true }).selectOption("ABORTED");
    await page.getByRole("button", { name: "Áp dụng bộ lọc", exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("cleaningStatus")).toBe("ABORTED");
    expect(new URL(page.url()).searchParams.get("cleaningPage") ?? "0").toBe("0");
    await expect.poll(() => requests.some((path) => {
      if (!path.startsWith("/owner/cleaning-records?")) return false;
      const params = new URLSearchParams(path.split("?", 2)[1]);
      return params.get("cleaningType") === "CLOSING" && params.get("status") === "ABORTED" && params.get("page") === "0";
    })).toBe(true);
  });

  test("Owner operations exposes a cup service error without inventing zero usage or querying dashboard totals", async ({ page }) => {
    const requests: string[] = [];
    await installMockApi(page, roleCases[0], requests, { cupError: true });
    await page.goto(`${ownerOperationsPath}?tab=brewing&${fixedDates}`);
    await expect(page.getByRole("tab", { name: "Pha chế", exact: true })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: /không|unavailable|thử lại/i }).first()).toBeVisible();
    await expect(page.getByText("0", { exact: true })).toHaveCount(0);
    expect(requests.some((path) => path.startsWith("/dashboard/overview?"))).toBe(false);
    expect(requests.some((path) => path.includes("/points"))).toBe(false);
  });
});
