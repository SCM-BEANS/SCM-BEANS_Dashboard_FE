import { test, expect, type Page } from "@playwright/test";

const machineId = "00000000-0000-4000-8000-000000000001";
const otherMachine = "00000000-0000-4000-8000-000000000002";
async function setup(page: Page, path = "/moderator/machine-history", fail = false) {
  const machines = [{ id: machineId, serialNumber: "DOLORES-001" }, { id: otherMachine, serialNumber: "DOLORES-002" }];
  const tickets = Array.from({ length: 14 }, (_, index) => ({ id: `00000000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`, machineId: index % 2 ? otherMachine : machineId, status: index < 10 ? "RESOLVED" : "PENDING", scheduledDueAt: "2026-11-16T08:00:00Z", notes: index === 0 ? "Đã vệ sinh cụm pha và kiểm tra kết nối." : null }));
  const queries: URLSearchParams[] = [];
  await page.context().addCookies([{ name: "access_token", value: `header.${Buffer.from(JSON.stringify({ roles: ["moderator"], sub: machineId })).toString("base64url")}.signature`, url: test.info().project.use.baseURL as string }]);
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    const pathname = url.pathname.replace("/api/dolores/v1", "");
    let body: unknown = [];
    let status = 200;
    const headers: Record<string, string> = {};
    if (pathname === "/notifications/unread-count") body = { unreadCount: 0 };
    else if (pathname === "/machines") body = machines;
    else if (pathname.startsWith("/machines/")) body = machines.find(item => pathname.endsWith(item.id));
    else if (pathname === "/maintenance-tickets") {
      queries.push(url.searchParams);
      if (fail) { status = 503; body = { message: "Service unavailable" }; }
      else {
        const pageIndex = Number(url.searchParams.get("page"));
        const size = Number(url.searchParams.get("size"));
        const filtered = tickets.filter(ticket => (!url.searchParams.get("machineId") || ticket.machineId === url.searchParams.get("machineId")) && (!url.searchParams.get("status") || ticket.status === url.searchParams.get("status")));
        body = filtered.slice(pageIndex * size, (pageIndex + 1) * size);
        headers["x-page"] = String(pageIndex); headers["x-page-size"] = String(size); headers["x-has-next"] = String((pageIndex + 1) * size < filtered.length);
      }
    } else if (pathname.startsWith("/maintenance-tickets/")) body = tickets.find(item => pathname.endsWith(item.id));
    await route.fulfill({ status, headers, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto(path);
  return { queries, recover: () => { fail = false; } };
}

test("machine history uses the new list, server pagination and filters, and shared ticket details", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  const api = await setup(page);
  const panel = page.getByRole("region", { name: "Phiếu bảo trì", exact: true });
  await expect(panel.getByRole("link", { name: "Xem phiếu", exact: true })).toHaveCount(10);
  await expect(panel.getByRole("link", { name: "DOLORES-001", exact: true })).toHaveCount(0);
  await expect(panel.getByRole("table").getByText("DOLORES-001", { exact: true }).first()).toBeVisible();
  await panel.getByRole("table").getByText("DOLORES-001", { exact: true }).first().click();
  await expect(page).toHaveURL(/\/moderator\/machine-history$/);
  expect(api.queries[0].get("size")).toBe("10");
  await page.screenshot({ path: ".playwright-cli/moderator-machine-history-desktop.png" });
  await panel.getByRole("link", { name: "Xem phiếu", exact: true }).first().click();
  await expect(page).toHaveURL(/\/moderator\/machine-history\/tickets\/00000000-0000-4000-8000-000000000100$/);
  const detail = page.getByRole("region", { name: "Chi tiết phiếu bảo trì", exact: true });
  await expect(detail).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(detail.locator("summary").filter({ hasText: "Chứng từ phiếu bảo trì" })).toBeVisible();
  await page.screenshot({ path: ".playwright-cli/moderator-machine-history-ticket.png" });
  await page.getByRole("button", { name: "Về lịch sử máy", exact: true }).click();
  await expect(page).toHaveURL(/\/moderator\/machine-history$/);
  await panel.getByRole("button", { name: "Tiếp", exact: true }).click();
  await expect(panel.getByRole("link", { name: "Xem phiếu", exact: true })).toHaveCount(4);
  await panel.getByRole("combobox", { name: "Lọc theo máy" }).selectOption(machineId);
  await panel.getByRole("combobox", { name: "Lọc trạng thái phiếu" }).selectOption("PENDING");
  await panel.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(panel.getByRole("link", { name: "Xem phiếu", exact: true })).toHaveCount(2);
  expect(api.queries.at(-1)?.get("page")).toBe("0");
  expect(api.queries.at(-1)?.get("status")).toBe("PENDING");
  expect(api.queries.at(-1)?.get("machineId")).toBe(machineId);
});

test("machine-specific history keeps its machine scope on mobile and shows an honest empty state", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const api = await setup(page, `/moderator/machine-history/${machineId}`);
  await expect(page.getByRole("button", { name: "Về hồ sơ máy", exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Lọc theo máy" })).toBeDisabled();
  await expect(page.getByRole("link", { name: "Xem phiếu", exact: true })).toHaveCount(7);
  expect(api.queries[0].get("machineId")).toBe(machineId);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: ".playwright-cli/moderator-machine-history-mobile.png" });
  await page.getByRole("combobox", { name: "Lọc trạng thái phiếu" }).selectOption("ASSIGNED");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page.getByRole("link", { name: "Xem phiếu", exact: true })).toHaveCount(0);
  await expect(page.getByText("Chưa có phiếu bảo trì phù hợp.", { exact: true })).toBeVisible();
});

test("history read failures can retry and invalid machine IDs never load tickets", async ({ page }) => {
  const api = await setup(page, "/moderator/machine-history", true);
  const error = page.getByRole("alert").filter({ has: page.getByRole("button", { name: "Thử lại", exact: true }) });
  await expect(error).toBeVisible();
  api.recover();
  await error.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByRole("link", { name: "Xem phiếu", exact: true })).toHaveCount(10);
  const calls = api.queries.length;
  await page.goto("/moderator/machine-history/not-a-machine-id");
  await expect(page.getByRole("combobox", { name: "Lọc theo máy" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
  expect(api.queries).toHaveLength(calls);
  await page.goto("/moderator/machine-history/tickets/not-a-ticket-id");
  await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
  expect(api.queries).toHaveLength(calls);
});

test("a ticket opened directly returns to the history of its machine", async ({ page }) => {
  const ticketId = "00000000-0000-4000-8000-000000000100";
  const historyPath = `/moderator/machine-history/${machineId}`;
  const api = await setup(page, `${historyPath}/tickets/${ticketId}`);
  await expect(page.getByRole("heading", { name: "Chi tiết phiếu bảo trì", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(api.queries).toHaveLength(0);
  await page.getByRole("button", { name: "Về lịch sử máy", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(historyPath + "$"));
  await expect(page.getByRole("combobox", { name: "Lọc theo máy" })).toBeDisabled();
  await expect.poll(() => api.queries[0]?.get("machineId")).toBe(machineId);
});
