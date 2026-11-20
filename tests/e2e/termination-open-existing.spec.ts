import { test, expect } from "@playwright/test";
const contractId = "cb94b880-dd01-451d-b39b-1fb706e377a0";
const caseId = "ca3e4b17-eecb-46cc-8045-80ab245cdb12";
test("verified case reopens automatically and prevents duplicate creation after reload", async ({ page }) => {
  let writes = 0;
  let failureStatus = 0;
  await page.context().addCookies([{ name: "access_token", value: `header.${Buffer.from(JSON.stringify({ roles: ["moderator"], sub: contractId })).toString("base64url")}.signature`, url: test.info().project.use.baseURL as string }]);
  await page.route("**/api/**", route => {
    if (route.request().method() !== "GET") writes++;
    const path = new URL(route.request().url()).pathname;
    if (failureStatus && path.endsWith(`/termination-cases/${caseId}`)) return route.fulfill({ status: failureStatus, json: { error: "Unavailable" } });
    const body = path.endsWith(`/contracts/${contractId}`) ? { id: contractId, ownerId: contractId, machineId: contractId, status: "ACTIVE", startDate: "2026-01-01", endDate: "2026-12-31", monthlyRentalFee: 500000 }
      : path.endsWith("expiry-status") ? { contractId, terminationCaseId: null }
      : path.endsWith(`/termination-cases/${caseId}`) ? { id: caseId, contractId, ownerId: contractId, machineId: contractId, type: "NORMAL", status: "REQUESTED", requestedBy: contractId, reason: "Hồ sơ đã tồn tại", createdAt: "2026-11-01", updatedAt: "2026-11-01" }
      : path.endsWith("recall-work-orders") ? { content: [], page: 0, size: 100, totalElements: 0, totalPages: 0, first: true, last: true } : [];
    return route.fulfill({ json: body });
  });
  const url = `/moderator/contracts/${contractId}/termination`;
  await page.goto(`${url}?caseId=${caseId}`);
  await expect(page.getByText("Hồ sơ đã tồn tại", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => Object.values(localStorage))).toContain(caseId);
  await page.goto(url);
  await expect(page.getByText("Hồ sơ đã tồn tại", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Tạo hồ sơ/ })).toHaveCount(0);
  await expect(page.getByLabel("Mã hồ sơ chấm dứt", { exact: true })).toHaveCount(0);
  failureStatus = 503;
  await page.reload();
  await expect(page.getByText("Không xác minh được hồ sơ hiện có. Chưa thể tạo hồ sơ mới.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Tạo hồ sơ/ })).toHaveCount(0);
  failureStatus = 404;
  await page.getByRole("button", { name: "Thử lại", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Tạo hồ sơ chấm dứt", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => Object.values(localStorage))).not.toContain(caseId);
  expect(writes).toBe(0);
});
