import { expect, test, type Page } from "@playwright/test";

const machineId = "f1000000-0000-4000-8000-000000000004";
const ownerId = "f1000000-0000-4000-8000-000000000001";
const certificateId = "f1000000-0000-4000-8000-000000000008";
const issuedId = "f1000000-0000-4000-8000-000000000009";
const menuId = "f1000000-0000-4000-8000-000000000010";
const machine = { id: machineId, ownerId, serialNumber: "E2E-CERT-01", machineType: "SMART_IOT", status: "IN_WAREHOUSE" };
const certificate = {
  id: certificateId, machineId, ownerId, commonName: machine.serialNumber,
  organization: "Dolores Fleet", fingerprint: "a".repeat(64), certificateSerial: "1794029485731",
  spiffeId: "spiffe://dolores/machine/E2E-CERT-01", issuedAt: "2026-11-07T00:00:00",
  expiresAt: "2027-11-07T00:00:00", status: "ACTIVE",
};

function tokenFor(role: string) {
  return `header.${Buffer.from(JSON.stringify({ sub: ownerId, roles: [role] })).toString("base64url")}.signature`;
}

async function mockMachineApi(page: Page, options: { deniedMachine?: boolean; issueError?: boolean; identity?: string | null; identityDenied?: boolean; identityPostError?: boolean; menu?: boolean; menuReadDenied?: boolean; menuReadStatus?: number; menuPutUnknown?: boolean; syncPanel?: boolean; menuPutGate?: Promise<void> } = {}) {
  const calls: { path: string; method: string }[] = [];
  let certificates = [certificate];
  let deviceId = options.identity === undefined ? machine.serialNumber : options.identity;
  let activeMenuId: string | null = null;
  await page.route("**/api/dolores/v1/**", async (route) => {
    const request = route.request(), url = new URL(request.url());
    const path = url.pathname.replace("/api/dolores/v1", "");
    calls.push({ path, method: request.method() });
    let body: unknown = [];
    if (path === `/machines/${machineId}/active-menu` || path.startsWith(`/machines/${machineId}/active-menu/`)) {
      if (!options.menu || options.menuReadDenied || options.menuReadStatus) { await route.fulfill({ status: options.menuReadStatus ?? 404, contentType: "application/json", body: "{}" }); return; }
      if (request.method() === "PUT") {
        await options.menuPutGate;
        activeMenuId = menuId;
        await route.fulfill({ status: options.menuPutUnknown ? 503 : 200, contentType: "application/json", body: JSON.stringify(options.menuPutUnknown ? { message: "Queue unavailable" } : {
          machineId, activeMenuId, menuName: "Owner summer menu", commandId: null, targetVersion: null, targetHash: null, syncState: null, syncRequested: false, syncError: "Queue unavailable",
        }) });
        return;
      }
      if (request.method() === "DELETE") { activeMenuId = null; await route.fulfill({ status: 204 }); return; }
      body = { machineId, activeMenuId, menuName: activeMenuId ? "Owner summer menu" : null, fallbackStrategy: activeMenuId ? "ACTIVE_OWNER_MENU" : "SYSTEM_DEFAULT_OR_GLOBAL_FALLBACK", description: "Machine menu readback" };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
      return;
    }
    if (path === `/machines/${machineId}/available-menus`) {
      body = [{ id: menuId, ownerId, name: "Owner summer menu", createdAt: "2026-11-08T00:15:00Z" }];
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
      return;
    }
    if (options.syncPanel && path === "/machines") {
      body = [{ ...machine, id: certificateId, serialNumber: "OTHER-MACHINE-ON-FIRST-ROW" }, machine];
      await route.fulfill({ status: 200, contentType: "application/json", headers: { "X-Has-Next": "false" }, body: JSON.stringify(body) });
      return;
    }
    if (options.syncPanel && path.startsWith("/recipes/sync")) {
      const mismatchedAck = { machineId, targetVersion: 3, targetHash: "target-v3", appliedVersion: 2, appliedHash: "old-v2", commandId: certificateId, state: "APPLIED", retryCount: 0, lastError: null, requestedAt: "2026-11-08T00:15:00Z", lastAttemptAt: null, appliedAt: "2026-11-08T00:15:01Z", expiresAt: null };
      body = path.endsWith("/history") ? [] : request.method() === "POST" ? [mismatchedAck] : mismatchedAck;
      await route.fulfill({ status: request.method() === "POST" ? 202 : 200, contentType: "application/json", headers: { "X-Has-Next": "false" }, body: JSON.stringify(body) });
      return;
    }
    if (path === `/machines/${machineId}/telemetry-device-identity`) {
      if (options.identityDenied) { await route.fulfill({ status: 403, contentType: "application/json", body: "{}" }); return; }
      if (request.method() === "DELETE") { deviceId = null; await route.fulfill({ status: 204 }); return; }
      if (request.method() === "POST") deviceId = request.postDataJSON().deviceId;
      if (request.method() === "POST" && options.identityPostError) { await route.fulfill({ status: 503, contentType: "application/json", body: "{}" }); return; }
      await route.fulfill({ status: deviceId ? request.method() === "POST" ? 201 : 200 : 404, contentType: "application/json", body: JSON.stringify(deviceId ? { id: certificateId, machineId, deviceId, status: "ACTIVE", createdAt: "2026-11-07T00:00:00" } : {}) });
      return;
    }
    if (path === `/machines/${machineId}`) {
      await route.fulfill({ status: options.deniedMachine ? 403 : 200, contentType: "application/json", body: JSON.stringify(options.deniedMachine ? { message: "Forbidden" } : machine) });
      return;
    }
    if (path === `/machines/${machineId}/certificates`) {
      if (request.method() === "POST") {
        if (options.issueError) {
          await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Issuance result unknown" }) });
          return;
        }
        const issued = { ...certificate, id: issuedId, certificateSerial: "1794029485732" };
        certificates = [issued, ...certificates];
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(issued) });
        return;
      }
      const status = url.searchParams.get("status");
      const content = certificates.filter((item) => !status || item.status === status);
      body = { content, number: Number(url.searchParams.get("page") ?? 0), size: Number(url.searchParams.get("size") ?? 50), totalElements: content.length, totalPages: content.length ? 1 : 0, first: true, last: true };
    } else if (path.startsWith(`/machines/${machineId}/certificates/`)) {
      const id = path.split("/")[4];
      const item = certificates.find((entry) => entry.id === id) ?? certificate;
      if (request.method() === "DELETE") {
        certificates = certificates.filter((entry) => entry.id !== id);
        await route.fulfill({ status: 204 });
        return;
      }
      if (path.endsWith("/download")) {
        await route.fulfill({ status: 200, contentType: "application/zip", headers: { "Content-Disposition": "attachment; filename=machine-certs.zip" }, body: Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("PRIVATE_KEY_DOWNLOAD_ONLY")]) });
        return;
      }
      body = { ...item, clientCrtPem: "-----BEGIN CERTIFICATE-----\nPUBLIC_CLIENT_PEM\n-----END CERTIFICATE-----", caCrtPem: "-----BEGIN CERTIFICATE-----\nPUBLIC_CA_PEM\n-----END CERTIFICATE-----" };
    } else if (path.endsWith("/maintenance-schedule")) {
      body = { nextPreventiveMaintenanceAt: null, cupsServedSinceLastDescale: 0 };
    } else if (path.includes("/heartbeats/latest")) {
      body = { machineId, status: "UNKNOWN" };
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  return calls;
}

async function openAdminSetup(page: Page) {
  await page.goto(`/admin/machines/${machineId}`);
  await page.getByRole("tab", { name: "Thiết lập kết nối", exact: true }).click();
  return page.getByRole("region", { name: "Chứng chỉ kết nối", exact: true });
}

for (const role of ["admin", "moderator", "owner", "technician"]) {
  test(`${role} sees GPS separately from heartbeat with desktop and mobile layouts`, async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor(role), domain: "127.0.0.1", path: "/" }]);
    await mockMachineApi(page);
    let heartbeat = { machineId, status: "ONLINE", latitude: 10.7769, longitude: 106.7009 };
    await page.route("**/api/dolores/v1/telemetry-query/machines/*/heartbeats/latest", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(heartbeat) }));
    const path = role === "technician" ? `/technician/machine-check/${machineId}` : `/${role === "owner" ? "dashboard" : role}/machines/${machineId}/operations?tab=connection`;
    await page.goto(path);
    await expect(page.getByText("10.776900", { exact: true })).toBeVisible();
    await expect(page.getByText("106.700900", { exact: true })).toBeVisible();
    heartbeat = { ...heartbeat, latitude: 0, longitude: 0 };
    await page.reload();
    await expect(page.getByText("Chưa ghi nhận vị trí", { exact: true })).toBeVisible();
    await expect(page.getByText(/Máy đang kết nối nhưng chưa gửi vị trí GPS hợp lệ/)).toBeVisible();
    heartbeat = { ...heartbeat, latitude: 999, longitude: 106.7009 };
    await page.reload();
    await expect(page.getByText(/Máy đang kết nối nhưng chưa gửi vị trí GPS hợp lệ/)).toBeVisible();
    heartbeat = { ...heartbeat, status: "OFFLINE", latitude: 10.7769 };
    await page.reload();
    await expect(page.getByText("Tọa độ ghi nhận gần nhất", { exact: true })).toBeVisible();
    await expect(page.getByText(/Máy đang kết nối nhưng chưa gửi vị trí GPS hợp lệ/)).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByText("106.700900", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  });
}

for (const role of ["admin", "moderator"]) {
  test(`${role} edits the saved heartbeat tolerance through the policy amendment API`, async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor(role), domain: "127.0.0.1", path: "/" }]);
    await mockMachineApi(page);
    const snapshot = { policyVersion: 1, maintenanceIntervalMonths: 3, maintenanceWindowDays: 10, allowedReplacementMachineTypes: ["SMART_IOT"], repairCostResponsibility: "COMPANY", paymentDueEligibleDays: 10, offlineViolationAction: "WARN_ONLY", buybackEnabled: true, buybackMinimumMonths: 0, buybackValuationMethod: "MANUAL_APPRAISAL", offlineLimitMinutes: 2880, heartbeatToleranceSeconds: 75 };
    let contract = { id: certificateId, ownerId, machineId, status: "ACTIVE", startDate: "2026-11-01", endDate: "2027-11-01", contractTermsSnapshot: snapshot, offlineLimitMinutes: 2880 };
    let submitted: { snapshot: typeof snapshot } | undefined;
    await page.route(`**/api/dolores/v1/contracts/${certificateId}**`, async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/policy-amendments")) {
        submitted = route.request().postDataJSON();
        contract = { ...contract, contractTermsSnapshot: submitted!.snapshot };
        return route.fulfill({ json: contract });
      }
      return route.fulfill({ json: path.endsWith(certificateId) ? contract : [] });
    });
    await page.goto(role === "admin" ? `/admin/contracts?view=detail&id=${certificateId}` : `/moderator/contracts/${certificateId}`);
    await page.getByRole("button", { name: "Sửa chính sách", exact: true }).click();
    const form = page.locator(role === "admin" ? "#contract-policy-amend-form" : "#moderator-contract-policy-amend-form");
    const tolerance = form.getByLabel("Ngưỡng mất kết nối (giây) *", { exact: true });
    await expect(tolerance).toHaveValue("75");
    await tolerance.fill("4");
    expect(await tolerance.evaluate((element: HTMLInputElement) => element.validity.rangeUnderflow)).toBe(true);
    await tolerance.fill("90");
    await form.getByLabel("Lý do *", { exact: true }).fill("Điều chỉnh ngưỡng kết nối");
    await form.getByLabel("Ngày hiệu lực *", { exact: true }).fill("2026-11-10");
    await page.getByRole("button", { name: "Xác nhận sửa đổi", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: role === "admin" ? "Tiếp tục" : "Xác nhận", exact: true }).click();
    await expect.poll(() => submitted?.snapshot.heartbeatToleranceSeconds).toBe(90);
    expect(submitted?.snapshot.offlineLimitMinutes).toBe(2880);
    await page.reload();
    await expect(page.getByText("90 giây", { exact: true })).toBeVisible();
  });
}

test.describe("Machine provisioning Phase 02", () => {
  test("Admin reads back identity after registration, refresh and confirmed revocation", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("admin"), domain: "127.0.0.1", path: "/" }]);
    const calls = await mockMachineApi(page, { identity: null });
    await openAdminSetup(page);
    const identity = page.getByRole("region", { name: "Định danh thiết bị", exact: true });
    await expect(identity.getByText(/Chưa có định danh/)).toBeVisible();
    await identity.getByLabel("Mã thiết bị", { exact: true }).fill(machine.serialNumber);
    await identity.getByRole("button", { name: "Đăng ký định danh", exact: true }).click();
    await expect(identity.getByText(machine.serialNumber, { exact: true }).first()).toBeVisible();
    await page.reload();
    await page.getByRole("tab", { name: "Thiết lập kết nối", exact: true }).click();
    await expect(identity.getByText(machine.serialNumber, { exact: true }).first()).toBeVisible();
    await identity.getByRole("button", { name: "Thu hồi định danh", exact: true }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByText(machine.serialNumber, { exact: true })).toHaveCount(2);
    await dialog.getByRole("button", { name: "Thu hồi định danh", exact: true }).click();
    await expect(identity.getByText(/Chưa có định danh/)).toBeVisible();
    expect(calls.filter((call) => call.path.endsWith("telemetry-device-identity") && call.method === "POST")).toHaveLength(1);
    expect(calls.filter((call) => call.path.endsWith("telemetry-device-identity") && call.method === "DELETE")).toHaveLength(1);
  });

  test("unknown identity registration is reconciled by GET without another POST", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("admin"), domain: "127.0.0.1", path: "/" }]);
    const calls = await mockMachineApi(page, { identity: null, identityPostError: true });
    await openAdminSetup(page);
    const identity = page.getByRole("region", { name: "Định danh thiết bị", exact: true });
    await identity.getByRole("button", { name: "Đăng ký định danh", exact: true }).click();
    await expect(identity.getByText(machine.serialNumber, { exact: true }).first()).toBeVisible();
    await expect(identity.getByRole("button", { name: "Đăng ký định danh", exact: true })).toHaveCount(0);
    expect(calls.filter((call) => call.path.endsWith("telemetry-device-identity") && call.method === "POST")).toHaveLength(1);
    expect(calls.filter((call) => call.path.endsWith("telemetry-device-identity") && call.method === "GET").length).toBeGreaterThanOrEqual(2);
  });

  for (const role of ["admin", "technician"]) test(`${role} cannot issue when active device identity differs from serial`, async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor(role), domain: "127.0.0.1", path: "/" }]);
    const calls = await mockMachineApi(page, { identity: "CUSTOM-DEVICE-ID" });
    if (role === "admin") await openAdminSetup(page); else await page.goto(`/technician/machine-check/${machineId}`);
    const panel = page.getByRole("region", { name: "Chứng chỉ kết nối", exact: true });
    await expect(page.getByText("CUSTOM-DEVICE-ID", { exact: true })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Phát hành chứng chỉ", exact: true })).toBeDisabled();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
    if (role === "technician") await expect(page.getByRole("button", { name: "Thu hồi định danh", exact: true })).toHaveCount(0);
  });

  test("identity permission denial blocks certificate issuance without an automatic retry", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("technician"), domain: "127.0.0.1", path: "/" }]);
    const calls = await mockMachineApi(page, { identityDenied: true });
    await page.goto(`/technician/machine-check/${machineId}`);
    const identity = page.getByRole("region", { name: "Định danh thiết bị", exact: true });
    await expect(identity.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("button", { name: "Phát hành chứng chỉ", exact: true })).toBeDisabled();
    expect(calls.filter((call) => call.path.endsWith("telemetry-device-identity"))).toHaveLength(1);
  });
  test("Admin browses public certificate details, issues and confirms deletion", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("admin"), domain: "127.0.0.1", path: "/" }]);
    const calls = await mockMachineApi(page);
    const panel = await openAdminSetup(page);
    await expect(panel.getByText("1794029485731", { exact: true })).toBeVisible();
    await panel.getByRole("button", { name: "Xem chi tiết", exact: true }).click();
    await expect(panel.getByText("PUBLIC_CLIENT_PEM", { exact: false })).toBeAttached();
    await panel.getByRole("button", { name: "Phát hành chứng chỉ", exact: true }).click();
    await expect(panel.getByText("1794029485732", { exact: true })).toBeVisible();
    expect(calls.filter((call) => call.method === "POST" && call.path.endsWith("/certificates"))).toHaveLength(1);
    const row = panel.getByRole("row").filter({ hasText: "1794029485732" });
    await row.getByRole("button", { name: "Xóa chứng chỉ", exact: true }).click();
    const confirmation = page.getByRole("alertdialog");
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole("button", { name: "Xóa chứng chỉ", exact: true }).click();
    await expect(panel.getByText("1794029485732", { exact: true })).toHaveCount(0);
    expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(1);
  });

  test("Technician with a denied machine never requests certificate data", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("technician"), domain: "127.0.0.1", path: "/" }]);
    const calls = await mockMachineApi(page, { deniedMachine: true });
    await page.goto(`/technician/machine-check/${machineId}`);
    await expect(page.getByRole("alert").filter({ hasText: /không có quyền/ }).first()).toBeVisible();
    expect(calls.some((call) => call.path.includes("/certificates"))).toBe(false);
  });

  test("Technician downloads a certificate bundle without rendering or storing its private content", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("technician"), domain: "127.0.0.1", path: "/" }]);
    await mockMachineApi(page);
    await page.goto(`/technician/machine-check/${machineId}`);
    const panel = page.getByRole("region", { name: "Chứng chỉ kết nối", exact: true });
    await expect(panel.getByText("1794029485731", { exact: true })).toBeVisible();
    const downloadPromise = page.waitForEvent("download");
    await panel.getByRole("button", { name: "Tải ZIP", exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.zip$/);
    await expect(page.getByText("PRIVATE_KEY_DOWNLOAD_ONLY", { exact: false })).toHaveCount(0);
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain("PRIVATE_KEY_DOWNLOAD_ONLY");
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  });

  test("uncertain issuance blocks another POST until the certificate list is refreshed", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("admin"), domain: "127.0.0.1", path: "/" }]);
    const calls = await mockMachineApi(page, { issueError: true });
    const panel = await openAdminSetup(page);
    const issue = panel.getByRole("button", { name: "Phát hành chứng chỉ", exact: true });
    await expect(issue).toBeEnabled();
    await issue.click();
    await expect(panel.getByRole("alert")).toBeVisible();
    await expect(issue).toBeDisabled();
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
    await panel.getByRole("button", { name: "Làm mới", exact: true }).click();
    await expect(issue).toBeEnabled();
  });
});

test.describe("Machine active menu Phase 03", () => {
  for (const role of ["admin", "owner"]) test(`${role} preserves selected machine, locks concurrent sync and only retries on explicit request`, async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor(role), domain: "127.0.0.1", path: "/" }]);
    let releasePut!: () => void;
    const menuPutGate = new Promise<void>((resolve) => { releasePut = resolve; });
    const calls = await mockMachineApi(page, { menu: true, syncPanel: true, menuPutGate });
    await page.goto((role === "admin" ? "/admin/menu" : "/dashboard/menu/sync") + `?syncMachineId=${machineId}`);
    if (role === "admin") await page.getByRole("button", { name: "Theo dõi đồng bộ", exact: true }).click();
    const panel = page.getByRole("region", { name: "Menu đang gán cho máy", exact: true });
    const machineSelect = page.getByRole("combobox", { name: /Máy cần theo dõi/ });
    await expect(machineSelect).toHaveValue(machineId);
    await panel.getByLabel("Chọn menu cho máy", { exact: true }).selectOption(menuId);
    await panel.getByRole("button", { name: "Gán menu & đồng bộ", exact: true }).click();
    await expect.poll(() => calls.filter((call) => call.method === "PUT").length).toBe(1);
    await expect(machineSelect).toBeDisabled();
    await expect(page.getByRole("button", { name: "Yêu cầu đồng bộ lại", exact: true })).toBeDisabled();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
    releasePut();
    await expect(panel.getByRole("button", { name: "Thử đồng bộ lại", exact: true })).toBeEnabled();
    await expect(machineSelect).toBeEnabled();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
    await panel.getByRole("button", { name: "Thử đồng bộ lại", exact: true }).click();
    await expect.poll(() => calls.filter((call) => call.method === "POST" && call.path === "/recipes/sync").length).toBe(1);
    await expect(page.getByText("Cần kiểm tra xác nhận phiên bản từ máy", { exact: true })).toBeVisible();
    await expect(page.getByText("Máy đã áp dụng", { exact: true })).toHaveCount(0);
    await page.reload();
    if (role === "admin") await page.getByRole("button", { name: "Theo dõi đồng bộ", exact: true }).click();
    await expect(machineSelect).toHaveValue(machineId);
    await expect(panel.getByText("Owner summer menu", { exact: true }).first()).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`syncMachineId=${machineId}`));
    expect(calls.some((call) => call.path.includes("/recipe-menus/local"))).toBe(false);
  });

  test("Technician assigns a scoped menu, reconciles saved-but-unsent and restores default after confirmation", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("technician"), domain: "127.0.0.1", path: "/" }]);
    const calls = await mockMachineApi(page, { menu: true });
    await page.goto(`/technician/machine-check/${machineId}`);
    const panel = page.getByRole("region", { name: "Menu đang gán cho máy", exact: true });
    await expect(panel.getByText("Menu tiêu chuẩn hệ thống (Mặc định)", { exact: true })).toBeVisible();
    await panel.getByLabel("Chọn menu cho máy", { exact: true }).selectOption(menuId);
    await panel.getByRole("button", { name: "Gán menu & đồng bộ", exact: true }).click();
    await expect(panel.getByText("Owner summer menu", { exact: true }).first()).toBeVisible();
    await expect(panel.getByRole("status").filter({ hasText: "Đã lưu menu, nhưng chưa phát được lệnh tới máy" })).toBeVisible();
    expect(calls.filter((call) => call.method === "PUT")).toEqual([{ path: `/machines/${machineId}/active-menu/${menuId}`, method: "PUT" }]);
    expect(calls.filter((call) => call.path === `/machines/${machineId}/active-menu` && call.method === "GET").length).toBeGreaterThanOrEqual(2);
    expect(calls.some((call) => call.path.includes("/recipe-menus/local") || call.method === "POST" && call.path.includes("/recipes/sync"))).toBe(false);
    await page.reload();
    await expect(panel.getByText("Owner summer menu", { exact: true }).first()).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await panel.getByRole("button", { name: "Dùng menu mặc định", exact: true }).click();
    await expect(panel.getByText("Menu tiêu chuẩn hệ thống (Mặc định)", { exact: true })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Dùng menu mặc định", exact: true })).toBeDisabled();
    expect(calls.filter((call) => call.method === "DELETE")).toEqual([{ path: `/machines/${machineId}/active-menu`, method: "DELETE" }]);
    await page.reload();
    await expect(panel.getByText("Menu tiêu chuẩn hệ thống (Mặc định)", { exact: true })).toBeVisible();
  });

  test("unknown menu assignment reconciles authoritative GET without replaying PUT", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("technician"), domain: "127.0.0.1", path: "/" }]);
    const calls = await mockMachineApi(page, { menu: true, menuPutUnknown: true });
    await page.goto(`/technician/machine-check/${machineId}`);
    const panel = page.getByRole("region", { name: "Menu đang gán cho máy", exact: true });
    await panel.getByLabel("Chọn menu cho máy", { exact: true }).selectOption(menuId);
    await panel.getByRole("button", { name: "Gán menu & đồng bộ", exact: true }).click();
    await expect(panel.getByRole("alert")).toBeVisible();
    await expect(panel.getByText("Owner summer menu", { exact: true }).first()).toBeVisible();
    expect(calls.filter((call) => call.method === "PUT")).toHaveLength(1);
    expect(calls.filter((call) => call.path === `/machines/${machineId}/active-menu` && call.method === "GET").length).toBeGreaterThanOrEqual(2);
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  for (const status of [404, 405]) test(`unavailable active-menu readback ${status} never requests candidate menus or enables assignment`, async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("technician"), domain: "127.0.0.1", path: "/" }]);
    const calls = await mockMachineApi(page, { menu: true, menuReadStatus: status });
    await page.goto(`/technician/machine-check/${machineId}`);
    const panel = page.getByRole("region", { name: "Menu đang gán cho máy", exact: true });
    await expect(panel.getByRole("alert")).toHaveText(status === 404 ? /Không tìm thấy thông tin thiết bị hoặc bạn không có quyền/ : /Dịch vụ chưa hỗ trợ cấu hình menu/);
    await expect(panel.getByRole("button", { name: "Gán menu & đồng bộ", exact: true })).toHaveCount(0);
    expect(calls.some((call) => call.path.endsWith("/available-menus") || call.method === "PUT")).toBe(false);
  });
});

test.describe("Machine provisioning cross-role Phase 04", () => {
  test("Technician certificate access revocation removes previously loaded public details and download actions", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("technician"), domain: "127.0.0.1", path: "/" }]);
    await mockMachineApi(page);
    await page.goto(`/technician/machine-check/${machineId}`);
    const panel = page.getByRole("region", { name: "Chứng chỉ kết nối", exact: true });
    await panel.getByRole("button", { name: "Xem chi tiết", exact: true }).click();
    await expect(panel.getByRole("heading", { name: "Chi tiết chứng chỉ", exact: true })).toBeVisible();
    await expect(panel.getByText("PUBLIC_CLIENT_PEM", { exact: false })).toBeAttached();
    await page.route(`**/api/dolores/v1/machines/${machineId}/certificates?**`, async (route) => {
      await route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message: "Machine grant revoked" }) });
    });
    await panel.getByRole("button", { name: "Làm mới", exact: true }).click();
    await expect(panel.getByRole("alert")).toBeVisible();
    await expect(panel.getByRole("button", { name: "Phát hành chứng chỉ", exact: true })).toBeDisabled();
    await expect(panel.getByRole("heading", { name: "Chi tiết chứng chỉ", exact: true })).toHaveCount(0);
    await expect(panel.getByText("PUBLIC_CLIENT_PEM", { exact: false })).toHaveCount(0);
    await expect(panel.getByText("PUBLIC_CA_PEM", { exact: false })).toHaveCount(0);
    await expect(panel.getByRole("button", { name: /^(Tải ZIP|Tải JSON|Xóa chứng chỉ)$/ })).toHaveCount(0);
  });

  test("Owner denied active-menu readback cannot fetch candidates or mutate device setup", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("owner"), domain: "127.0.0.1", path: "/" }]);
    const calls = await mockMachineApi(page, { menu: true, syncPanel: true, menuReadStatus: 404 });
    await page.goto(`/dashboard/menu/sync?syncMachineId=${machineId}`);
    const panel = page.getByRole("region", { name: "Menu đang gán cho máy", exact: true });
    await expect(panel.getByRole("alert")).toHaveText(/Không tìm thấy thông tin thiết bị hoặc bạn không có quyền/);
    await expect(panel.getByRole("combobox")).toHaveCount(0);
    await expect(panel.getByRole("button", { name: "Gán menu & đồng bộ", exact: true })).toHaveCount(0);
    expect(calls.some((call) => call.path.endsWith("/available-menus") || /certificates|telemetry-device-identity/.test(call.path) || ["PUT", "DELETE"].includes(call.method))).toBe(false);
  });

  test("switching machine while previous menu GET is pending never renders the old machine menu", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("owner"), domain: "127.0.0.1", path: "/" }]);
    await mockMachineApi(page, { menu: true, syncPanel: true });
    let releaseOld!: () => void;
    const oldGate = new Promise<void>((resolve) => { releaseOld = resolve; });
    let oldReadStarted = false;
    let oldReadCompleted = false;
    await page.route(`**/api/dolores/v1/machines/${machineId}/active-menu`, async (route) => {
      oldReadStarted = true;
      await oldGate;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ machineId, activeMenuId: menuId, menuName: "STALE OLD MACHINE MENU", fallbackStrategy: "ACTIVE_OWNER_MENU", description: "Old scoped response" }) });
      oldReadCompleted = true;
    });
    await page.route(`**/api/dolores/v1/machines/${certificateId}/active-menu`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ machineId: certificateId, activeMenuId: menuId, menuName: "Current second machine menu", fallbackStrategy: "ACTIVE_OWNER_MENU", description: "New scoped response" }) });
    });
    await page.route(`**/api/dolores/v1/machines/${certificateId}/available-menus`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    await page.goto(`/dashboard/menu/sync?syncMachineId=${machineId}`);
    await expect.poll(() => oldReadStarted).toBe(true);
    const machineSelect = page.getByRole("combobox", { name: /Máy cần theo dõi/ });
    await machineSelect.selectOption(certificateId);
    const panel = page.getByRole("region", { name: "Menu đang gán cho máy", exact: true });
    await expect(panel.getByText("Current second machine menu", { exact: true })).toBeVisible();
    releaseOld();
    await expect.poll(() => oldReadCompleted).toBe(true);
    await expect(panel.getByText("Current second machine menu", { exact: true })).toBeVisible();
    await expect(page.getByText("STALE OLD MACHINE MENU", { exact: true })).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`syncMachineId=${certificateId}`));
  });

  test("Moderator menu management never exposes machine provisioning or active-menu controls", async ({ page, context }) => {
    await context.addCookies([{ name: "access_token", value: tokenFor("moderator"), domain: "127.0.0.1", path: "/" }]);
    const calls = await mockMachineApi(page);
    await page.route("**/api/dolores/v1/recipe-menus/global?**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ content: [{ id: menuId, name: "Moderator shared library", createdAt: "2026-11-08T00:15:00Z" }], page: 0, size: 20, totalElements: 1, totalPages: 1, first: true, last: true }) });
    });
    await page.goto("/moderator/menu");
    await expect(page.getByText("Moderator shared library", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Theo dõi đồng bộ", exact: true })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Menu đang gán cho máy", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Phát hành chứng chỉ", exact: true })).toHaveCount(0);
    expect(calls.some((call) => /certificates|telemetry-device-identity|active-menu|available-menus/.test(call.path))).toBe(false);
  });
});
