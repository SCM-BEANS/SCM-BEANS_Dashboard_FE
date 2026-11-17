import { test, expect } from "@playwright/test";

test("owner live 3D follows telemetry packets, ignores brew history and old packets, and separates simulation", async ({ page }) => {
  test.setTimeout(90_000);
  const machineId = "16cafe6e-9448-4578-a4c9-f00954bc9ed1";
  const ownerId = "00000000-0000-4000-8000-000000000001";
  let state = "GRINDING", sequence = 20, online = true, unavailable = false, reads = 0, writes = 0;
  let deviceTime: number | undefined;
  const serverOffset = 3_600_000;
  const records: object[] = [];
  await page.context().addCookies([{ name: "access_token", value: `header.${Buffer.from(JSON.stringify({ roles: ["owner"], sub: ownerId })).toString("base64url")}.signature`, url: test.info().project.use.baseURL as string }]);
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api/dolores/v1", "");
    let body: unknown = [], status = 200;
    if (route.request().method() !== "GET") writes++;
    if (path === `/machines/${machineId}`) body = { id: machineId, ownerId, serialNumber: "LIVE-TEST-001", machineType: "SMART_IOT", status: "DEPLOYED_CONTRACT_OWNER" };
    else if (path.endsWith("heartbeats/latest")) {
      reads++;
      if (unavailable) { status = 502; body = { message: "Service unavailable" }; }
      else body = { machineId, status: online ? "ONLINE" : "OFFLINE", evaluatedAt: new Date(Date.now() + serverOffset).toISOString(), lastSeenAt: new Date(Date.now() + serverOffset).toISOString(), deviceReportedAt: new Date((deviceTime ?? Date.now()) + serverOffset).toISOString(), brewState: `BREW_STATE_${state}`, sequenceNumber: sequence, metricsJson: { fsm_state: state, recipe_step: 3, recipe_name: "Espresso", simulated: true } };
    } else if (path === "/owner/brew-records") body = { content: records, page: 0, size: 100, totalElements: records.length, totalPages: Math.ceil(records.length / 100), first: true, last: true };
    else if (path === "/notifications/unread-count") body = { unreadCount: 0 };
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  // Keep this transport/UI check independent of headless WebGL and large model downloads.
  await page.route("**/models/**", route => route.abort());
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(`/dashboard/machines/${machineId}?tab=model`);
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  const live = page.getByRole("region", { name: "Bước hiện tại", exact: true });
  const viewer = page.locator("[data-operation-phase]");
  await expect(live).toHaveAttribute("data-live-brew-state", "GRINDING");
  await expect(viewer).toHaveAttribute("data-operation-phase", "grinding");
  await expect(viewer).toHaveAttribute("data-operation-sequence", "20");
  await expect(live.getByText("Đang nhận dữ liệu telemetry thử từ thiết bị.")).toBeVisible();
  const before = reads;
  records.push({ id: ownerId, eventId: ownerId, machineId, machineSerialNumber: "LIVE-TEST-001", recipeName: "Espresso", brewedAt: new Date(Date.now() - 1000).toISOString(), receivedAt: new Date().toISOString() });
  await expect(page.getByRole("button", { name: "Xem lại", exact: true })).toBeVisible({ timeout: 12_000 });
  await expect.poll(() => reads - before).toBeGreaterThanOrEqual(3);
  await expect(viewer).toHaveAttribute("data-operation-phase", "grinding");
  await expect(viewer).toHaveAttribute("data-operation-sequence", "20");

  state = "TAMPING_ACCORDING_TO_RECIPE"; sequence = 21;
  await expect(viewer).toHaveAttribute("data-operation-phase", "tamping");
  state = "GRINDING"; sequence = 19; deviceTime = Date.now() - 5000;
  const oldReads = reads;
  await expect.poll(() => reads).toBeGreaterThan(oldReads);
  await expect(viewer).toHaveAttribute("data-operation-sequence", "21");
  await expect(live).toHaveAttribute("data-live-brew-state", "TAMPING_ACCORDING_TO_RECIPE");

  state = "MAIN_EXTRACTION"; sequence = 22; deviceTime = undefined;
  await expect(viewer).toHaveAttribute("data-operation-phase", "extraction");
  await expect(live.getByText("Đang chiết xuất", { exact: true })).toBeVisible();
  await live.scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath("digital-twin-live-telemetry.png") });
  // A temporary offline heartbeat must not erase the extraction step or require a reload.
  online = false;
  await expect(page.getByText("D\u1eef li\u1ec7u \u0111ang ch\u1eadm", { exact: true })).toBeVisible();
  await expect(live).toHaveAttribute("data-live-brew-state", "MAIN_EXTRACTION");
  online = true; state = "COMPLETE"; sequence = 23;
  await expect(live).toHaveAttribute("data-live-brew-state", "COMPLETE");
  const completedReads = reads;
  await expect.poll(() => reads).toBeGreaterThanOrEqual(completedReads + 3);
  await expect(live).toHaveAttribute("data-live-brew-state", "COMPLETE");
  await expect(page.getByRole("tabpanel", { name: "Xem m\u00e1y 3D" }).getByText("\u0110ang k\u1ebft n\u1ed1i", { exact: true })).toBeVisible();
  await expect(page.getByText("D\u1eef li\u1ec7u \u0111ang ch\u1eadm", { exact: true })).toHaveCount(0);
  state = "GRINDING"; sequence = 1;
  await expect(viewer).toHaveAttribute("data-operation-sequence", "1");
  await expect(live).toHaveAttribute("data-live-brew-state", "GRINDING");
  unavailable = true;
  await expect(page.getByRole("tabpanel", { name: "Xem m\u00e1y 3D" }).locator('[data-state="reconnecting"]')).toBeVisible();
  await expect(live).toHaveAttribute("data-live-brew-state", "GRINDING");
  await expect(live.getByRole("heading", { name: "B\u01b0\u1edbc hi\u1ec7n t\u1ea1i", exact: true })).toBeVisible();
  await expect(viewer).toHaveAttribute("data-operation-phase", "grinding");
  unavailable = false; state = "ERROR"; sequence = 2;
  await expect(viewer).toHaveAttribute("data-operation-phase", "fault");
  state = "IDLE"; sequence = 3;
  await expect(live).toHaveAttribute("data-live-brew-state", "IDLE");

  await page.getByRole("button", { name: "Xem lại", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mô phỏng", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-live-brew-state]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Dừng", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Dừng", exact: true }).click();
  await page.getByRole("button", { name: "Chạy món này", exact: true }).click();
  await expect(page.getByRole("button", { name: "Dừng", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Trực tiếp", exact: true }).click();
  await expect(live).toHaveAttribute("data-live-brew-state", "IDLE");
  await expect(viewer).toHaveAttribute("data-operation-phase", "idle");
  expect(writes).toBe(0);
});
