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
    financialsVisible: true,
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
  const claims = Buffer.from(JSON.stringify({ roles: [role] })).toString("base64url");
  return `header.${claims}.signature`;
}

async function installMockApi(page: Page, role: RoleCase, requests: string[]) {
  await page.route("**/api/dolores/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api\/dolores\/v1/, "");
    requests.push(`${path}${url.search}`);

    let body: unknown = [];
    if (path === "/machines") {
      body = [machine];
    } else if (path === "/inventory/summary") {
      body = { totalMachines: 1, statusCounts: { DEPLOYED_CONTRACT_OWNER: 1 } };
    } else if (path === `/machines/${machineId}`) {
      body = machine;
    } else if (path === `/machines/${machineId}/maintenance-schedule`) {
      body = { nextPreventiveMaintenanceAt: null, cupsServedSinceLastDescale: 18 };
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

      await expect.poll(() => requests.some((request) => request.includes("/heartbeats/latest"))).toBe(true);
      await expect.poll(() => requests.some((request) => request.startsWith("/dashboard/overview?"))).toBe(true);
      const dashboardRequest = requests.find((request) => request.startsWith("/dashboard/overview?"));
      expect(dashboardRequest).toBeTruthy();
      expect(new URLSearchParams(dashboardRequest!.split("?", 2)[1]).has("ownerId")).toBe(false);

      const pointsRequested = requests.some((request) => request.includes("/telemetry-query/machines/") && request.split("?", 1)[0].endsWith("/points"));
      expect(pointsRequested).toBe(role.pointsAllowed);
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
