import { expect, test } from "@playwright/test";

import { clickPageAction, expectNoPageAction, expectPageAction, expectPageActionOrder } from "./page-actions-test-helpers";

const id = "f3000000-0000-4000-8000-000000000001";
const machine = "f3000000-0000-4000-8000-000000000002";
const alternate = "f3000000-0000-4000-8000-000000000003";

for (const role of ["admin", "moderator"]) {
  test(`${role} can open a different-type offer and sees a conflict`, async ({ page }) => {
    await page.context().addCookies([{ name: "access_token", value: `header.${Buffer.from(JSON.stringify({ roles: [role] })).toString("base64url")}.signature`, domain: "127.0.0.1", path: "/" }]);
    await page.route("**/api/dolores/v1/**", async route => {
      const url = new URL(route.request().url());
      const path = url.pathname.replace("/api/dolores/v1", "");
      let data: unknown = [];
      let status = 200;
      if (path === `/repair-cases/${id}`) data = { id, maintenanceRequestId: id, ownerId: id, contractId: id, primaryMachineId: machine, status: "WAITING_REPLACEMENT", createdAt: "2026-01-01T00:00:00", updatedAt: "2026-01-01T00:00:00", timeline: [] };
      else if (path.endsWith("/timeline")) data = { content: [], number: 0, size: 50, totalElements: 0, totalPages: 0, numberOfElements: 0, first: true, last: true, empty: true };
      else if (path === `/machines/${machine}`) data = { id: machine, machineType: "CONVENTIONAL", status: "UNDER_MAINTENANCE" };
      else if (path === `/contracts/${id}`) data = { id, ownerId: id, status: "ACTIVE", startDate: "2026-01-01", endDate: "2027-01-01" };
      else if (path === "/inventory/rental-candidates") data = { content: [{ machineId: machine, machineType: "CONVENTIONAL", status: "IN_WAREHOUSE", displayName: "Same" }, { machineId: alternate, machineType: "SMART_IOT", status: "IN_WAREHOUSE", displayName: "Alternate" }], page: 0, size: 100, totalElements: 2, totalPages: 1 };
      else if (path.endsWith("/replacement-offers")) { status = 409; data = { message: "Conflict from backend" }; }
      await route.fulfill({ status, json: data });
    });
    await page.goto(`/${role}/technical-requests/cases/${id}`);
    await expectPageActionOrder(page, ["repair-case-offer-replacement"]);
    await clickPageAction(page, "repair-case-offer-replacement");
    await expect(page.getByRole("option", { name: "Alternate" })).toHaveCount(1);
    await expect(page.getByRole("option", { name: "Same" })).toHaveCount(0);
    await page.getByLabel("Máy thay thế").selectOption(alternate);
    await page.getByLabel("Lý do").fill("Cần máy thay thế");
    const requestPromise = page.waitForRequest(request => request.url().endsWith("/replacement-offers") && request.method() === "POST");
    await page.getByRole("button", { name: "Xác nhận" }).click();
    expect((await requestPromise).postDataJSON()).toEqual({ replacementMachineId: alternate, startAt: "2026-01-01T00:00:00", endAt: "2027-01-01T00:00:00", reason: "Cần máy thay thế" });
    await expect(page.getByText("Conflict from backend")).toBeVisible();
  });
}

for (const role of ["admin", "moderator"]) {
  for (const scenario of [
    { status: "DIAGNOSIS", review: "DISPUTED", offer: false, emergency: true },
    { status: "REPAIR_IN_PROGRESS", review: "DISPUTED", offer: false, emergency: true },
    { status: "DIAGNOSIS", review: "PROPOSED", offer: false, emergency: false },
    { status: "WAITING_REPLACEMENT", review: "DISPUTED", offer: true, emergency: false },
    { status: "WAITING_OWNER_DECISION", review: "DISPUTED", offer: true, emergency: false },
  ]) {
    test(`${role} actions for ${scenario.status} and ${scenario.review}`, async ({ page }) => {
      await page.context().addCookies([{ name: "access_token", value: `header.${Buffer.from(JSON.stringify({ roles: [role] })).toString("base64url")}.signature`, domain: "127.0.0.1", path: "/" }]);
      await page.route("**/api/dolores/v1/**", async route => {
        const path = new URL(route.request().url()).pathname.replace("/api/dolores/v1", "");
        let data: unknown = [];
        if (path === `/repair-cases/${id}`) data = { id, maintenanceRequestId: id, maintenanceTicketId: id, ownerId: id, contractId: id, primaryMachineId: machine, status: scenario.status, createdAt: "2026-01-01T00:00:00", updatedAt: "2026-01-01T00:00:00", timeline: [] };
        else if (path.endsWith("/timeline")) data = { content: [{ id: alternate, repairCaseId: id, eventType: "COST_REVIEW", actorRole: "ADMIN", occurredAt: "2026-01-01T00:00:00", details: `repairCostReviewId=${alternate};reviewStatus=PROPOSED->DISPUTED` }], number: 0, size: 50, totalElements: 1, totalPages: 1, numberOfElements: 1, first: true, last: true, empty: false };
        else if (path === `/repair-cost-reviews/${alternate}`) data = { id: alternate, maintenanceTicketId: id, machineId: machine, ownerId: id, cause: "OTHER", diagnosis: "Test", estimatedAmount: 1, currency: "VND", proposedResponsibleParty: "OWNER", status: scenario.review, createdAt: "2026-01-01T00:00:00", decisions: [], costComponents: [], approvedComponents: [] };
        else if (path.endsWith("/emergency-work-authorizations")) data = { id: alternate, repairCaseId: id, authorizedBy: id, actorRole: role.toUpperCase(), authorizedAt: "2026-01-01T00:00:00", reason: "Khẩn cấp", workScope: "Sửa bơm" };
        await route.fulfill({ json: data });
      });
      await page.goto(`/${role}/technical-requests/cases/${id}`);
      const offerId = "repair-case-offer-replacement";
      const emergencyId = "repair-case-authorize-emergency";
      if (scenario.offer) {
        await expectPageActionOrder(page, [offerId]);
        await expectPageAction(page, offerId);
      } else await expectNoPageAction(page, offerId);
      if (scenario.emergency) {
        await expectPageActionOrder(page, [emergencyId]);
        await expectPageAction(page, emergencyId);
        await clickPageAction(page, emergencyId);
        await page.getByLabel("Lý do").fill("Khẩn cấp");
        await page.getByLabel("Phạm vi công việc").fill("Sửa bơm");
        const request = page.waitForRequest(r => r.url().endsWith("/emergency-work-authorizations") && r.method() === "POST");
        await page.getByRole("button", { name: "Xác nhận" }).click();
        expect((await request).postDataJSON()).toEqual({ reason: "Khẩn cấp", workScope: "Sửa bơm" });
      } else await expectNoPageAction(page, emergencyId);
    });
  }
}

test("technician selects authorization and sees a conflict", async ({ page }) => {
  await page.context().addCookies([{ name: "access_token", value: `header.${Buffer.from(JSON.stringify({ roles: ["technician"], sub: id })).toString("base64url")}.signature`, domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/dolores/v1/**", async route => {
    const path = new URL(route.request().url()).pathname.replace("/api/dolores/v1", "");
    let data: unknown = [];
    let status = 200;
    if (path === `/repair-cases/${id}`) data = { id, maintenanceRequestId: id, maintenanceTicketId: id, ownerId: id, contractId: id, primaryMachineId: machine, status: "DIAGNOSIS", createdAt: "2026-01-01T00:00:00", updatedAt: "2026-01-01T00:00:00", timeline: [] };
    else if (path === `/maintenance-requests/${id}`) data = { id, machineId: machine, requestType: "REPAIR", status: "IN_PROGRESS", replacementAssignmentId: alternate };
    else if (path === `/maintenance-tickets/${id}`) data = { id, repairCaseId: id, status: "ASSIGNED", assignedTechnicianId: id };
    else if (path === `/replacement-assignments/${alternate}`) data = { id: alternate, ownerId: id, contractId: id, repairCaseId: id, primaryMachineId: machine, replacementMachineId: alternate, status: "ACTIVE", startAt: "2026-01-01T00:00:00", endAt: "2027-01-01T00:00:00" };
    else if (path.endsWith("/custody-events")) data = [{ id: alternate, maintenanceRequestId: id, repairCaseId: id, eventType: "REPLACEMENT_DELIVERED", machineId: alternate, actorRole: "TECHNICIAN", occurredAt: "2026-01-01T00:00:00", ownerAcknowledgedAt: "2026-01-01T00:00:00" }];
    else if (path.endsWith("/timeline")) data = { content: [{ id: alternate, repairCaseId: id, eventType: "COST_REVIEW", actorRole: "ADMIN", occurredAt: "2026-01-01T00:00:00", details: `repairCostReviewId=${alternate}` }, { id: machine, repairCaseId: id, eventType: "EMERGENCY_WORK_AUTHORIZED", actorRole: "ADMIN", occurredAt: "2026-01-02T00:00:00", reason: "Khẩn cấp", details: `authorizationId=${machine};scope=Sửa bơm;disputedReviewId=${alternate}` }], number: 0, size: 50, totalElements: 2, totalPages: 1, numberOfElements: 2, first: true, last: true, empty: false };
    else if (path === `/repair-cost-reviews/${alternate}`) data = { id: alternate, maintenanceTicketId: id, machineId: machine, ownerId: id, cause: "OTHER", diagnosis: "Test", estimatedAmount: 1, currency: "VND", proposedResponsibleParty: "OWNER", status: "DISPUTED", createdAt: "2026-01-01T00:00:00", decisions: [], costComponents: [], approvedComponents: [] };
    else if (path.endsWith("/work/start")) { status = 409; data = { message: "conflict" }; }
    await route.fulfill({ status, json: data });
  });
  await page.goto(`/technician/tasks/repair-cases/${id}`);
  const select = page.getByLabel("Ủy quyền xử lý khẩn cấp");
  await select.selectOption(machine);
  const scope = page.locator(`#repair-work-scope-${id}`);
  await expect(scope).toHaveValue("Sửa bơm");
  await expect(scope).toHaveAttribute("readonly", "");
  const request = page.waitForRequest(r => r.url().endsWith("/work/start") && r.method() === "POST");
  await page.locator('footer[aria-label^="Thao tác"]').getByRole("button", { name: "Bắt đầu sửa chữa" }).click();
  expect((await request).postDataJSON()).toEqual({ workScope: "Sửa bơm", emergencyAuthorizationId: machine });
  await expect(page.getByText("Ủy quyền này đã được sử dụng hoặc không khớp phạm vi công việc.")).toBeVisible();
});

