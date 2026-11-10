import { expect, test, type Page } from "@playwright/test";

const contractId = "fa100000-0000-4000-8000-000000000001";
const ownerId = "fa100000-0000-4000-8000-000000000002";
const machineId = "fa100000-0000-4000-8000-000000000003";
const workOrderId = "fa100000-0000-4000-8000-000000000004";
const otherId = "fa100000-0000-4000-8000-000000000005";
const policy = {
  policyVersion: 1,
  maintenanceIntervalMonths: 3,
  maintenanceWindowDays: 10,
  allowedReplacementMachineTypes: ["SMART_IOT"],
  repairCostResponsibility: "COMPANY",
  paymentDueEligibleDays: 10,
  paymentDestinationReference: "TEST_BANK",
  offlineViolationAction: "WARN_ONLY",
  buybackEnabled: true,
  buybackMinimumMonths: 6,
  buybackValuationMethod: "MANUAL_APPRAISAL",
  offlineLimitMinutes: 66,
};

type Options = {
  role?: "admin" | "moderator";
  forbidden?: boolean;
  missingDate?: boolean;
  unrelatedWorkOrder?: boolean;
  missingTerms?: boolean;
  invalidPolicy?: boolean;
};

async function openContract(page: Page, options: Options = {}) {
  const role = options.role ?? "moderator";
  const claims = Buffer.from(JSON.stringify({ roles: [role], sub: ownerId })).toString("base64url");
  await page.context().addCookies([{
    name: "access_token", value: `header.${claims}.signature`, domain: "127.0.0.1", path: "/",
  }]);
  let active = false;
  const posts: Record<string, unknown>[] = [];
  const savedPolicy = options.invalidPolicy
    ? { ...policy, allowedReplacementMachineTypes: ["CONVENTIONAL", "SMART_IOT"] }
    : policy;
  const contract = () => ({
    id: contractId, ownerId, machineId, status: active ? "ACTIVE" : "DRAFT",
    startDate: "2026-10-01", endDate: "2027-10-01", machineTypeSnapshot: "SMART_IOT",
    terms: options.missingTerms ? "" : "Điều khoản đã lưu từ lúc tạo hợp đồng",
    contractTermsSnapshot: savedPolicy, paygUnitPrice: 2500, monthlyRentalFee: 1000000,
  });
  const workOrder = {
    id: workOrderId, ownerId, contractId, machineId, machineType: "SMART_IOT", status: "COMPLETED",
    // Its calendar date differs from UTC: BE uses the date in this offset, not the browser timezone.
    completedAt: options.missingDate ? null : "2026-11-09T23:30:00-05:00",
    createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-10T04:30:00Z", createdBy: ownerId,
  };
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api\/dolores\/v1/, "");
    if (path === `/contracts/${contractId}/activate`) {
      posts.push(request.postDataJSON());
      active = true;
      return route.fulfill({ json: { ...contract(), startDate: "2026-11-09" } });
    }
    if (path === `/contracts/${contractId}`) return route.fulfill({ json: contract() });
    if (path === `/contracts/${contractId}/documents`) return route.fulfill({ json: [{
      id: otherId, contractId, documentType: "MAIN_CONTRACT", originalFilename: "signed.pdf",
      sizeBytes: 1024, version: 1, archivedAt: null,
    }] });
    if (path === "/installation-work-orders") {
      if (options.forbidden) return route.fulfill({ status: 403, json: {} });
      return route.fulfill({ json: options.unrelatedWorkOrder
        ? [{ ...workOrder, contractId: otherId }]
        : [
          { ...workOrder, id: otherId, completedAt: "2026-11-08T10:00:00Z" },
          workOrder,
        ] });
    }
    if (path === `/installation-work-orders/${workOrderId}` || path === `/installation-work-orders/${otherId}`) {
      return route.fulfill({ json: {
        workOrder: path.endsWith(otherId)
          ? { ...workOrder, id: otherId, completedAt: options.missingDate ? null : "2026-11-08T10:00:00Z" }
          : workOrder,
        checklistItems: [], accessories: [], evidence: [],
      } });
    }
    if (path.endsWith("/expiry-status")) return route.fulfill({ json: {} });
    if (path === "/profiles") return route.fulfill({ json: {
      items: [], page: 0, size: 100, totalElements: 0, totalPages: 0,
    } });
    return route.fulfill({ json: [] });
  });
  await page.goto(role === "admin"
    ? `/admin/contracts?view=detail&id=${contractId}`
    : `/moderator/contracts/${contractId}`);
  const panel = page.getByRole("region", { name: "Kích hoạt hợp đồng", exact: true });
  await expect(panel).toBeVisible();
  return { panel, posts, savedPolicy };
}

for (const role of ["admin", "moderator"] as const) {
  test(`${role}: activation uses saved terms and latest handover date without user input`, async ({ page }) => {
    const { panel, posts, savedPolicy } = await openContract(page, { role });
    await expect(panel.getByText("09/11/2026", { exact: true })).toBeVisible();
    await expect(panel.getByText("Điều khoản đã lưu từ lúc tạo hợp đồng", { exact: true })).toBeVisible();
    await expect(panel.locator("input, textarea")).toHaveCount(0);
    await panel.getByText("Chính sách vận hành đã lưu", { exact: true }).click();
    await expect(panel.getByText("66 phút", { exact: true })).toBeVisible();
    await expect(panel.getByText("Công ty", { exact: true })).toBeVisible();
    await panel.getByRole("button", { name: "Kích hoạt hợp đồng", exact: true }).click();
    expect(posts).toHaveLength(0);
    await panel.getByRole("button", { name: "Xác nhận kích hoạt", exact: true }).click();
    await expect.poll(() => posts.length).toBe(1);
    expect(posts[0]).toEqual({
      effectiveStartDate: "2026-11-09",
      terms: "Điều khoản đã lưu từ lúc tạo hợp đồng",
      contractTermsSnapshot: savedPolicy,
    });
    await expect(page.getByRole("heading", { name: "Hợp đồng đã kích hoạt", exact: true })).toBeVisible();
  });
}

test("Admin lets BE derive the handover date when work-order reads are forbidden", async ({ page }) => {
  const { panel, posts, savedPolicy } = await openContract(page, { role: "admin", forbidden: true });
  await expect(panel.getByText("Máy chủ tự xác định theo ngày bàn giao", { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Kích hoạt hợp đồng", exact: true }).click();
  await panel.getByRole("button", { name: "Xác nhận kích hoạt", exact: true }).click();
  await expect.poll(() => posts.length).toBe(1);
  expect(posts[0]).toEqual({ terms: "Điều khoản đã lưu từ lúc tạo hợp đồng", contractTermsSnapshot: savedPolicy });
});

for (const scenario of [
  { name: "invalid saved replacement policy", options: { invalidPolicy: true }, message: "Chính sách đã lưu chỉ được cho phép thay thế bằng đúng loại máy" },
  { name: "missing saved terms", options: { missingTerms: true }, message: "Hợp đồng chưa có điều khoản đã lưu hợp lệ" },
  { name: "completed work order without handover date", options: { missingDate: true }, message: "Lệnh lắp đặt đã hoàn tất nhưng chưa có ngày bàn giao" },
  { name: "completed work order for another contract", options: { unrelatedWorkOrder: true }, message: "Chưa có lệnh COMPLETED khớp mã hợp đồng" },
] satisfies Array<{ name: string; options: Options; message: string }>) {
  test(`activation blocks ${scenario.name} without asking the user to enter data`, async ({ page }) => {
    const { panel, posts } = await openContract(page, scenario.options);
    await expect(panel.getByText(scenario.message, { exact: false })).toBeVisible();
    const activate = panel.getByRole("button", { name: "Kích hoạt hợp đồng", exact: true });
    await expect(activate).toBeVisible();
    await expect(activate).toBeDisabled();
    await expect(panel.locator("input, textarea")).toHaveCount(0);
    expect(posts).toHaveLength(0);
  });
}

test("Moderator cannot use the Admin fallback when work-order reads are forbidden", async ({ page }) => {
  const { panel, posts } = await openContract(page, { forbidden: true });
  await expect(panel.getByRole("button", { name: "Tải lại", exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Kích hoạt hợp đồng", exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Kích hoạt hợp đồng", exact: true })).toBeDisabled();
  expect(posts).toHaveLength(0);
});
