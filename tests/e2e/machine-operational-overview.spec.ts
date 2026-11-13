import { expect, test, type Page } from "@playwright/test";
import { clickPageAction, expectPageAction } from "./page-actions-test-helpers";

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

test("Admin empty production keeps zero bars finite and history details compact", async ({ page, context }) => {
  await context.addCookies([{ name: "access_token", value: tokenFor("admin"), domain: "127.0.0.1", path: "/" }]);
  const requests: string[] = [];
  await installMockApi(page, roleCases[1], requests);
  await page.route(`**/api/dolores/v1/machines/${machineId}/brew-records?**`, (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ content: [], number: 0, size: 100, totalElements: 0, totalPages: 0, first: true, last: true }),
  }));
  await page.goto(`${roleCases[1].operationsPath}?tab=production&fromDate=2026-11-01&toDate=2026-11-07`);
  await expect(page.getByText("Ly ghi nhận trong kỳ", { exact: true })).toBeVisible();
  await page.getByLabel("Loại biểu đồ sản lượng").selectOption("bar");
  const bars = page.getByLabel("Biểu đồ lần pha theo ngày").locator("span");
  await expect(bars).toHaveCount(7);
  expect(await bars.evaluateAll((nodes) => nodes.every((node) => (node as HTMLElement).style.height === "0%"))).toBe(true);
  await page.getByRole("tab", { name: "Vệ sinh", exact: true }).click();
  await page.getByRole("button", { name: "Xem chi tiết", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByText("Đường cà phê", { exact: true })).toBeVisible();
  expect(requests.some((path) => path.includes("cleaning-records") && path.includes("size=10"))).toBe(true);
});

function tokenFor(role: string, subject = ownerId) {
  const claims = Buffer.from(JSON.stringify({ sub: subject, roles: [role] })).toString("base64url");
  return `header.${claims}.signature`;
}

async function installMockApi(page: Page, role: RoleCase, requests: string[], options: { cleaningPages?: boolean; cupError?: boolean; machineHistoryPages?: boolean } = {}) {
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
    } else if (path === `/machines/${machineId}/cleaning-compliance`) {
      const days = Number(url.searchParams.get("days") ?? 30);
      body = { machine_id: machineId, evaluated_days: days, compliant_days: days,
        missing_startup_days: 0, missing_closing_days: 0, compliance_percentage: 100, flagged_dates: [] };
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
    } else if (path === `/machines/${machineId}/brew-records` || path === `/machines/${machineId}/cleaning-records`) {
      const number = Number(url.searchParams.get("page") ?? 0), size = Number(url.searchParams.get("size") ?? 20);
      const totalElements = options.machineHistoryPages ? 101 : 1;
      const timestamp = new Date(Date.parse(url.searchParams.get("from")!) + 60_000).toISOString();
      const content = Array.from({ length: Math.max(0, Math.min(size, totalElements - number * size)) }, (_, offset) => {
        const index = number * size + offset;
        const base = { id: `f2000000-0000-4000-8000-${String(index).padStart(12, "0")}`, eventId: `f3000000-0000-4000-8000-${String(index).padStart(12, "0")}`, machineId, machineSerialNumber: machine.serialNumber };
        return path.endsWith("cleaning-records")
          ? { ...base, cleaningType: "CLOSING", startedAt: timestamp, finishedAt: null,
            coffeeCleaned: true, milkCleaned: false, heatingCompleted: true, groupheadPurged: true,
            status: "ABORTED", notes: "Đã dừng chu trình vệ sinh" }
          : { ...base, recipeName: index === 100 ? "Latte" : "Espresso", brewedAt: timestamp, receivedAt: null };
      });
      body = { content, number, size, totalElements, totalPages: Math.ceil(totalElements / size), first: number === 0, last: (number + 1) * size >= totalElements };
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
        if (role.claim === "owner") await expectPageAction(page, "machine-operational-overview");
        else await expect(operationsLink).toBeVisible();
        await expectNoHorizontalOverflow(page, width, `${role.label} machine detail`);

        if (role.claim === "owner") await clickPageAction(page, "machine-operational-overview");
        else await operationsLink.click();
        await expect(page).toHaveURL(new RegExp(`${role.operationsPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
        await expect(page.locator("#machine-operational-overview-title")).toBeVisible();
        if (role.claim === "owner") await expect(page.getByText("18", { exact: true }).first()).toBeVisible();
        else await expect(page.getByRole("heading", { name: role.claim === "admin" ? "Kết nối & sức khỏe máy" : "Rà soát mất kết nối", exact: true })).toBeVisible();
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
      } else if (role.claim === "moderator") {
        expect(requests.some((request) => request.includes("/heartbeats/latest"))).toBe(false);
        await page.goto(`${role.operationsPath}?tab=connection`);
        await expect(page.getByRole("heading", { name: "Kết nối & sức khỏe máy", exact: true })).toBeVisible();
        await expect.poll(() => requests.some((request) => request.includes("/heartbeats/latest"))).toBe(true);
      }
      const heartbeatRequested = requests.some((request) => request.includes("/heartbeats/latest"));
      expect(heartbeatRequested).toBe(true);
      if (role.claim === "owner") {
        const cupRequest = requests.find((request) => request.startsWith("/owner/cup-count?"));
        expect(cupRequest).toBeTruthy();
        expect(new URLSearchParams(cupRequest!.split("?", 2)[1]).has("ownerId")).toBe(false);
      } else {
        expect(requests.some((request) => request.startsWith("/dashboard/overview?") || request.startsWith("/owner/"))).toBe(false);
      }

      const pointsRequested = requests.some((request) => request.includes("/telemetry-query/machines/") && request.split("?", 1)[0].endsWith("/points"));
      expect(pointsRequested).toBe(role.pointsAllowed);
      if (role.claim === "owner") expect(requests.some((request) => request.startsWith("/dashboard/overview?"))).toBe(false);
      if (role.claim === "owner") {
        expect(requests.some((request) => request.split("?", 1)[0] === "/contracts")).toBe(false);
        expect(requests.some((request) => request.startsWith(`/contracts/machine/${machineId}/history?status=ACTIVE`))).toBe(true);
      }
      await page.goto(role.operationsPath);
      await expect(page.locator("#period-finances-title")).toHaveCount(0);
    });
  }
});

const ownerOperationsPath = `/dashboard/machines/${machineId}/operations`;

test("Owner separates production, brew history and technical data without cross-loading APIs", async ({ page, context }) => {
  await context.addCookies([{ name: "access_token", value: tokenFor("owner"), domain: "127.0.0.1", path: "/" }]);
  const requests: string[] = [];
  await installMockApi(page, roleCases[0], requests);
  await page.goto(`${ownerOperationsPath}?tab=brewing&${fixedDates}`);
  await expect(page.getByRole("heading", { name: "Số ly theo ngày", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Số ly theo món", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lịch sử pha chế", exact: true })).toHaveCount(0);
  expect(requests.some((url) => url.startsWith("/owner/brew-records"))).toBe(false);
  await page.getByRole("tab", { name: "Lịch sử pha", exact: true }).click();
  await expect(page).toHaveURL(/tab=history/);
  await expect(page.getByRole("heading", { name: "Lịch sử pha chế", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Món", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Số ly theo ngày", exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("tab", { name: "Lịch sử pha", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Thông số kỹ thuật", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Thông số kỹ thuật", exact: true })).toBeVisible();
});

test("Technical selector labels operating measurements and groups raw sensors as advanced", async ({ page, context }) => {
  await context.addCookies([{ name: "access_token", value: tokenFor("admin"), domain: "127.0.0.1", path: "/" }]);
  await installMockApi(page, roleCases[1], []);
  await page.route("**/api/dolores/v1/telemetry-query/**/points?**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([
    { machineId, timestamp: "2026-11-06T01:00:00Z", field: "ads1115_ain0", value: 1000 },
    { machineId, timestamp: "2026-11-06T01:00:00Z", field: "boiler_c", value: 93 },
    { machineId, timestamp: "2026-11-06T01:00:00Z", field: "total_volume_out_ml", value: 500 },
  ]) }));
  await page.goto(roleCases[1].operationsPath);
  const selector = page.getByLabel("Thông số đang xem");
  await expect(selector).toHaveValue("boiler_c");
  await expect(selector.locator('option[value="boiler_c"]')).toHaveText("Nhiệt độ nồi hơi (°C)");
  await expect(selector.locator('optgroup[label="Nâng cao — cảm biến & điều khiển"] option')).toHaveCount(1);
  await selector.selectOption("ads1115_ain0");
  await expect(page.getByText("Dùng để chẩn đoán kỹ thuật", { exact: false })).toBeVisible();
  await selector.selectOption("total_volume_out_ml");
  await expect(page.getByText("Thể tích nước không phải số ly pha chế.", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page, 390, "technical selector");
});

test("Admin telemetry chart and table preserve numeric scale, text records and URL field selection", async ({ page, context }) => {
  await context.addCookies([{ name: "access_token", value: tokenFor("admin"), domain: "127.0.0.1", path: "/" }]);
  const requests: string[] = [];
  await installMockApi(page, roleCases[1], requests);
  await page.route("**/api/dolores/v1/telemetry-query/**/points?**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([
    { machineId, timestamp: "2026-11-06T01:00:00Z", field: "temperature", value: 80 },
    { machineId, timestamp: "2026-11-06T01:10:00Z", field: "temperature", value: 95 },
    { machineId, timestamp: "2026-11-06T01:11:00Z", field: "mode", value: "BREWING" },
  ]) }));
  await page.goto(`${roleCases[1].operationsPath}?field=temperature`);
  await expect(page.getByRole("img", { name: "Biểu đồ temperature theo thời gian" })).toBeVisible();
  await expect(page.getByText("95", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Bảng dữ liệu", exact: true }).click();
  await expect(page.getByRole("cell", { name: "80", exact: true })).toBeVisible();
  await page.getByLabel("Thông số đang xem").selectOption("mode");
  await expect(page).toHaveURL(/field=mode/);
  await expect(page.getByRole("cell", { name: "BREWING", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Biểu đồ", exact: true }).click();
  await expect(page.getByText("Thông số này không phải dữ liệu số.", { exact: false })).toBeVisible();
  expect(requests.some((path) => path.startsWith("/dashboard/overview") || path.startsWith("/owner/"))).toBe(false);
});

for (const role of roleCases.filter((item) => item.claim !== "owner")) {
  test(`${role.label} monitoring directory opens the selected machine without aggregate metrics`, async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor(role.claim), domain: "127.0.0.1", path: "/" }]);
    const requests: string[] = [];
    await installMockApi(page, role, requests);
    await page.goto(`/${role.claim}/iot`);
    await expect(page.getByRole("heading", { name: "Giám sát máy", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Xem vận hành", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${role.operationsPath}$`));
    await expect(page.locator("#machine-operational-overview-title")).toHaveText("Giám sát vận hành");
    expect(requests.some((path) => path.startsWith("/dashboard/overview") || path.startsWith("/owner/"))).toBe(false);
    if (role.claim === "moderator") expect(requests.some((path) => path.includes("/heartbeats/latest") || path.includes("/points"))).toBe(false);
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Giám sát máy", exact: true })).toBeVisible();
  });
}
const fixedDates = "fromDate=2026-11-06&toDate=2026-11-06";

test.describe("operator machine-scoped records", () => {
  for (const role of roleCases.filter((item) => item.claim !== "owner")) {
    test(`${role.label} reads brew and cleaning histories without Owner Analytics and preserves URLs`, async ({ page, context }) => {
      await context.addCookies([{ name: "access_token", value: tokenFor(role.claim), domain: "127.0.0.1", path: "/" }]);
      const requests: string[] = [];
      await installMockApi(page, role, requests, { machineHistoryPages: true });
      await page.goto(`${role.operationsPath}?tab=history&${fixedDates}&keep=existing`);
      await expect(page.getByRole("heading", { name: "Lịch sử từng lần pha", exact: true })).toBeVisible();
      await expect(page.getByRole("cell", { name: "Espresso", exact: true }).first()).toBeVisible();
      const brewRequest = requests.find((path) => path.startsWith(`/machines/${machineId}/brew-records?`));
      expect(brewRequest).toBeTruthy();
      const params = new URLSearchParams(brewRequest!.split("?", 2)[1]);
      expect(Date.parse(params.get("from")!)).toBe(Date.parse("2026-11-05T17:00:00Z"));
      expect(Date.parse(params.get("to")!)).toBe(Date.parse("2026-11-06T17:00:00Z"));
      expect(params.get("sort")).toBe("brewedAt,desc");
      expect(params.has("ownerId")).toBe(false);
      expect(requests.some((path) => path.includes("/cleaning-records?") || path.startsWith("/owner/"))).toBe(false);
      await page.getByRole("button", { name: "Trang sau", exact: true }).click();
      await expect(page).toHaveURL(/recordPage=1/);
      await expect.poll(() => requests.some((path) => path.includes("/brew-records?") && new URLSearchParams(path.split("?", 2)[1]).get("page") === "1")).toBe(true);
      await page.reload();
      await expect(page.getByRole("tab", { name: "Lịch sử pha", exact: true })).toHaveAttribute("aria-selected", "true");
      await page.getByRole("tab", { name: "Vệ sinh", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Lịch sử vệ sinh", exact: true })).toBeVisible();
      await expect(page.getByRole("cell", { name: "Cuối ngày", exact: true }).first()).toBeVisible();
      await expect(page.getByRole("cell", { name: "Bị gián đoạn", exact: true }).first()).toBeVisible();
      await page.locator("summary").filter({ hasText: "Xem nội dung" }).first().click();
      await expect(page.getByText("Đã dừng chu trình vệ sinh", { exact: true }).first()).toBeVisible();
      await expect(page).not.toHaveURL(/recordPage=/);
      await expect(page).toHaveURL(/keep=existing/);
      const cleaningRequest = requests.find((path) => path.includes(`/machines/${machineId}/cleaning-records?`));
      expect(new URLSearchParams(cleaningRequest!.split("?", 2)[1]).get("sort")).toBe("startedAt,desc");
      await page.goBack();
      await expect(page.getByRole("tab", { name: "Lịch sử pha", exact: true })).toHaveAttribute("aria-selected", "true");
      await page.setViewportSize({ width: 390, height: 844 });
      await expectNoHorizontalOverflow(page, 390, `${role.label} brew history`);
      expect(requests.some((path) => path.startsWith("/owner/"))).toBe(false);
    });

    test(`${role.label} production explicitly loads remaining records before complete recipe statistics`, async ({ page, context }) => {
      await context.addCookies([{ name: "access_token", value: tokenFor(role.claim), domain: "127.0.0.1", path: "/" }]);
      const requests: string[] = [];
      await installMockApi(page, role, requests, { machineHistoryPages: true });
      await page.goto(`${role.operationsPath}?tab=production&${fixedDates}`);
      await expect(page.getByRole("heading", { name: "Lần pha theo ngày", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Lần pha theo món", exact: true })).toBeVisible();
      await expect(page.getByText(/100\s*\/\s*101/)).toBeVisible();
      expect(requests.filter((path) => path.includes("/brew-records?")).length).toBe(1);
      await expect(page.getByText("Latte", { exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: "Tải thêm dữ liệu biểu đồ", exact: true }).click();
      await expect(page.getByText("Latte", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Tải thêm dữ liệu biểu đồ", exact: true })).toHaveCount(0);
      expect(requests.filter((path) => path.includes("/brew-records?")).length).toBe(2);
      expect(requests.some((path) => path.startsWith("/owner/") || path.includes("/points?"))).toBe(false);
      await page.setViewportSize({ width: 390, height: 844 });
      await expectNoHorizontalOverflow(page, 390, `${role.label} production`);
    });
  }

  test("history 404 and production 503 show errors without invented zero statistics", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("admin"), domain: "127.0.0.1", path: "/" }]);
    await installMockApi(page, roleCases[1], []);
    let status = 404;
    await page.route("**/api/dolores/v1/machines/*/brew-records?**", async (route) => route.fulfill({
      status, contentType: "application/json", body: JSON.stringify({ message: "Unavailable" }),
    }));
    await page.goto(`${roleCases[1].operationsPath}?tab=history&${fixedDates}`);
    await expect(page.getByRole("alert").filter({ hasText: /không tìm thấy|Không tìm thấy/ }).first()).toBeVisible();
    await expect(page.getByRole("cell", { name: "Espresso", exact: true })).toHaveCount(0);
    status = 503;
    await page.getByRole("tab", { name: "Sản lượng", exact: true }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lần pha theo ngày", exact: true })).toHaveCount(0);
    await expect(page.getByText("0", { exact: true })).toHaveCount(0);
  });

  test("invalid history filters and denied machine lookup prevent scoped history requests", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("moderator"), domain: "127.0.0.1", path: "/" }]);
    const requests: string[] = [];
    await installMockApi(page, roleCases[2], requests);
    for (const suffix of ["fromDate=2026-02-30&toDate=2026-03-01", `${fixedDates}&recordPage=-1`]) {
      await page.goto(`${roleCases[2].operationsPath}?tab=history&${suffix}`);
      await expect(page.getByRole("alert").first()).toBeVisible();
      expect(requests.some((path) => path.includes("/brew-records?") || path.includes("/cleaning-records?"))).toBe(false);
    }
    await page.route(`**/api/dolores/v1/machines/${machineId}`, async (route) => route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ message: "Not found" }) }));
    await page.goto(`${roleCases[2].operationsPath}?tab=history&${fixedDates}`);
    await expect(page.getByRole("alert").first()).toBeVisible();
    expect(requests.some((path) => path.includes("/brew-records?") || path.includes("/cleaning-records?"))).toBe(false);
  });
});

const offlineReviewId = "f3000000-0000-4000-8000-000000000001";
const offlineReview = {
  id: offlineReviewId, ownerId, contractId: "f1000000-0000-4000-8000-000000000005", machineId,
  policyVersionId: "f3000000-0000-4000-8000-000000000002", policyVersion: 1, offlineLimitMinutes: 60,
  status: "REVIEW_REQUIRED", source: "VALKEY_HEARTBEAT_TTL",
  detectedAt: "2026-11-06T08:30:00", lastObservedAt: "2026-11-06T09:40:00", observedOfflineSince: "2026-11-06T08:30:00",
  observedOfflineUntil: null, reviewRequiredAt: "2026-11-06T09:30:00", decision: null, reviewerId: null,
  reviewerRole: null, decisionReason: null, evidenceReferences: null, decidedAt: null,
};

async function mockEmptyEvidence(page: Page) {
  await page.route(/\/api\/dolores\/v1\/.+\/evidence(\?.*)?$/, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], page: 0, size: 20, hasNext: false }) });
  });
}

async function installOfflineMock(page: Page, requests: string[], conflict = false) {
  let current: Record<string, unknown> = { ...offlineReview };
  const posts: unknown[] = [];
  await page.route("**/api/dolores/v1/offline-violation-reviews**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api\/dolores\/v1/, "");
    requests.push(`${route.request().method()} ${path}${url.search}`);
    if (route.request().method() === "POST") {
      const request = route.request();
      expect(request.headers()["content-type"]).toContain("multipart/form-data");
      const raw = request.postDataBuffer()?.toString() ?? "";
      expect(raw).toContain('name="data"');
      expect(raw).toContain('name="files"');
      const input = JSON.parse(raw.match(/name="data"[^\r]*\r\n(?:[^\r\n]+\r\n)*\r\n([^\r]+)/)?.[1] ?? "{}");
      posts.push(input);
      if (conflict) {
        await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ message: "Review changed. Refresh and retry." }) });
        return;
      }
      current = { ...current, ...input, status: "REVIEWED", decisionReason: input.reason,
        reviewerId: ownerId, reviewerRole: "MODERATOR", decidedAt: "2026-11-06T10:00:00" };
    }
    const list = path === "/offline-violation-reviews";
    const headers: Record<string, string> = list ? { "X-Page": url.searchParams.get("page") ?? "0", "X-Page-Size": url.searchParams.get("size") ?? "50", "X-Has-Next": "false" } : {};
    await route.fulfill({ status: 200, contentType: "application/json", headers, body: JSON.stringify(list ? [current] : current) });
  });
  await mockEmptyEvidence(page);
  return posts;
}

test.describe("Offline review role workflow", () => {
  test("Owner opens a scoped review from the URL, refreshes and remains read only", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("owner"), domain: "127.0.0.1", path: "/" }]);
    const requests: string[] = [];
    await installMockApi(page, roleCases[0], requests);
    const posts = await installOfflineMock(page, requests);
    await page.goto(`${ownerOperationsPath}?tab=connection&reviewId=${offlineReviewId}&keep=existing`);
    const panel = page.getByRole("region", { name: "Rà soát mất kết nối", exact: true });
    await expect(panel.getByRole("heading", { name: "Chi tiết rà soát" })).toBeVisible();
    await expect(panel.getByText("08:30:00 06/11/2026", { exact: true }).first()).toBeVisible();
    await expect(panel.locator('[name="reason"]')).toHaveCount(0);
    await panel.getByLabel("Trạng thái rà soát").selectOption("REVIEW_REQUIRED");
    await expect(page).toHaveURL(/reviewStatus=REVIEW_REQUIRED/);
    await panel.getByRole("button", { name: "Xem hồ sơ" }).click();
    await page.reload();
    await expect(panel.getByRole("heading", { name: "Chi tiết rà soát" })).toBeVisible();
    expect(new URL(page.url()).searchParams.get("keep")).toBe("existing");
    expect(requests.some((path) => path.includes(`/offline-violation-reviews?machineId=${machineId}`))).toBe(true);
    expect(posts).toHaveLength(0);
  });

  for (const conflict of [false, true]) {
    test(`Moderator confirms a decision with one POST${conflict ? " and keeps the draft on conflict" : ""}`, async ({ page, context }) => {
      await context.addCookies([{ name: "access_token", value: tokenFor("moderator"), domain: "127.0.0.1", path: "/" }]);
      const requests: string[] = [];
      await installMockApi(page, roleCases[2], requests);
      const posts = await installOfflineMock(page, requests, conflict);
      await page.goto(`/moderator/iot?machineId=${machineId}&reviewId=${offlineReviewId}`);
      const panel = page.getByRole("region", { name: "Rà soát mất kết nối", exact: true });
      await panel.getByLabel("Lý do rà soát").fill("Liên hệ cửa hàng kiểm tra kết nối");
      await expect(page.getByRole("button", { name: "Tiếp tục xác nhận" })).toBeDisabled();
      await panel.locator('input[name="evidenceFiles"]').setInputFiles({ name: "evidence.pdf", mimeType: "application/pdf", buffer: Buffer.from("evidence-data") });
      await expect(panel.getByText("evidence.pdf")).toBeVisible();
      await page.getByRole("button", { name: "Tiếp tục xác nhận" }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Xác nhận kết quả", exact: true }).click();
      await expect.poll(() => posts.length).toBe(1);
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
      if (conflict) {
        await expect(panel.getByLabel("Lý do rà soát")).toHaveValue("Liên hệ cửa hàng kiểm tra kết nối");
        await expect(panel.getByRole("alert")).toBeVisible();
      } else {
        await expect(panel.getByRole("cell", { name: "Đã rà soát", exact: true }).first()).toBeVisible();
        await expect(panel.locator('[name="reason"]')).toHaveCount(0);
      }
      expect(requests.some((path) => path.includes("/heartbeats/latest") || path.includes("/points"))).toBe(false);
      const postIndex = requests.findIndex((path) => path.startsWith("POST /offline-violation-reviews/"));
      expect(requests.slice(0, postIndex).filter((path) => path === `GET /offline-violation-reviews/${offlineReviewId}`).length).toBeGreaterThanOrEqual(2);
    });
  }
  test("Admin can open the selected review and receives the operator form", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("admin"), domain: "127.0.0.1", path: "/" }]);
    const requests: string[] = [];
    await installMockApi(page, roleCases[1], requests);
    await installOfflineMock(page, requests);
    await page.goto(`/admin/iot?machineId=${machineId}&reviewId=${offlineReviewId}`);
    const panel = page.getByRole("region", { name: "Rà soát mất kết nối", exact: true });
    await expect(panel.getByLabel("Lý do rà soát")).toBeVisible();
    await panel.getByLabel("Trạng thái rà soát").selectOption("REVIEW_REQUIRED");
    await expect(page).toHaveURL(/reviewStatus=REVIEW_REQUIRED/);
    await page.goBack();
    await expect(panel.getByLabel("Lý do rà soát")).toBeVisible();
  });
});

test.describe("Owner operations analytics and cleaning", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("owner"), domain: "127.0.0.1", path: "/" }]);
  });

  test("Owner operations preserves machine filters, tabs, refresh and browser history in the URL", async ({ page }) => {
    const requests: string[] = [];
    await installMockApi(page, roleCases[0], requests);
    await page.goto(`${ownerOperationsPath}?tab=brewing&${fixedDates}&brewPage=2&keep=existing`);
    await expect(page.locator("#machine-operational-overview-title")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Sản lượng", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect.poll(() => requests.some((path) => path.startsWith("/owner/cup-count?"))).toBe(true);
    const cupRequest = new URLSearchParams(requests.find((path) => path.startsWith("/owner/cup-count?"))!.split("?", 2)[1]);
    expect(cupRequest.get("machineId")).toBe(machineId);
    expect(Date.parse(cupRequest.get("from")!)).toBe(Date.parse("2026-11-05T17:00:00Z"));
    expect(Date.parse(cupRequest.get("to")!)).toBe(Date.parse("2026-11-06T17:00:00Z"));
    expect(cupRequest.has("ownerId")).toBe(false);
    await page.getByRole("tab", { name: "Lịch sử pha", exact: true }).click();
    await page.locator("details").filter({ has: page.locator("form") }).locator("summary").click();
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
    await expect(page.getByRole("tab", { name: "Lịch sử pha", exact: true })).toHaveAttribute("aria-selected", "true");
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
    await page.locator("details").filter({ has: page.locator("form") }).locator("summary").click();
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
    await expect(page.getByRole("tab", { name: "Sản lượng", exact: true })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: /không|unavailable|thử lại/i }).first()).toBeVisible();
    await expect(page.getByText("0", { exact: true })).toHaveCount(0);
    expect(requests.some((path) => path.startsWith("/dashboard/overview?"))).toBe(false);
    expect(requests.some((path) => path.includes("/points"))).toBe(false);
  });
});

test.describe("Cleaning telemetry Phase 04 safeguards", () => {
  test("changing Owner while an old history read is pending never displays the old Owner data", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("owner"), domain: "127.0.0.1", path: "/" }]);
    const requests: string[] = [];
    await installMockApi(page, roleCases[0], requests);
    let releaseOld: () => void = () => {};
    const oldGate = new Promise<void>((resolve) => { releaseOld = resolve; });
    let oldStarted = false, oldSettled = false, switched = false;
    await page.route(`**/api/dolores/v1/machines/${machineId}`, async (route) => {
      await route.fulfill({ status: switched ? 403 : 200, contentType: "application/json", body: JSON.stringify(switched ? { message: "Forbidden" } : machine) });
    });
    await page.route("**/api/dolores/v1/owner/brew-records?**", async (route) => {
      oldStarted = true;
      await oldGate;
      const url = new URL(route.request().url());
      const from = url.searchParams.get("from")!;
      const body = { content: [{ id: offlineReviewId, eventId: offlineReviewId, machineId, machineSerialNumber: machine.serialNumber, recipeName: "PRIVATE_OWNER_A_RECIPE", brewedAt: new Date(Date.parse(from) + 60_000).toISOString(), receivedAt: null }], page: 0, size: 20, totalElements: 1, totalPages: 1, first: true, last: true };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) }).catch(() => {});
      oldSettled = true;
    });
    await page.goto(`${ownerOperationsPath}?tab=history&${fixedDates}`);
    await expect.poll(() => oldStarted).toBe(true);
    switched = true;
    await context.addCookies([{ name: "access_token", value: tokenFor("owner", "f4000000-0000-4000-8000-000000000001"), domain: "127.0.0.1", path: "/" }]);
    await page.evaluate((url) => (window as unknown as { next: { router: { push: (path: string) => Promise<boolean> } } }).next.router.push(url), `${ownerOperationsPath}?tab=history&${fixedDates}&account=second`);
    await expect(page.getByRole("alert").filter({ hasText: /không có quyền/ }).first()).toBeVisible();
    releaseOld();
    await expect.poll(() => oldSettled).toBe(true);
    await expect(page.getByText("PRIVATE_OWNER_A_RECIPE", { exact: true })).toHaveCount(0);
    await expect(page.getByText("18", { exact: true })).toHaveCount(0);
  });

  test("invalid Owner URL filters stop feature reads before a request is sent", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("owner"), domain: "127.0.0.1", path: "/" }]);
    const requests: string[] = [];
    await installMockApi(page, roleCases[0], requests);
    for (const query of ["tab=unknown", "tab=cleaning&fromDate=2026-02-30&toDate=2026-03-01", "tab=connection&telemetryFrom=2026-11-06T10:00:00Z&telemetryTo=2026-11-06T09:00:00Z"]) {
      requests.length = 0;
      await page.goto(`${ownerOperationsPath}?${query}`);
      await expect(page.getByRole("alert").filter({ hasText: "bộ lọc không hợp lệ" })).toBeVisible();
      expect(requests.some((path) => path.startsWith("/owner/") || path.includes("/heartbeats/latest") || path.includes("/points") || path.startsWith("/offline-violation-reviews"))).toBe(false);
    }
  });

  test("switching machines while history is pending never renders the previous machine records", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("owner"), domain: "127.0.0.1", path: "/" }]);
    const requests: string[] = [];
    await installMockApi(page, roleCases[0], requests);
    const nextMachine = { ...machine, id: "f6000000-0000-4000-8000-000000000002", serialNumber: "E2E-IOT-02" };
    await page.route(`**/api/dolores/v1/machines/${nextMachine.id}`, async (route) => { await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(nextMachine) }); });
    await page.route(`**/api/dolores/v1/contracts/machine/${nextMachine.id}/history?**`, async (route) => { await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: offlineReviewId, ownerId, machineId: nextMachine.id, status: "ACTIVE", startDate: "2026-01-01", endDate: "2027-01-01" }]) }); });
    await page.route("**/api/dolores/v1/owner/cup-count?**", async (route) => {
      const url = new URL(route.request().url()), current = url.searchParams.get("machineId") === nextMachine.id ? nextMachine : machine;
      const cups = current.id === nextMachine.id ? 37 : 18;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ownerId, from: url.searchParams.get("from"), to: url.searchParams.get("to"), totalCups: cups, activeMachineCount: 1, machineBreakdown: [{ machineSerialNumber: current.serialNumber, cups }], dailyBreakdown: [], recipeBreakdown: [] }) });
    });
    let releaseOld: () => void = () => {};
    const oldGate = new Promise<void>((resolve) => { releaseOld = resolve; });
    let oldStarted = false, oldSettled = false;
    await page.route("**/api/dolores/v1/owner/brew-records?**", async (route) => {
      const url = new URL(route.request().url()), current = url.searchParams.get("machineId") === nextMachine.id ? nextMachine : machine;
      const isOld = current.id === machineId;
      if (isOld) { oldStarted = true; await oldGate; }
      const record = { id: offlineReviewId, eventId: offlineReviewId, machineId: current.id, machineSerialNumber: current.serialNumber, recipeName: isOld ? "STALE_MACHINE_RECIPE" : "NEW_MACHINE_RECIPE", brewedAt: new Date(Date.parse(url.searchParams.get("from")!) + 60_000).toISOString(), receivedAt: null };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ content: [record], page: 0, size: 20, totalElements: 1, totalPages: 1, first: true, last: true }) }).catch(() => {});
      if (isOld) oldSettled = true;
    });
    await page.goto(`${ownerOperationsPath}?tab=history&${fixedDates}`);
    await expect.poll(() => oldStarted).toBe(true);
    await page.evaluate((url) => (window as unknown as { next: { router: { push: (path: string) => Promise<boolean> } } }).next.router.push(url), `/dashboard/machines/${nextMachine.id}/operations?tab=history&${fixedDates}`);
    await expect(page.getByRole("cell", { name: "NEW_MACHINE_RECIPE", exact: true })).toBeVisible();
    releaseOld();
    await expect.poll(() => oldSettled).toBe(true);
    await expect(page.getByText("STALE_MACHINE_RECIPE", { exact: true })).toHaveCount(0);
    await expect(page.locator("header").getByText(nextMachine.serialNumber, { exact: true })).toBeVisible();
  });

  test("changing the date filter while history is pending keeps only the newly selected period", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("owner"), domain: "127.0.0.1", path: "/" }]);
    const requests: string[] = [];
    await installMockApi(page, roleCases[0], requests);
    let releaseOld: () => void = () => {};
    const oldGate = new Promise<void>((resolve) => { releaseOld = resolve; });
    let oldStarted = false, oldSettled = false;
    await page.route("**/api/dolores/v1/owner/brew-records?**", async (route) => {
      const url = new URL(route.request().url());
      const from = url.searchParams.get("from")!;
      const isOld = Date.parse(from) === Date.parse("2026-11-05T17:00:00Z");
      if (isOld) { oldStarted = true; await oldGate; }
      const record = { id: offlineReviewId, eventId: offlineReviewId, machineId, machineSerialNumber: machine.serialNumber, recipeName: isOld ? "STALE_PERIOD_RECIPE" : "FRESH_PERIOD_RECIPE", brewedAt: new Date(Date.parse(from) + 60_000).toISOString(), receivedAt: null };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ content: [record], page: 0, size: 20, totalElements: 1, totalPages: 1, first: true, last: true }) }).catch(() => {});
      if (isOld) oldSettled = true;
    });
    await page.goto(`${ownerOperationsPath}?tab=history&${fixedDates}`);
    await expect.poll(() => oldStarted).toBe(true);
    await page.getByLabel("Từ ngày", { exact: true }).fill("2026-11-07");
    await page.getByLabel("Đến ngày", { exact: true }).fill("2026-11-07");
    await page.getByRole("button", { name: "Áp dụng bộ lọc", exact: true }).click();
    await expect(page.getByRole("cell", { name: "FRESH_PERIOD_RECIPE", exact: true })).toBeVisible();
    releaseOld();
    await expect.poll(() => oldSettled).toBe(true);
    await expect(page.getByText("STALE_PERIOD_RECIPE", { exact: true })).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get("fromDate")).toBe("2026-11-07");
  });

  test("Technician monitoring waits for machine lookup and presents a denied grant without Owner or offline reads", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("technician"), domain: "127.0.0.1", path: "/" }]);
    const requests: string[] = [];
    await installMockApi(page, roleCases[0], requests);
    let releaseMachine: () => void = () => {};
    const machineGate = new Promise<void>((resolve) => { releaseMachine = resolve; });
    let machineStarted = false;
    await page.route(`**/api/dolores/v1/machines/${machineId}`, async (route) => { machineStarted = true; await machineGate; await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(machine) }); });
    await page.route("**/api/dolores/v1/telemetry-query/**", async (route) => { requests.push(new URL(route.request().url()).pathname); await route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message: "Grant expired" }) }); });
    await page.goto(`/technician/machine-check/${machineId}`);
    await expect.poll(() => machineStarted).toBe(true);
    expect(requests.some((path) => path.includes("/telemetry-query/"))).toBe(false);
    releaseMachine();
    await expect(page.getByRole("alert").filter({ hasText: /không có quyền/ }).first()).toBeVisible();
    await expect(page.getByText("Mất kết nối", { exact: true })).toHaveCount(0);
    expect(requests.some((path) => path.startsWith("/owner/") || path.includes("offline-violation-reviews"))).toBe(false);
    expect(requests.some((path) => path.includes("/cleaning-compliance"))).toBe(false);
  });

  test("rapid decision clicks and a timeout send one POST and preserve the draft for verification", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("moderator"), domain: "127.0.0.1", path: "/" }]);
    const requests: string[] = [];
    await installMockApi(page, roleCases[2], requests);
    await installOfflineMock(page, requests);
    let releasePost: () => void = () => {};
    const postGate = new Promise<void>((resolve) => { releasePost = resolve; });
    let posts = 0;
    await page.route("**/api/dolores/v1/offline-violation-reviews/*/decision", async (route) => { posts++; await postGate; await route.abort("timedout"); });
    await page.goto(`/moderator/iot?machineId=${machineId}&reviewId=${offlineReviewId}`);
    const panel = page.getByRole("region", { name: "Rà soát mất kết nối", exact: true });
    await panel.getByLabel("Lý do rà soát").fill("Kiểm tra sau khi mất mạng");
    await panel.locator('input[name="evidenceFiles"]').setInputFiles({ name: "evidence.pdf", mimeType: "application/pdf", buffer: Buffer.from("evidence-data") });
    await page.getByRole("button", { name: "Tiếp tục xác nhận" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Xác nhận kết quả", exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
    await expect.poll(() => posts).toBe(1);
    await expect(page.getByRole("alertdialog").getByRole("button", { name: "Đang ghi nhận…", exact: true })).toBeDisabled();
    releasePost();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(panel.getByRole("alert")).toBeVisible();
    await expect(panel.getByLabel("Lý do rà soát")).toHaveValue("Kiểm tra sau khi mất mạng");
    await expect(panel.getByText("evidence.pdf")).toBeVisible();
    expect(posts).toBe(1);
    expect(requests.some((path) => /billing|penalty|certificate|replay/.test(path))).toBe(false);
  });

  test("mobile review supports keyboard confirmation, Escape focus return and reduced motion without page overflow", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("moderator"), domain: "127.0.0.1", path: "/" }]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const requests: string[] = [];
    await installMockApi(page, roleCases[2], requests);
    const posts = await installOfflineMock(page, requests);
    await page.goto(`/moderator/iot?machineId=${machineId}&reviewId=${offlineReviewId}`);
    const panel = page.getByRole("region", { name: "Rà soát mất kết nối", exact: true });
    await panel.getByLabel("Lý do rà soát").fill("Kiểm tra mạng tại cửa hàng");
    await panel.locator('input[name="evidenceFiles"]').setInputFiles({ name: "evidence.pdf", mimeType: "application/pdf", buffer: Buffer.from("evidence-data") });
    const continueButton = page.getByRole("button", { name: "Tiếp tục xác nhận" });
    await continueButton.focus();
    await expect(continueButton).toBeFocused();
    await continueButton.press("Enter");
    await expect(page.getByRole("alertdialog")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(continueButton).toBeFocused();
    await expectNoHorizontalOverflow(page, 390, "Moderator offline review");
    expect(posts).toHaveLength(0);
  });

  test("telemetry 503 and cleaning timeout stay local and never become offline or zero cup data", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("owner"), domain: "127.0.0.1", path: "/" }]);
    const requests: string[] = [];
    await installMockApi(page, roleCases[0], requests);
    await installOfflineMock(page, requests);
    await page.route("**/api/dolores/v1/telemetry-query/**/points?**", async (route) => { await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Influx unavailable" }) }); });
    await page.route("**/api/dolores/v1/owner/cleaning-records?**", async (route) => { await route.abort("timedout"); });
    await page.goto(`${ownerOperationsPath}?tab=connection&${fixedDates}`);
    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page.getByText("Đang kết nối", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Mất kết nối", { exact: true })).toHaveCount(0);
    await page.getByRole("tab", { name: "Vệ sinh", exact: true }).click();
    await expect(page.locator('[aria-labelledby="owner-cleaning-history-title"]').getByRole("alert")).toBeVisible();
    await expect(page.getByText("Chưa có bản ghi vệ sinh trong khoảng đã chọn.", { exact: true })).toHaveCount(0);
    await page.getByRole("tab", { name: "Sản lượng", exact: true }).click();
    await expect(page.getByText("18", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("0", { exact: true })).toHaveCount(0);
  });

  for (const machineType of ["CONVENTIONAL", null]) {
    test(`${machineType ?? "unconfirmed"} machine never enables Owner telemetry or analytics`, async ({ page, context }) => {
      await context.addCookies([{ name: "access_token", value: tokenFor("owner"), domain: "127.0.0.1", path: "/" }]);
      const requests: string[] = [];
      await installMockApi(page, roleCases[0], requests);
      await page.route(`**/api/dolores/v1/machines/${machineId}`, async (route) => { await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...machine, machineType }) }); });
      await page.goto(`${ownerOperationsPath}?tab=connection&${fixedDates}`);
      await expect(page.getByText(machineType === "CONVENTIONAL" ? "Máy thường không có dữ liệu kết nối và thông số IoT." : "Chưa xác nhận loại máy để xem dữ liệu kết nối và thông số IoT.", { exact: true })).toBeVisible();
      await page.getByRole("tab", { name: "Sản lượng", exact: true }).click();
      await expect(page.getByText("Máy này chưa được xác nhận là Smart IoT để xem dữ liệu pha chế và vệ sinh.", { exact: true })).toBeVisible();
      expect(requests.some((path) => path.startsWith("/owner/") || path.includes("/heartbeats/latest") || path.includes("/points") || path.startsWith("/offline-violation-reviews"))).toBe(false);
    });
  }

  test("Admin inventory requests heartbeats only for visible Smart IoT rows in a hundred-machine list", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("admin"), domain: "127.0.0.1", path: "/" }]);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.clock.install();
    const requests: string[] = [];
    await installMockApi(page, roleCases[1], requests);
    const machines = Array.from({ length: 100 }, (_, index) => ({ ...machine, id: `f5000000-0000-4000-8000-${String(index).padStart(12, "0")}`, serialNumber: `VISIBLE-BUDGET-${String(index).padStart(3, "0")}` }));
    const heartbeatIds = new Set<string>();
    await page.route("**/api/dolores/v1/machines", async (route) => { await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(machines) }); });
    await page.route("**/api/dolores/v1/telemetry-query/**/heartbeats/latest", async (route) => {
      const id = new URL(route.request().url()).pathname.split("/").at(-3)!;
      heartbeatIds.add(id);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ machineId: id, status: "ONLINE" }) });
    });
    await page.goto("/admin/machines");
    await expect(page.getByRole("cell", { name: "VISIBLE-BUDGET-000", exact: true })).toBeVisible();
    await expect.poll(() => heartbeatIds.size).toBeGreaterThan(0);
    await page.clock.runFor(1_500);
    expect(heartbeatIds.size).toBeLessThan(20);
    const visibleIds = await page.locator("[data-machine-heartbeat-id]").evaluateAll((rows) => rows.filter((row) => { const bounds = row.getBoundingClientRect(); return bounds.bottom > 0 && bounds.top < window.innerHeight; }).map((row) => (row as HTMLElement).dataset.machineHeartbeatId));
    expect([...heartbeatIds].every((id) => visibleIds.includes(id))).toBe(true);
    expect(heartbeatIds.has(machines.at(-1)!.id)).toBe(false);
    expect(requests.some((path) => path.startsWith("/owner/"))).toBe(false);
  });

  test("Owner heartbeat polling pauses when hidden while cleaning is not polled with heartbeats", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("owner"), domain: "127.0.0.1", path: "/" }]);
    await page.clock.install();
    const requests: string[] = [];
    await installMockApi(page, roleCases[0], requests);
    await page.goto(`/dashboard/machines/${machineId}`);
    await expect(page.getByText("Đang kết nối", { exact: true }).first()).toBeVisible();
    await expect.poll(() => requests.filter((path) => path.startsWith("/owner/cleaning-records?")).length).toBeGreaterThan(0);
    const cleaningBefore = requests.filter((path) => path.startsWith("/owner/cleaning-records?")).length;
    const heartbeatCount = () => requests.filter((path) => path.includes("/heartbeats/latest")).length;
    const heartbeatsBefore = heartbeatCount();
    await page.clock.runFor(6_000);
    await expect.poll(heartbeatCount).toBeGreaterThan(heartbeatsBefore);
    expect(requests.filter((path) => path.startsWith("/owner/cleaning-records?")).length).toBe(cleaningBefore);
    await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }); document.dispatchEvent(new Event("visibilitychange")); });
    const hiddenCount = heartbeatCount();
    await page.clock.runFor(11_000);
    expect(heartbeatCount()).toBe(hiddenCount);
    expect(requests.filter((path) => path.startsWith("/owner/cleaning-records?")).length).toBe(cleaningBefore);
    await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" }); document.dispatchEvent(new Event("visibilitychange")); });
    await page.clock.runFor(6_000);
    await expect.poll(heartbeatCount).toBeGreaterThan(hiddenCount);
  });
});

test.describe("Machine provisioning Phase 01", () => {
  test("Owner SLA period is independent of history filters and defaults to thirty days", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("owner"), domain: "127.0.0.1", path: "/" }]);
    const requests: string[] = [];
    await installMockApi(page, roleCases[0], requests);
    await page.goto(`${ownerOperationsPath}?tab=cleaning&${fixedDates}`);
    const panel = page.getByRole("region", { name: "Tuân thủ vệ sinh", exact: true });
    await expect(panel.getByText("100%", { exact: true })).toBeVisible();
    const complianceRequests = () => requests.filter((path) => path.includes("/cleaning-compliance?"));
    expect(complianceRequests()).toHaveLength(1);
    const params = new URLSearchParams(complianceRequests()[0].split("?", 2)[1]);
    expect([...params.entries()]).toEqual([["days", "30"]]);
    await page.locator("details").filter({ has: page.locator("form") }).locator("summary").click();
    await page.getByLabel("Loại vệ sinh", { exact: true }).selectOption("CLOSING");
    await page.getByRole("button", { name: "Áp dụng bộ lọc", exact: true }).click();
    await expect.poll(() => requests.some((path) => path.startsWith("/owner/cleaning-records?") && path.includes("cleaningType=CLOSING"))).toBe(true);
    expect(complianceRequests()).toHaveLength(1);
    await panel.getByLabel("Khoảng đánh giá vệ sinh", { exact: true }).selectOption("7");
    await expect.poll(() => complianceRequests().some((path) => path.endsWith("days=7"))).toBe(true);
    expect(complianceRequests().every((path) => !/[?&](from|to|ownerId)=/.test(path))).toBe(true);
    await page.reload();
    await expect(panel.getByRole("heading", { name: "Tuân thủ vệ sinh", exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page, 1280, "Owner cleaning compliance");
  });

  test("Admin loads SLA only from the cleaning view without Owner Analytics calls", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("admin"), domain: "127.0.0.1", path: "/" }]);
    const requests: string[] = [];
    await installMockApi(page, roleCases[1], requests);
    await page.goto(roleCases[1].operationsPath);
    await expect(page.getByRole("heading", { name: "Kết nối & sức khỏe máy", exact: true })).toBeVisible();
    expect(requests.some((path) => path.includes("/cleaning-compliance"))).toBe(false);
    await page.getByRole("tab", { name: "Vệ sinh", exact: true }).click();
    const panel = page.getByRole("region", { name: "Tuân thủ vệ sinh", exact: true });
    await expect(panel.getByText("100%", { exact: true })).toBeVisible();
    await panel.getByLabel("Khoảng đánh giá vệ sinh", { exact: true }).selectOption("90");
    await expect.poll(() => requests.some((path) => path.includes("/cleaning-compliance?days=90"))).toBe(true);
    expect(requests.some((path) => path.startsWith("/owner/"))).toBe(false);
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page, 390, "Admin cleaning compliance");
  });

  test("Owner SLA displays actual zero and does not replace service failure with zero", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("owner"), domain: "127.0.0.1", path: "/" }]);
    const requests: string[] = [];
    await installMockApi(page, roleCases[0], requests);
    let unavailable = false;
    await page.route("**/api/dolores/v1/machines/*/cleaning-compliance?**", async (route) => {
      const days = Number(new URL(route.request().url()).searchParams.get("days") ?? 30);
      const body = unavailable ? { message: "Compliance unavailable" } : {
        machine_id: machineId, evaluated_days: days, compliant_days: 0,
        missing_startup_days: days, missing_closing_days: days, compliance_percentage: 0, flagged_dates: ["2026-11-06"],
      };
      await route.fulfill({ status: unavailable ? 503 : 200, contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.goto(`${ownerOperationsPath}?tab=cleaning&${fixedDates}`);
    const panel = page.getByRole("region", { name: "Tuân thủ vệ sinh", exact: true });
    await expect(panel.getByText("0%", { exact: true })).toBeVisible();
    unavailable = true;
    await panel.getByLabel("Khoảng đánh giá vệ sinh", { exact: true }).selectOption("7");
    await expect(panel.getByRole("alert")).toBeVisible();
    await expect(panel.getByText("0%", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Lịch sử vệ sinh", exact: true })).toBeVisible();
  });

  test("pending SLA from a previous Owner is never displayed after account change", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("owner"), domain: "127.0.0.1", path: "/" }]);
    const requests: string[] = [];
    await installMockApi(page, roleCases[0], requests);
    let releaseOld: () => void = () => {};
    const gate = new Promise<void>((resolve) => { releaseOld = resolve; });
    let started = false, settled = false, switched = false;
    await page.route(`**/api/dolores/v1/machines/${machineId}`, async (route) => {
      await route.fulfill({ status: switched ? 403 : 200, contentType: "application/json", body: JSON.stringify(switched ? { message: "Forbidden" } : machine) });
    });
    await page.route("**/api/dolores/v1/machines/*/cleaning-compliance?**", async (route) => {
      started = true;
      await gate;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        machine_id: machineId, evaluated_days: 30, compliant_days: 27,
        missing_startup_days: 2, missing_closing_days: 1, compliance_percentage: 90, flagged_dates: ["2026-10-01"],
      }) }).catch(() => {});
      settled = true;
    });
    await page.goto(`${ownerOperationsPath}?tab=cleaning&${fixedDates}`);
    await expect.poll(() => started).toBe(true);
    switched = true;
    await context.addCookies([{ name: "access_token", value: tokenFor("owner", "f4000000-0000-4000-8000-000000000001"), domain: "127.0.0.1", path: "/" }]);
    await page.evaluate((url) => (window as unknown as { next: { router: { push: (path: string) => Promise<boolean> } } }).next.router.push(url), `${ownerOperationsPath}?tab=cleaning&${fixedDates}&account=second`);
    await expect(page.getByRole("alert").filter({ hasText: /không có quyền/ }).first()).toBeVisible();
    releaseOld();
    await expect.poll(() => settled).toBe(true);
    await expect(page.getByRole("region", { name: "Tuân thủ vệ sinh", exact: true })).toHaveCount(0);
    await expect(page.getByText("90%", { exact: true })).toHaveCount(0);
  });

  test("Moderator polls heartbeat only in connection tab and pauses when hidden", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("moderator"), domain: "127.0.0.1", path: "/" }]);
    await page.clock.install();
    const requests: string[] = [];
    await installMockApi(page, roleCases[2], requests);
    await installOfflineMock(page, requests);
    await page.goto(`${roleCases[2].operationsPath}?tab=reviews&reviewId=${offlineReviewId}&keep=existing`);
    await expect(page.getByRole("heading", { name: "Chi tiết rà soát", exact: true })).toBeVisible();
    expect(requests.some((path) => path.includes("/heartbeats/latest"))).toBe(false);
    await page.getByRole("tab", { name: "Kết nối", exact: true }).click();
    await expect(page.getByText("Đang kết nối", { exact: true }).first()).toBeVisible();
    const heartbeatCount = () => requests.filter((path) => path.includes("/heartbeats/latest")).length;
    const initial = heartbeatCount();
    await page.clock.runFor(6_000);
    await expect.poll(heartbeatCount).toBeGreaterThan(initial);
    await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }); document.dispatchEvent(new Event("visibilitychange")); });
    const hidden = heartbeatCount();
    await page.clock.runFor(11_000);
    expect(heartbeatCount()).toBe(hidden);
    expect(requests.some((path) => path.includes("/points") || path.includes("/cleaning-compliance") || path.startsWith("/owner/"))).toBe(false);
    await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" }); document.dispatchEvent(new Event("visibilitychange")); });
    await page.getByRole("tab", { name: "Mất kết nối", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Chi tiết rà soát", exact: true })).toBeVisible();
    expect(new URL(page.url()).searchParams.get("keep")).toBe("existing");
    const reviewCount = heartbeatCount();
    await page.clock.runFor(6_000);
    expect(heartbeatCount()).toBe(reviewCount);
  });

  test("Moderator stops heartbeat polling after permission denial", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("moderator"), domain: "127.0.0.1", path: "/" }]);
    await page.clock.install();
    const requests: string[] = [];
    await installMockApi(page, roleCases[2], requests);
    let deniedCalls = 0;
    await page.route("**/api/dolores/v1/telemetry-query/**/heartbeats/latest", async (route) => {
      deniedCalls += 1;
      await route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message: "Grant expired" }) });
    });
    await page.goto(`${roleCases[2].operationsPath}?tab=connection`);
    await expect(page.getByRole("alert").filter({ hasText: /không có quyền/ })).toBeVisible();
    expect(deniedCalls).toBe(1);
    await page.clock.runFor(11_000);
    expect(deniedCalls).toBe(1);
  });
});
