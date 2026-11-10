import { test, expect, type Page } from "@playwright/test";
import { clickPageAction, expectNoPageAction, expectNoPageActionLabel, expectPageActionOrder } from "./page-actions-test-helpers";

const id = "f3000000-0000-4000-8000-000000000001";
const ownerId = "f3000000-0000-4000-8000-000000000002";
async function login(page: Page, role: string) {
  const claims = Buffer.from(JSON.stringify({ roles: [role], sub: ownerId })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
}
for (const role of ["admin", "owner"]) {
  test(`${role}: machine contract history filter, paging and empty 404`, async ({ page }) => {
    await login(page, role);
    await page.route("**/api/dolores/v1/**", async route => {
      const url = new URL(route.request().url()); const path = url.pathname.replace("/api/dolores/v1", "");
      let body: unknown = [];
      if (path === `/contracts/machine/${id}`) {
        if (url.searchParams.get("status") === "TERMINATED") return route.fulfill({ status: 404, body: "{}" });
        body = [{ id, ownerId, machineId: id, status: url.searchParams.get("status") || "ACTIVE", ownerName: "Owner E2E" }];
        return route.fulfill({ json: body, headers: { "x-has-next": url.searchParams.get("page") === "0" ? "true" : "false" } });
      }
      if (path === `/machines/${id}`) body = { id, ownerId, serialNumber: "TEST", status: "DEPLOYED_CONTRACT_OWNER", machineType: "CONVENTIONAL" };
      if (path === "/machines") body = [{ id, ownerId, serialNumber: "TEST", status: "DEPLOYED_CONTRACT_OWNER", machineType: "CONVENTIONAL" }];
      if (path.endsWith("maintenance-schedule")) body = {};
      return route.fulfill({ json: body });
    });
    await page.goto(role === "admin" ? `/admin/machines/${id}` : `/dashboard/machines/${id}`);
    if (role === "owner") await page.getByRole("tab", { name: "Hợp đồng" }).click();
    const panel = page.getByRole("region", { name: "Lịch sử hợp đồng của máy" });
    await expect(panel.getByText("Owner E2E")).toBeVisible();
    if (role === "owner") {
      await expect(panel).toHaveCount(1);
      await expect(panel.getByRole("table")).toHaveCount(1);
    }
    await panel.getByRole("button", { name: "Sau" }).click();
    await expect(panel.getByText("Trang 2")).toBeVisible();
    await expectNoPageActionLabel(page, "Sau");
    await panel.getByLabel("Trạng thái").selectOption("TERMINATED");
    await expect(panel.getByText("Không có lịch sử hợp đồng.")).toBeVisible();
  });
}
test("owner confirms delivered order at the order receipt endpoint", async ({ page }) => {
  await login(page, "owner"); let received = false; let posted = "";
  await page.route("**/api/dolores/v1/**", async route => {
    const path = new URL(route.request().url()).pathname.replace("/api/dolores/v1", "");
    if (path === `/coffee-package-orders/${id}/confirm-received`) { posted = path; received = true; return route.fulfill({ json: { orderId: id, status: "DELIVERED", ownerReceivedAt: "2026-11-01T00:00:00Z" } }); }
    if (path === `/coffee-package-orders/${id}`) return route.fulfill({ json: { id, status: "DELIVERED", ownerReceivedAt: received ? "2026-11-01T00:00:00Z" : null } });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto(`/dashboard/coffee-packages/${id}`);
  await expectPageActionOrder(page, ["coffee-order-confirm-received"]);
  await clickPageAction(page, "coffee-order-confirm-received");
  await page.getByRole("alertdialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByText(/Đã xác nhận nhận hàng lúc/)).toBeVisible();
  expect(posted).toBe(`/coffee-package-orders/${id}/confirm-received`);
});

test("operator legacy review requires technician only for depot verification", async ({ page }) => {
  await login(page, "admin"); let posted: Record<string, unknown> | undefined;
  const work = { id, terminationCaseId: id, ownerId, contractId: id, machineId: id, status: "LEGACY_REVIEW_REQUIRED", createdAt: "2026-01-01", updatedAt: "2026-01-01" };
  const caseData = { id, ownerId, contractId: id, machineId: id, type: "NORMAL", status: "RECOVERY_PENDING", requestedBy: ownerId, reason: "test", createdAt: "2026-01-01", updatedAt: "2026-01-01" };
  await page.route("**/api/dolores/v1/**", async route => {
    const req = route.request(); const path = new URL(req.url()).pathname.replace("/api/dolores/v1", "");
    if (path.endsWith("/legacy-review")) { posted = req.postDataJSON(); return route.fulfill({ json: { ...work, status: "UNASSIGNED" } }); }
    if (path === "/recall-work-orders") return route.fulfill({ json: { content: [work], page: 0, size: 20, totalElements: 1, totalPages: 1 } });
    if (path === `/recall-work-orders/${id}`) return route.fulfill({ json: work });
    if (path === `/termination-cases/${id}`) return route.fulfill({ json: caseData });
    if (path === `/contracts/${id}`) return route.fulfill({ json: { id, ownerId, machineId: id, status: "ACTIVE" } });
    if (path === "/profiles") return route.fulfill({ json: [], headers: { "x-page": "0", "x-page-size": "20", "x-has-next": "false" } });
    if (path.endsWith("/events")) return route.fulfill({ json: { content: [], page: 0, size: 50, totalElements: 0, totalPages: 0 } });
    return route.fulfill({ json: [] });
  });
  await page.goto(`/admin/contracts/${id}/termination`);
  await page.getByRole("button", { name: "Mở chi tiết" }).click();
  await expectPageActionOrder(page, ["recall-work-order-legacy-review"]);
  await clickPageAction(page, "recall-work-order-legacy-review");
  const dialog = page.getByRole("alertdialog", { name: "Rà soát lệnh thu hồi" });
  await dialog.getByLabel("Lý do").fill("Kiểm tra hồ sơ");
  await expect(dialog.getByRole("button", { name: "Xác nhận" })).toBeEnabled();
  await dialog.getByLabel(/Máy đã ở kho/).check();
  await expect(dialog.getByRole("button", { name: "Xác nhận" })).toBeDisabled();
  await dialog.getByLabel(/Cần thu hồi/).check();
  await dialog.getByRole("button", { name: "Xác nhận" }).click();
  await expect.poll(() => posted).toMatchObject({ decision: "PICKUP_REQUIRED", reason: "Kiểm tra hồ sơ", correlationId: expect.any(String) });
});

test("receipt confirmation is hidden before delivery", async ({ page }) => {
  await login(page, "owner");
  await page.route("**/api/dolores/v1/**", async route => {
    const path = new URL(route.request().url()).pathname.replace("/api/dolores/v1", "");
    if (path === `/coffee-package-orders/${id}`) return route.fulfill({ json: { id, status: "WAITING_STOCK" } });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto(`/dashboard/coffee-packages/${id}`);
  await expect(page.getByRole("button", { name: "Đồng ý chờ hàng" })).toBeVisible();
  await expectNoPageAction(page, "coffee-order-confirm-received");
});

