import { expect, test } from "@playwright/test";

const id = "f5000000-0000-4000-8000-000000000001";

test("owner maintenance uses ten-row pages, applied filters and explicit detail navigation", async ({ page }) => {
  await page.context().addCookies([{ name: "access_token", value: `header.${Buffer.from(JSON.stringify({ roles: ["owner"], sub: id })).toString("base64url")}.signature`, url: test.info().project.use.baseURL as string }]);
  const reads: string[] = [];
  const request = { id, machineId: id, requestType: "PREVENTIVE", status: "CONFIRMED", confirmedAppointmentAt: "2026-11-20T09:00:00Z", issueDescription: "Kiểm tra và vệ sinh định kỳ" };
  await page.route("**/api/**", route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/maintenance-requests")) {
      reads.push(url.search);
      return route.fulfill({ json: [request], headers: { "x-page": "0", "x-page-size": "10", "x-has-next": "false" } });
    }
    return route.fulfill({ json: url.pathname.endsWith(`/maintenance-requests/${id}`) ? request : url.pathname.endsWith("/machines") ? [{ id, serialNumber: "DOLORES-001", status: "DEPLOYED_CONTRACT_OWNER" }] : [] });
  });
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/dashboard/maintenance");
  await expect(page.getByRole("link", { name: "Thu hồi máy", exact: true })).toHaveCount(0);
  await expect(page.getByRole("cell", { name: /DOLORES-001/ })).toBeVisible();
  expect(new URLSearchParams(reads[0]).get("size")).toBe("10");
  await page.getByRole("combobox", { name: "Trạng thái bảo trì" }).selectOption("CONFIRMED");
  expect(reads).toHaveLength(1);
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect.poll(() => new URLSearchParams(reads.at(-1)).get("status")).toBe("CONFIRMED");
  await page.screenshot({ path: ".playwright-cli/owner-maintenance-list.png" });
  await page.getByRole("link", { name: "Mở lịch bảo trì", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Thông tin bảo trì", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lịch hẹn bảo trì", exact: true })).toBeVisible();
  await page.screenshot({ path: ".playwright-cli/owner-maintenance-detail.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.locator("body").evaluate(el => el.scrollWidth <= window.innerWidth)).toBe(true);
});

test("404 handles unknown pages and the retired owner recall list", async ({ page }) => {
  for (const path of ["/this-page-does-not-exist", "/dashboard/contracts/recall"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Không tìm thấy trang", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Về trang chủ", exact: true })).toHaveAttribute("href", "/");
  }
  await page.screenshot({ path: ".playwright-cli/not-found-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.locator("body").evaluate(el => el.scrollWidth <= window.innerWidth)).toBe(true);
});
