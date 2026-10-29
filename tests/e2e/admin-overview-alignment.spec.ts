import { expect, test } from "@playwright/test";

const overview = {
  scope: "PLATFORM",
  ownerId: null,
  asOfDate: "2026-10-29",
  usagePeriodStart: "2026-10-01",
  usagePeriodEnd: "2026-10-29",
  operationalMetrics: {
    totalOwners: 3,
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

function displayDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("vi-VN", { timeZone: "UTC" });
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

  const heading = page.getByRole("columnheader", { name: "Số ly hợp lệ" });
  await expect(heading).toBeVisible();
  const dailyTable = page.locator("table").filter({ has: heading });
  const cupCells = dailyTable.locator("tbody tr td:nth-child(3)");
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

test("Admin can filter accepted cups, open reports and inspect daily machine totals", async ({ page, context }) => {
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
  await page.route("**/api/dolores/v1/dashboard/daily-cups/machines*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { machineId: "8a6aa914-1085-44e7-8705-3b02f30befc5", serialNumber: "DL-001", region: "Hồ Chí Minh", cups: 580 },
        { machineId: "80f8ecba-9222-4311-ab5d-a7be46fc079f", serialNumber: "DL-002", region: "Hà Nội", cups: 420 },
      ]),
    }),
  );

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/admin");
  await expect(page.getByText("Kỳ dữ liệu")).toBeVisible();
  await expect(page.getByText("1.000", { exact: true })).toBeVisible();

  const today = dateAtBusinessZone();
  const yesterday = dateAtBusinessZone(-1);
  await page.getByRole("button", { name: "Hôm nay" }).click();
  await expect.poll(() => requestedRanges.at(-1)).toBe(`${today}:${today}`);
  await expect(page.getByRole("button", { name: "Hôm nay" })).toHaveAttribute("aria-pressed", "true");

  await page.getByLabel("Từ ngày").fill(yesterday);
  await page.getByLabel("Đến ngày").fill(today);
  await page.getByRole("button", { name: "Áp dụng kỳ" }).click();
  await expect.poll(() => requestedRanges.at(-1)).toBe(`${yesterday}:${today}`);
  await expect(page.getByRole("link", { name: "Xem báo cáo" })).toHaveAttribute(
    "href",
    `${"/admin/reports"}?fromDate=${yesterday}&toDate=${today}`,
  );

  await page.getByRole("checkbox", { name: `Xem chi tiết số ly theo máy ngày ${displayDate(today)}` }).check();
  await expect(page.getByRole("heading", { name: `Số ly theo máy · ${displayDate(today)}` })).toBeVisible();
  const machineTable = page.locator("table").filter({ has: page.getByRole("columnheader", { name: "Khu vực" }) });
  await expect(machineTable).toContainText("DL-001");
  await expect(machineTable).toContainText("580");
  await expect(machineTable).toContainText("DL-002");
  await expect(machineTable).toContainText("420");
});
