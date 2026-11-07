import { expect, test, type Page } from "@playwright/test";

const machineId = "f1000000-0000-4000-8000-000000000004";
const ownerId = "f1000000-0000-4000-8000-000000000001";
const certificateId = "f1000000-0000-4000-8000-000000000008";
const issuedId = "f1000000-0000-4000-8000-000000000009";
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

async function mockMachineApi(page: Page, options: { deniedMachine?: boolean; issueError?: boolean } = {}) {
  const calls: { path: string; method: string }[] = [];
  let certificates = [certificate];
  await page.route("**/api/dolores/v1/**", async (route) => {
    const request = route.request(), url = new URL(request.url());
    const path = url.pathname.replace("/api/dolores/v1", "");
    calls.push({ path, method: request.method() });
    let body: unknown = [];
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

test.describe("Machine provisioning Phase 02", () => {
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
