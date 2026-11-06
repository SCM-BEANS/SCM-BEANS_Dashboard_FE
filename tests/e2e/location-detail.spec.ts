import { expect, test, type Page } from "@playwright/test";

const ownerId = "f3000000-0000-4000-8000-000000000001";
const sourceLocationId = "f3000000-0000-4000-8000-000000000002";
const targetLocationId = "f3000000-0000-4000-8000-000000000003";
const inactiveLocationId = "f3000000-0000-4000-8000-000000000004";
const machineId = "f3000000-0000-4000-8000-000000000005";

type RoleCase = { label: string; claim: string; url: string; subject?: string };
type ApiCall = { method: string; url: string; body: unknown };

const roles: RoleCase[] = [
  { label: "Owner", claim: "owner", subject: ownerId, url: `/dashboard/locations?id=${sourceLocationId}` },
  { label: "Moderator", claim: "moderator", url: `/moderator/locations?id=${sourceLocationId}&ownerId=${ownerId}` },
];

function tokenFor(role: string, subject?: string) {
  const claims = Buffer.from(JSON.stringify({ roles: [role], ...(subject ? { sub: subject } : {}) })).toString("base64url");
  return `header.${claims}.signature`;
}

function location(id: string, name: string, active: boolean) {
  return { id, ownerId, name, address: "Test Street", city: "Bangkok", active };
}

function machine(index: number) {
  return {
    id: index === 1 ? machineId : `f3100000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    ownerId,
    locationId: sourceLocationId,
    serialNumber: `LOC-MACHINE-${String(index).padStart(2, "0")}`,
    status: "DEPLOYED_STORE_OWNER",
    machineType: index === 1 ? "SMART_IOT" : "CONVENTIONAL",
  };
}

async function installMockApi(page: Page, transferStatus = 200) {
  const calls: ApiCall[] = [];
  const machines = Array.from({ length: 11 }, (_, index) => machine(index + 1));
  let transferred = false;
  let statsReads = 0;
  let machinePageReads = 0;

  await page.route("**/api/dolores/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api\/dolores\/v1/, "");
    const method = request.method();
    const body = request.postData() ? request.postDataJSON() : undefined;
    calls.push({ method, url: `${path}${url.search}`, body });

    let status = 200;
    let response: unknown = [];
    if (method === "GET" && path === `/locations/${sourceLocationId}/stats`) {
      statsReads += 1;
      const totalMachines = machines.length - (transferred ? 1 : 0);
      response = {
        locationId: sourceLocationId,
        locationName: "Quầy Cà phê Trung Tâm",
        ownerId,
        ownerName: "Chủ quán E2E",
        totalMachines,
        onlineMachines: 1,
        offlineMachines: Math.max(0, totalMachines - 1),
        todayCupsBrewed: 245,
        weeklyCupsBrewed: 1_620,
        averageWastagePct: 2.75,
      };
    } else if (method === "GET" && path === `/locations/${sourceLocationId}/machines`) {
      machinePageReads += 1;
      const pageNumber = Number(url.searchParams.get("page") ?? 0);
      const size = Number(url.searchParams.get("size") ?? 10);
      const currentMachines = transferred ? machines.slice(1) : machines;
      const content = currentMachines.slice(pageNumber * size, (pageNumber + 1) * size);
      const totalPages = Math.ceil(currentMachines.length / size);
      response = {
        content,
        number: pageNumber,
        size,
        totalElements: currentMachines.length,
        totalPages,
        first: pageNumber === 0,
        last: pageNumber >= totalPages - 1,
        numberOfElements: content.length,
        empty: content.length === 0,
      };
    } else if (method === "GET" && path === "/locations") {
      response = [
        location(sourceLocationId, "Quầy Cà phê Trung Tâm", true),
        location(targetLocationId, "Điểm bán Đang Hoạt động", true),
        location(inactiveLocationId, "Điểm bán Đã Ngừng", false),
      ];
      await route.fulfill({
        status,
        contentType: "application/json",
        headers: { "x-page": url.searchParams.get("page") ?? "0", "x-page-size": url.searchParams.get("size") ?? "50", "x-has-next": "false" },
        body: JSON.stringify(response),
      });
      return;
    } else if (method === "GET" && path === `/telemetry-query/machines/${machineId}/heartbeats/latest`) {
      response = { machineId, status: "ONLINE", evaluatedAt: "2026-11-06T08:30:00Z" };
    } else if (method === "POST" && path === `/locations/machines/${machineId}/transfer`) {
      if (transferStatus !== 200) {
        status = transferStatus;
        response = { message: "Transfer rejected by test fixture." };
      } else {
        transferred = true;
        response = { ...machines[0], locationId: targetLocationId };
      }
    }

    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(response) });
  });

  return {
    calls,
    get statsReads() { return statsReads; },
    get machinePageReads() { return machinePageReads; },
  };
}

async function openLocation(page: Page, role: RoleCase) {
  await page.context().addCookies([{
    name: "access_token",
    value: tokenFor(role.claim, role.subject),
    domain: "127.0.0.1",
    path: "/",
  }]);
  await page.goto(role.url);
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quầy Cà phê Trung Tâm" })).toBeVisible();
}

test.describe("location detail and machine transfer", () => {
  test.setTimeout(120_000);

  for (const role of roles) {
    test(`${role.label} loads stats, pages machines, and transfers a machine to an eligible location`, async ({ page }) => {
      const api = await installMockApi(page);
      await openLocation(page, role);

      await expect(page.getByText("Tổng số máy")).toBeVisible();
      await expect(page.getByText("245", { exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "LOC-MACHINE-01" })).toBeVisible();
      const firstMachineRow = page.getByRole("row").filter({ has: page.getByRole("link", { name: "LOC-MACHINE-01" }) });
      await expect(firstMachineRow.getByText("Đang triển khai · Owner cửa hàng")).toBeVisible();
      await expect(firstMachineRow.getByRole("status").getByText("Đang kết nối")).toBeVisible();

      await page.getByRole("button", { name: "Trang sau" }).click();
      await expect(page.getByRole("link", { name: "LOC-MACHINE-11" })).toBeVisible();
      await page.getByRole("button", { name: "Trang trước" }).click();

      const initialStatsReads = api.statsReads;
      const initialMachinePageReads = api.machinePageReads;
      await page.getByRole("button", { name: "Chuyển điểm bán" }).first().click();
      await expect(page.getByRole("alertdialog")).toBeVisible();
      const targetSelect = page.getByLabel(/Địa điểm đích/);
      await expect(targetSelect.locator("option", { hasText: "Điểm bán Đang Hoạt động" })).toHaveCount(1);
      await expect(targetSelect.locator("option", { hasText: "Quầy Cà phê Trung Tâm" })).toHaveCount(0);
      await expect(targetSelect.locator("option", { hasText: "Điểm bán Đã Ngừng" })).toHaveCount(0);
      await targetSelect.selectOption(targetLocationId);
      await page.getByLabel(/Lý do/).fill("Điều chuyển theo yêu cầu của Owner.");
      await page.getByRole("button", { name: "Xác nhận chuyển máy" }).click();

      await expect(page.getByText("Đã chuyển máy tới Điểm bán Đang Hoạt động.", { exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "LOC-MACHINE-01" })).toHaveCount(0);
      await expect.poll(() => api.statsReads).toBeGreaterThan(initialStatsReads);
      await expect.poll(() => api.machinePageReads).toBeGreaterThan(initialMachinePageReads);

      const locationRequests = api.calls.filter((call) => call.method === "GET" && call.url.startsWith("/locations?"));
      expect(locationRequests).toContainEqual(expect.objectContaining({
        url: expect.stringContaining(`ownerId=${ownerId}`),
      }));
      expect(locationRequests.some((call) => call.url.includes("activeOnly=true"))).toBe(true);
      expect(api.calls.filter((call) => call.method === "POST" && call.url === `/locations/machines/${machineId}/transfer`)).toEqual([{
        method: "POST",
        url: `/locations/machines/${machineId}/transfer`,
        body: { targetLocationId, reason: "Điều chuyển theo yêu cầu của Owner." },
      }]);
    });
  }

  test("Owner sees a clear message when transfer is rejected with 400", async ({ page }) => {
    await installMockApi(page, 400);
    await openLocation(page, roles[0]!);
    await page.getByRole("button", { name: "Chuyển điểm bán" }).first().click();
    await page.getByLabel(/Địa điểm đích/).selectOption(targetLocationId);
    await page.getByRole("button", { name: "Xác nhận chuyển máy" }).click();
    await expect(page.getByRole("alert").getByText("Địa điểm đích phải đang hoạt động và thuộc cùng Owner với máy.")).toBeVisible();
    await expect(page.getByRole("alertdialog")).toBeVisible();
  });

  test("Moderator sees a clear message when transfer is rejected with 403", async ({ page }) => {
    await installMockApi(page, 403);
    await openLocation(page, roles[1]!);
    await page.getByRole("button", { name: "Chuyển điểm bán" }).first().click();
    await page.getByLabel(/Địa điểm đích/).selectOption(targetLocationId);
    await page.getByRole("button", { name: "Xác nhận chuyển máy" }).click();
    await expect(page.getByRole("alert").getByText("Bạn không có quyền chuyển máy tới địa điểm này.")).toBeVisible();
    await expect(page.getByRole("alertdialog")).toBeVisible();
  });
});
