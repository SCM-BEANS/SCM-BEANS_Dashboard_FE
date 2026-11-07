import { expect, test } from "@playwright/test";
import { expectPrimaryPageAction, pageActionBar } from "./page-actions-test-helpers";

test("admin contract creation offers cancel and primary form submission", async ({ page }) => {
  const claims = Buffer.from(JSON.stringify({ roles: ["admin"] })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    await route.fulfill({ status: 200, json: path.endsWith("/profiles") ? { items: [], page: 0, size: 100, totalElements: 0, totalPages: 0 } : [] });
  });
  await page.goto("/admin/contracts?view=create");
  await expectPrimaryPageAction(page, "create");
  const bar = pageActionBar(page);
  await expect(bar.locator('[data-action-id="create"]')).toHaveAttribute("form", "contract-create-form");
  await expect(bar.getByRole("button", { name: "Hủy", exact: true })).toBeVisible();
  await page.locator("#contract-terms").fill("Điều khoản thử nghiệm");
  await bar.getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
});

test("technician installation completion is the primary page action", async ({ page }) => {
  const id = "f4000000-0000-4000-8000-000000000001";
  const claims = Buffer.from(JSON.stringify({ roles: ["technician"] })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith(`/installation-work-orders/${id}`)) {
      return route.fulfill({ json: { workOrder: { id, ownerId: id, contractId: id, machineId: id, machineType: "CONVENTIONAL", status: "IN_PROGRESS", assignedTechnicianId: id, scheduledFor: null, startedAt: null, completedAt: null, handoverRecipient: null, failureReason: null, createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z", createdBy: id }, checklistItems: [], accessories: [], evidence: [], installationNotes: null, checklistItemCount: 0, accessoryCount: 0, evidenceCount: 1 } });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto(`/technician/tasks/${id}`);
  await expectPrimaryPageAction(page, "complete-installation");
  await expect(pageActionBar(page).getByRole("button", { name: "Về danh sách" })).toHaveCount(0);
});


test("recall inspection creation is the primary page action", async ({ page }) => {
  const id = "f4000000-0000-4000-8000-000000000002";
  const claims = Buffer.from(JSON.stringify({ roles: ["admin"] })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  const work = { id, terminationCaseId: id, ownerId: id, contractId: id, machineId: id, status: "RECEIVED_AT_DEPOT", createdAt: "2026-01-01", updatedAt: "2026-01-01" };
  const caseData = { id, ownerId: id, contractId: id, machineId: id, type: "NORMAL", status: "INSPECTION_PENDING", requestedBy: id, reason: "test", createdAt: "2026-01-01", updatedAt: "2026-01-01" };
  await page.route("**/api/dolores/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/dolores/v1", "");
    if (path === "/recall-work-orders") return route.fulfill({ json: { content: [work], page: 0, size: 20, totalElements: 1, totalPages: 1 } });
    if (path === `/recall-work-orders/${id}`) return route.fulfill({ json: work });
    if (path === `/termination-cases/${id}`) return route.fulfill({ json: caseData });
    if (path === `/contracts/${id}`) return route.fulfill({ json: { id, ownerId: id, machineId: id, status: "ACTIVE" } });
    if (path === "/profiles") return route.fulfill({ json: [], headers: { "x-page": "0", "x-page-size": "20", "x-has-next": "false" } });
    if (path.endsWith("/events")) return route.fulfill({ json: { content: [], page: 0, size: 50, totalElements: 0, totalPages: 0 } });
    return route.fulfill({ json: [] });
  });
  await page.goto(`/admin/contracts/${id}/termination`);
  await page.getByRole("button", { name: "M\u1edf chi ti\u1ebft" }).click();
  await expectPrimaryPageAction(page, "recall-create-inspection");
});


test("recall assignment submits its form from the action bar", async ({ page }) => {
  const id = "f4000000-0000-4000-8000-000000000002";
  const claims = Buffer.from(JSON.stringify({ roles: ["admin"] })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  const work = { id, terminationCaseId: id, ownerId: id, contractId: id, machineId: id, status: "UNASSIGNED", createdAt: "2026-01-01", updatedAt: "2026-01-01" };
  const caseData = { id, ownerId: id, contractId: id, machineId: id, type: "NORMAL", status: "RECOVERY_PENDING", requestedBy: id, reason: "test", createdAt: "2026-01-01", updatedAt: "2026-01-01" };
  await page.route("**/api/dolores/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/dolores/v1", "");
    if (path === "/recall-work-orders") return route.fulfill({ json: { content: [work], page: 0, size: 20, totalElements: 1, totalPages: 1 } });
    if (path === `/recall-work-orders/${id}`) return route.fulfill({ json: work });
    if (path === `/termination-cases/${id}`) return route.fulfill({ json: caseData });
    if (path === `/contracts/${id}`) return route.fulfill({ json: { id, ownerId: id, machineId: id, status: "ACTIVE" } });
    if (path === "/profiles") return route.fulfill({ json: [], headers: { "x-page": "0", "x-page-size": "20", "x-has-next": "false" } });
    if (path.endsWith("/events")) return route.fulfill({ json: { content: [], page: 0, size: 50, totalElements: 0, totalPages: 0 } });
    return route.fulfill({ json: [] });
  });
  await page.goto(`/admin/contracts/${id}/termination`);
  await page.getByRole("button", { name: "M\u1edf chi ti\u1ebft" }).click();
  await expectPrimaryPageAction(page, "recall-assign");
  await expect(pageActionBar(page).locator('[data-action-id="recall-assign"]')).toHaveAttribute("form", "recall-assign-form");
});


test("coffee catalog creation submits from the action bar", async ({ page }) => {
  const claims = Buffer.from(JSON.stringify({ roles: ["admin"] })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/**", (route) => route.fulfill({ json: [] }));
  await page.goto("/admin/coffee-packages");
  await page.getByRole("button", { name: "Danh mục gói" }).click();
  await expectPrimaryPageAction(page, "coffee-catalog-save");
  await expect(pageActionBar(page).locator('[data-action-id="coffee-catalog-save"]')).toHaveAttribute("form", "coffee-catalog-form");
});

test("machine registration submits from the action bar", async ({ page }) => {
  const claims = Buffer.from(JSON.stringify({ roles: ["owner"], sub: "f3000000-0000-4000-8000-000000000001" })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/**", (route) => route.fulfill({ json: [] }));
  await page.goto("/dashboard/machines/new");
  await expectPrimaryPageAction(page, "machine-register");
  await expect(pageActionBar(page).locator('[data-action-id="machine-register"]')).toHaveAttribute("form", "machine-registration-form");
});

test("global menu creation is a primary page action", async ({ page }) => {
  const claims = Buffer.from(JSON.stringify({ roles: ["admin"] })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/**", (route) => route.fulfill({ json: [] }));
  await page.goto("/admin/menu");
  await expectPrimaryPageAction(page, "menu-create");
});

test("location creation submits from the action bar", async ({ page }) => {
  const id = "f3000000-0000-4000-8000-000000000001";
  const claims = Buffer.from(JSON.stringify({ roles: ["owner"], sub: id })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/**", (route) => route.fulfill({ json: [] }));
  await page.goto("/dashboard/locations");
  await expectPrimaryPageAction(page, "location-create");
  await pageActionBar(page).locator('[data-action-id="location-create"]').click();
  await expectPrimaryPageAction(page, "location-save");
  await expect(pageActionBar(page).locator('[data-action-id="location-save"]')).toHaveAttribute("form", "location-create-form");
});

test("legacy recipe form submits from the action bar", async ({ page }) => {
  const id = "f3000000-0000-4000-8000-000000000001";
  const claims = Buffer.from(JSON.stringify({ roles: ["owner"], sub: id })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/**", (route) => route.fulfill({ json: [] }));
  await page.goto("/dashboard/menu/adjustments?view=legacy");
  await expectPrimaryPageAction(page, "legacy-save");
  await expect(pageActionBar(page).locator('[data-action-id="legacy-save"]')).toHaveAttribute("form", "legacy-recipe-form");
});

test("recipe sync request is a primary page action", async ({ page }) => {
  const id = "f3000000-0000-4000-8000-000000000001";
  const claims = Buffer.from(JSON.stringify({ roles: ["owner"], sub: id })).toString("base64url");
  await page.context().addCookies([{ name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/**", (route) => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith("/machines") ? [{ id, ownerId: id, serialNumber: "SYNC-1", status: "IN_WAREHOUSE", machineType: "CONVENTIONAL" }] : [] }));
  await page.goto("/dashboard/menu/sync");
  await expectPrimaryPageAction(page, "recipe-sync");
});
