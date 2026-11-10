import { expect, test, type Page } from "@playwright/test";
import { clickPageAction } from "./page-actions-test-helpers";

const ownerId = "10000000-0000-4000-8000-000000000001";
const machineId = "10000000-0000-4000-8000-000000000002";
const secondId = "10000000-0000-4000-8000-000000000003";
const contractId = "10000000-0000-4000-8000-000000000004";

async function prepare(page: Page, changed = false) {
  const claims = Buffer.from(JSON.stringify({ sub: ownerId, roles: ["moderator"] })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: "header." + claims + ".signature",
    domain: "127.0.0.1", path: "/" }]);
  const writes: Record<string, unknown>[] = [];
  const pages: number[] = [];
  await page.route("**/api/**", async route => {
    const r = route.request(), url = new URL(r.url());
    const path = url.pathname.replace(/^\/api\/dolores\/v1/, "");
    let data: unknown = [];
    if (path === "/profiles") data = { items: [{ idaasUserId: ownerId, email: "test@example.invalid",
      fullName: "TEST Owner", emailVerified: true, roles: ["OWNER"], status: "ACTIVE" }],
      page: 0, size: 100, totalElements: 1, totalPages: 1 };
    else if (path === "/inventory/rental-candidates") {
      const pageIndex = Number(url.searchParams.get("page")); pages.push(pageIndex);
      data = { content: pageIndex === 0 ? [
        { machineId, serialNumber: "TEST-SERIAL-001", displayName: "MODEL-NAME-HIDDEN", status: "AVAILABLE_FOR_RENT" },
        { machineId: contractId, serialNumber: "WAREHOUSE-HIDDEN", status: "IN_WAREHOUSE" },
        { machineId: ownerId, serialNumber: null, displayName: "NO-SERIAL-HIDDEN", status: "AVAILABLE_FOR_RENT" },
      ] : [{ machineId: secondId, serialNumber: "TEST-SERIAL-002", displayName: "MODEL-NAME-HIDDEN", status: "AVAILABLE_FOR_RENT" }],
        page: pageIndex, size: 100, totalElements: 101, totalPages: 2 };
    } else if (path === "/machines/" + machineId) {
      data = { id: machineId, serialNumber: "TEST-SERIAL-001", status: changed ? "PENDING_ACTIVATION" : "AVAILABLE_FOR_RENT" };
    } else if (path === "/contracts" && r.method() === "POST") {
      writes.push(r.postDataJSON()); data = { id: contractId };
    }
    await route.fulfill({ status: path === "/contracts" && r.method() === "POST" ? 201 : 200, json: data });
  });
  await page.goto("/moderator/contracts/new");
  return { writes, pages };
}

async function fill(page: Page) {
  await page.locator("#contract-owner").selectOption(ownerId);
  await page.getByLabel("Serial number của máy *", { exact: true }).selectOption(machineId);
  await page.locator("#contract-start-date").fill("2026-11-20");
  await page.locator("#contract-end-date").fill("2027-11-20");
  await page.locator("#contract-monthly-rental-fee").fill("250000");
  await page.locator("#contract-terms").fill("TEST Điều khoản");
}

test("Moderator selects eligible serial numbers across pages and sends machineId", async ({ page }) => {
  const state = await prepare(page);
  const selector = page.getByLabel("Serial number của máy *", { exact: true });
  await expect(selector.locator("option")).toHaveText(["Chọn serial number", "TEST-SERIAL-001", "TEST-SERIAL-002"]);
  expect(state.pages).toEqual([0, 1]);
  await fill(page);
  await page.screenshot({ path: "test-results/moderator-contract-serial.png", fullPage: true });
  await clickPageAction(page, "create");
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0].machineId).toBe(machineId);
  expect(state.writes[0]).not.toHaveProperty("serialNumber");
  expect(state.writes[0]).not.toHaveProperty("modelId");
});

test("a machine that became unavailable blocks POST and clears selection", async ({ page }) => {
  const state = await prepare(page, true);
  await fill(page);
  await clickPageAction(page, "create");
  await expect(page.getByText(/Máy đã chọn không còn sẵn sàng cho thuê/)).toBeVisible();
  await expect(page.getByLabel("Serial number của máy *", { exact: true })).toHaveValue("");
  expect(state.writes).toHaveLength(0);
});
