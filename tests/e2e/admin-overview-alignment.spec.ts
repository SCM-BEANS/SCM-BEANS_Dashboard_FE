import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/dolores/v1/billing/invoices*", route => route.fulfill({ json: [] }));
  await page.route("**/api/dolores/v1/dashboard/action-items*", route => route.fulfill({ json: {
    items: [], page: 0, size: 20, hasMore: false, generatedAt: new Date().toISOString(),
    businessTimezone: "Asia/Ho_Chi_Minh", workflowAvailability: [],
  } }));
});

const overview = {
  scope: "PLATFORM",
  ownerId: null,
  asOfDate: "2026-10-29",
  usagePeriodStart: "2026-10-01",
  usagePeriodEnd: "2026-10-29",
  operationalMetrics: {
    totalOwners: 3,
    machinesByTypeAndStatus: { SMART_IOT: { DEPLOYED_CONTRACT_OWNER: 3, IN_WAREHOUSE: 2 } },
    cupsInSelectedPeriod: 12,
    dailyAcceptedCupUsage: [
      { date: "2026-10-28", cups: 0 },
      { date: "2026-10-29", cups: 12 },
    ],
    openMaintenanceTickets: 1,
    openInstallationWorkOrders: 2,
  },
  financialMetrics: [
    { currency: "VND", amountIssued: 0, amountCollected: 0, outstandingBalance: 0, overdueBalance: 0 },
  ],
  periodFinancialMetrics: [{ currency: "VND", amountIssuedInPeriod: 2500000, amountCollectedInPeriod: 1000000 }],
};

function dateAtBusinessZone(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  return new Date(Date.parse(`${today}T00:00:00Z`) + offsetDays * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
}

function dateInputValue(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

async function textCenterOffset(locator: import("@playwright/test").Locator) {
  return locator.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const text = range.getBoundingClientRect();
    const cell = element.getBoundingClientRect();
    return Math.abs((text.left + text.right) / 2 - (cell.left + cell.right) / 2);
  });
}

test("Admin daily cup values align with their column heading on mobile and desktop", async ({ page, context }) => {
  const payload = Buffer.from(JSON.stringify({ roles: ["admin"] })).toString("base64url");
  await context.addCookies([{
    name: "access_token",
    value: `header.${payload}.signature`,
    domain: "127.0.0.1",
    path: "/",
  }]);
  await page.route("**/api/dolores/v1/dashboard/overview*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(overview) }),
  );

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/admin");

  await page.getByText("Xem số liệu theo ngày", { exact: true }).click();
  await expect(page.getByRole("img", { name: "3 trên 5 máy đang cho thuê" })).toBeVisible();

  const heading = page.getByRole("columnheader", { name: "Số ly hợp lệ" });
  await expect(heading).toBeVisible();
  const dailyTable = page.locator("table").filter({ has: heading });
  const cupCells = dailyTable.locator("tbody tr td:nth-child(2)");
  await expect(cupCells).toHaveText(["0", "12"]);

  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(heading).toHaveCSS("text-align", "center");
    await expect(cupCells.first()).toHaveCSS("text-align", "center");
    await expect(cupCells.last()).toHaveCSS("text-align", "center");
    expect(await textCenterOffset(heading)).toBeLessThan(2);
    expect(await textCenterOffset(cupCells.first())).toBeLessThan(2);
    expect(await textCenterOffset(cupCells.last())).toBeLessThan(2);
  }
});

test("Admin can filter accepted cups without the retired reports link", async ({ page, context }) => {
  const payload = Buffer.from(JSON.stringify({ roles: ["admin"] })).toString("base64url");
  await context.addCookies([{
    name: "access_token",
    value: `header.${payload}.signature`,
    domain: "127.0.0.1",
    path: "/",
  }]);

  const requestedRanges: string[] = [];
  await page.route("**/api/dolores/v1/dashboard/overview*", (route) => {
    const url = new URL(route.request().url());
    const fromDate = url.searchParams.get("fromDate") ?? "2026-10-28";
    const toDate = url.searchParams.get("toDate") ?? "2026-10-29";
    requestedRanges.push(`${fromDate}:${toDate}`);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...overview,
        usagePeriodStart: fromDate,
        usagePeriodEnd: toDate,
        operationalMetrics: {
          ...overview.operationalMetrics,
          cupsInSelectedPeriod: 1000,
          dailyAcceptedCupUsage: [
            { date: fromDate, cups: 420 },
            ...(fromDate !== toDate ? [{ date: toDate, cups: 580 }] : []),
          ],
        },
      }),
    });
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/admin");
  await expect(page.getByLabel("Chọn kỳ báo cáo")).toBeVisible();
  await expect(page.getByText("1.000 ly", { exact: true })).toBeVisible();

  const today = dateAtBusinessZone();
  const yesterday = dateAtBusinessZone(-1);
  await page.getByLabel("Chọn kỳ báo cáo").click();
  await page.getByRole("button", { name: "Hôm nay" }).click();
  await expect.poll(() => requestedRanges.includes(`${today}:${today}`)).toBe(true);
  await page.getByLabel("Chọn kỳ báo cáo").click();
  await expect(page.getByRole("button", { name: "Hôm nay" })).toHaveAttribute("aria-pressed", "true");

  await page.getByLabel("Từ ngày").fill(dateInputValue(yesterday));
  await page.getByLabel("Đến ngày").fill(dateInputValue(today));
  await page.getByRole("button", { name: "Áp dụng kỳ" }).click();
  await expect.poll(() => requestedRanges.includes(`${yesterday}:${today}`)).toBe(true);
  await expect(page.getByRole("link", { name: "Xem báo cáo" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Doanh thu đã thu" })).toBeVisible();
  await expect(page.getByText("2.500.000 ₫", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Hàng đợi công việc trên trang hiện tại")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`fromDate=${yesterday}.*toDate=${today}`));
  await page.reload();
  await page.getByLabel("Chọn kỳ báo cáo").click();
  await expect(page.getByLabel("Từ ngày", { exact: true })).toHaveValue(new Date(`${yesterday}T00:00:00Z`).toLocaleDateString("vi-VN", { timeZone: "UTC" }));
  await page.keyboard.press("Escape");
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`fromDate=${today}.*toDate=${today}`));
  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`fromDate=${yesterday}.*toDate=${today}`));
});

test("Retired reports redirects preserve invoice deep links", async ({ request }) => {
  const report = await request.get("/admin/reports", { maxRedirects: 0 });
  expect(report.status()).toBe(307);
  expect(report.headers().location).toBe("/admin");
  const id = "3df55e22-2593-430c-bbd9-31521e298d4a";
  const invoice = await request.get(`/admin/reports?invoiceId=${id}`, { maxRedirects: 0 });
  expect(invoice.headers().location).toBe(`/admin/invoices/${id}`);
});

test("Revenue uses disjoint bounded periods and keeps cumulative collections distinct", async ({ page, context }) => {
  const payload = Buffer.from(JSON.stringify({ roles: ["admin"] })).toString("base64url");
  await context.addCookies([{ name: "access_token", value: `header.${payload}.signature`, domain: "127.0.0.1", path: "/" }]);
  const from = dateAtBusinessZone(-29), to = dateAtBusinessZone();
  const requested: { from: string; to: string }[] = [];
  await page.route("**/api/dolores/v1/dashboard/overview*", route => {
    const url = new URL(route.request().url());
    const start = url.searchParams.get("fromDate")!, end = url.searchParams.get("toDate")!;
    requested.push({ from: start, to: end });
    const days = (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
    return route.fulfill({ json: { ...overview,
      financialMetrics: [{ currency: "VND", amountCollected: 2758793 }],
      periodFinancialMetrics: [{ currency: "VND", amountCollectedInPeriod: days * 100, amountIssuedInPeriod: 0 }],
    } });
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(`/admin?fromDate=${from}&toDate=${to}`);
  const revenue = page.locator("section").filter({ has: page.getByRole("heading", { name: "Doanh thu đã thu" }) });
  await expect(revenue.getByText("3.000 ₫", { exact: true })).toBeVisible();
  await expect(page.getByText("2.758.793 ₫", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Biểu đồ tiền đã thu theo kỳ" })).toBeVisible();
  await expect(revenue.locator(".recharts-area-dot")).toHaveCount(10);
  expect(requested.length).toBe(11);
  const buckets = requested.filter(range => range.from !== from || range.to !== to).sort((a, b) => a.from.localeCompare(b.from));
  expect(buckets[0].from).toBe(from);
  expect(buckets.at(-1)?.to).toBe(to);
  for (let index = 1; index < buckets.length; index++) expect(Date.parse(buckets[index].from) - Date.parse(buckets[index - 1].to)).toBe(86400000);
  expect(await page.getByLabel("Chọn kỳ báo cáo").evaluate(el => el.getBoundingClientRect().height)).toBeLessThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("Revenue quality, loading space and mobile finance disclosure stay explicit", async ({ page, context }) => {
  const payload = Buffer.from(JSON.stringify({ roles: ["admin"] })).toString("base64url");
  await context.addCookies([{ name: "access_token", value: `header.${payload}.signature`, domain: "127.0.0.1", path: "/" }]);
  let unavailable = false;
  await page.route("**/api/dolores/v1/dashboard/overview*", async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("fromDate") === url.searchParams.get("toDate")) await new Promise(resolve => setTimeout(resolve, 500));
    await route.fulfill({ json: { ...overview, periodFinancialMetrics: [{ currency: "VND", amountCollectedInPeriod: 32.26,
      collectionQuality: { status: unavailable ? "UNAVAILABLE" : "PARTIAL" } }] } });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");
  await expect(page.getByText("Số liệu thu tiền chưa đầy đủ", { exact: true })).toBeVisible();
  const loading = page.getByText("Đang tải biểu đồ doanh thu…", { exact: true });
  await expect(loading).toBeVisible();
  expect((await loading.boundingBox())!.height).toBe(220);
  const chart = page.getByRole("img", { name: "Biểu đồ tiền đã thu theo kỳ" });
  await expect(chart).toBeVisible();
  expect((await chart.boundingBox())!.height).toBe(220);
  const finance = page.getByRole("button", { name: "Tài chính lũy kế · Xem số liệu" });
  await expect(finance).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#overview-finance-values")).toBeHidden();
  expect((await page.getByRole("heading", { name: "Doanh thu đã thu" }).boundingBox())!.y).toBeLessThan((await finance.boundingBox())!.y);
  await finance.click();
  await expect(page.locator("#overview-finance-values")).toBeVisible();
  await page.getByLabel("Chọn kỳ báo cáo").click();
  await page.mouse.click(2, 300);
  await expect(page.getByRole("button", { name: "Hôm nay", exact: true })).toBeHidden();
  unavailable = true;
  await page.reload();
  await expect(page.getByText("Chưa có số liệu thu tiền cho kỳ này", { exact: true })).toBeVisible();
  await expect(page.getByText("Chưa có dữ liệu doanh thu cho biểu đồ.", { exact: true })).toBeVisible();
  const revenue = page.locator("section").filter({ has: page.getByRole("heading", { name: "Doanh thu đã thu" }) });
  await expect(revenue.locator("strong").first()).toHaveText("—");
});

test("Moderator overview uses the selected period and keeps an actionable work queue", async ({ page, context }) => {
  const claims = Buffer.from(JSON.stringify({ roles: ["moderator"] })).toString("base64url");
  await context.addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  const today = dateAtBusinessZone();
  const yesterday = dateAtBusinessZone(-1);
  const ranges: string[] = [];
  const bucketRequests: string[] = [];
  let invoiceRequests = 0;

  page.on("request", request => {
    if (new URL(request.url()).pathname === "/api/dolores/v1/billing/invoices") invoiceRequests++;
  });
  await page.route("**/api/dolores/v1/dashboard/overview*", route => {
    const range = new URL(route.request().url()).searchParams;
    const from = range.get("fromDate");
    const to = range.get("toDate");
    ranges.push(`${from}:${to}`);
    return route.fulfill({ json: { ...overview, actionSummary: { actionableItems: 8, workByTimeBucket: { OVERDUE: 3, TODAY: 0, UPCOMING: 1, UNSCHEDULED: 4 } } } });
  });
  await page.route("**/api/dolores/v1/dashboard/action-items*", route => {
    const bucket = new URL(route.request().url()).searchParams.get("timeBucket");
    if (bucket) bucketRequests.push(bucket);
    return route.fulfill({ json: {
      items: bucket ? [] : [{
        actionKey: "fixture-contract", title: "Hợp đồng hết hạn trong 30 ngày",
        actionType: "CONTRACT_EXPIRING", resourceType: "CONTRACT", ownerName: "Cà phê Deer",
        resourceId: "f5000000-0000-4000-8000-000000000001",
        status: "ACTIVE", overdue: false, priority: "NORMAL",
        detailPath: "/moderator/technical-requests", availableActions: [],
      }, {
        actionKey: "fixture-contract-2", title: "Hợp đồng hết hạn trong 30 ngày",
        actionType: "CONTRACT_EXPIRING", resourceType: "CONTRACT", ownerName: "Cà phê S202",
        resourceId: "f5000000-0000-4000-8000-000000000002",
        status: "ACTIVE", overdue: false, priority: "NORMAL",
        detailPath: "/moderator/technical-requests", availableActions: [],
      }],
      page: 0, size: 5, hasMore: false, generatedAt: new Date().toISOString(),
      businessTimezone: "Asia/Ho_Chi_Minh", workflowAvailability: [],
    } });
  });

  await page.setViewportSize({ width: 1440, height: 810 });
  await page.goto(`/moderator?fromDate=${yesterday}&toDate=${today}`);
  const finance = page.getByRole("region", { name: "Tài chính lũy kế" });
  const revenue = page.getByRole("img", { name: "Biểu đồ tiền đã thu theo kỳ" });
  const cups = page.getByRole("img", { name: "Biểu đồ số ly ghi nhận theo ngày" });
  await expect(finance.locator("strong")).toHaveCount(4);
  await expect(revenue).toBeVisible();
  await expect(cups).toBeVisible();
  expect((await finance.boundingBox())!.y).toBeLessThan((await revenue.boundingBox())!.y);
  expect((await revenue.boundingBox())!.x).toBeLessThan((await cups.boundingBox())!.x);
  expect(ranges).toEqual(expect.arrayContaining([`${yesterday}:${today}`, `${yesterday}:${yesterday}`, `${today}:${today}`]));
  await expect(page.getByRole("region", { name: "Chỉ số vận hành" }).locator("dd")).toHaveText(["3", "12", "2", "1"]);
  await expect(page.getByRole("link", { name: "Mở công việc" }).first()).toHaveAttribute("href", "/moderator/contracts/f5000000-0000-4000-8000-000000000001");
  const status = page.getByText("Đang hiệu lực", { exact: true }).first();
  await expect(status).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  expect(await status.evaluate(el => getComputedStyle(el, "::before").height)).toBe("7px");
  const open = page.getByRole("link", { name: "Mở công việc" }).first();
  const letter = open.locator("[data-letter]").first();
  await open.hover();
  await expect.poll(() => letter.evaluate(el => getComputedStyle(el).transform)).not.toBe("none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(letter).toHaveCSS("transform", "none");
  await expect(page.getByRole("heading", { name: "Hợp đồng hết hạn trong 30 ngày 2 việc" })).toHaveCount(1);
  await expect(page.getByText("Cà phê Deer", { exact: true })).toBeVisible();
  await expect(page.getByText("Cà phê S202", { exact: true })).toBeVisible();
  await expect(page.getByText("Mã hồ sơ: 00000001")).toBeVisible();
  await expect(page.getByRole("button", { name: "Tiếp", exact: true })).toHaveCount(0);
  const queue = page.getByRole("region", { name: "Công việc cần xử lý" });
  await expect(queue.getByRole("table")).toHaveCount(0);
  await expect(queue.getByRole("button", { name: "Tất cả 8" })).toHaveAttribute("aria-pressed", "true");
  await queue.getByRole("button", { name: "Quá hạn 3" }).click();
  await expect(queue.getByRole("button", { name: "Quá hạn 3" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Không có công việc trong khoảng thời hạn này.")).toBeVisible();
  expect(bucketRequests).toContain("OVERDUE");
  expect(invoiceRequests).toBe(1);

  await page.setViewportSize({ width: 375, height: 812 });
  await expect.poll(async () => (await cups.boundingBox())!.y - (await revenue.boundingBox())!.y).toBeGreaterThan(100);
  await expect(finance.locator("strong").last()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test("Moderator overview shows permitted invoices even when finance is omitted", async ({ page, context }) => {
  const claims = Buffer.from(JSON.stringify({ roles: ["moderator"] })).toString("base64url");
  await context.addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  let requests = 0;
  await page.route("**/api/dolores/v1/dashboard/overview*", route => {
    requests++;
    return route.fulfill({ json: { ...overview, scope: "OPERATOR", financialMetrics: undefined, periodFinancialMetrics: undefined } });
  });

  const id = "4f500000-0000-4000-8000-000000000001";
  await page.route("**/api/dolores/v1/billing/invoices*", route => {
    expect(new URL(route.request().url()).searchParams.get("size")).toBe("5");
    return route.fulfill({ headers: { "X-Has-Next": "true" }, json: [
      { id, period: "2026-10", type: "RENTAL", amount: 1500000, currency: "VND", status: "PAID" },
      { id: "9f500000-0000-4000-8000-000000000002", period: "2026-10", type: "RENTAL", amount: 500000, currency: "VND", status: "OVERDUE" },
    ] });
  });
  await page.goto("/moderator");
  const invoices = page.getByRole("region", { name: "Hóa đơn", exact: true });
  await expect(invoices.getByRole("link", { name: "Xem tất cả hóa đơn" })).toHaveAttribute("href", "/moderator/invoices/list");
  await expect(invoices.getByRole("link", { name: "4F500000" })).toHaveAttribute("href", `/moderator/invoices/${id}`);
  await expect(invoices.getByText("1.500.000 ₫")).toBeVisible();
  await expect(invoices.getByText("2 hóa đơn trong nhóm đang xem")).toBeVisible();
  await expect(invoices.getByRole("table")).toHaveCount(0);
  const operations = page.getByRole("region", { name: "Chỉ số vận hành" });
  expect((await invoices.boundingBox())!.y).toBeLessThan((await operations.boundingBox())!.y);
  await expect(invoices.getByRole("listitem").filter({ has: page.getByRole("link", { name: "9F500000" }) })).toBeVisible();
  await expect(invoices.getByRole("link").nth(1)).toHaveText("9F500000");
  await expect(invoices.getByRole("listitem").filter({ has: page.getByRole("link", { name: "4F500000" }) }).getByText("Đã thanh toán")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(page.getByRole("heading", { name: "Tài chính lũy kế" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Doanh thu đã thu" })).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Biểu đồ số ly ghi nhận theo ngày" })).toBeVisible();
  await expect(page.getByRole("img", { name: "3 trên 5 máy đang cho thuê" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Xem danh sách máy" })).toHaveAttribute("href", "/moderator/machines/list");
  expect(requests).toBe(1);
});

test("Admin overview shows invoice breakdown and opens the Admin invoice", async ({ page, context }) => {
  const claims = Buffer.from(JSON.stringify({ roles: ["admin"] })).toString("base64url");
  await context.addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  const id = "4f500000-0000-4000-8000-000000000001";
  await page.route("**/api/dolores/v1/dashboard/overview*", route => route.fulfill({ json: overview }));
  await page.route("**/api/dolores/v1/billing/invoices*", route => route.fulfill({ json: [
    { id, period: "2026-10", type: "RENTAL", amount: 1500000, currency: "VND", status: "OVERDUE" },
  ] }));
  await page.goto("/admin");
  const invoices = page.getByRole("region", { name: "Hóa đơn", exact: true });
  await expect(invoices.getByText("Phân bố trạng thái")).toBeVisible();
  await expect(invoices.getByRole("table")).toHaveCount(0);
  await expect(invoices.getByRole("link", { name: "4F500000" })).toHaveAttribute("href", `/admin/invoices/${id}`);
});
