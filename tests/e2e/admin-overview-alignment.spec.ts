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
