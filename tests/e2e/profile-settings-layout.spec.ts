import { test, expect } from "@playwright/test";

for (const role of ["admin", "moderator", "owner", "technician"]) {
  test(`${role} profile uses grouped settings and preserves contact edit permissions`, async ({ page }) => {
    const id = "f4000000-0000-4000-8000-000000000001";
    const root = role === "owner" ? "dashboard" : role;
    let phone = "0901234567";
    let saves = 0;
    await page.context().addCookies([{ name: "access_token", value: `header.${Buffer.from(JSON.stringify({ roles: [role], sub: id })).toString("base64url")}.signature`, url: test.info().project.use.baseURL as string }]);
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      const profile = () => ({ idaasUserId: id, fullName: "Nguyễn Minh Anh", email: "minhanh@example.com", phone, emailVerified: true, status: "ACTIVE", roles: [role.toUpperCase()], createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-16T00:00:00Z" });
      if (path.endsWith(`/profiles/${id}/contact-info`) && route.request().method() === "PUT") { phone = route.request().postDataJSON().phone; saves++; return route.fulfill({ json: profile() }); }
      return route.fulfill({ json: path.endsWith("/profiles/me") ? profile() : [] });
    });
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto(`/${root}/settings`);
    await expect(page.getByRole("heading", { name: "Hồ sơ cá nhân", exact: true })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Các mục hồ sơ", exact: true });
    await nav.getByRole("link", { name: "Thông tin liên hệ", exact: true }).click();
    await expect(nav.getByRole("link", { name: "Thông tin liên hệ", exact: true })).toHaveAttribute("aria-current", "location");
    if (role === "admin") {
      await page.getByRole("button", { name: "Chỉnh sửa", exact: true }).click();
      await page.getByRole("textbox", { name: "Số điện thoại", exact: true }).fill("0909999999");
      await page.getByRole("button", { name: "Lưu số điện thoại", exact: true }).click();
      await expect(page.getByRole("status").filter({ hasText: "Đã cập nhật số điện thoại." })).toBeVisible();
      expect(saves).toBe(1);
    } else {
      await expect(page.getByRole("button", { name: "Chỉnh sửa", exact: true })).toHaveCount(0);
    }
    await page.getByRole("main").evaluate(element => { element.scrollTop = 0; });
    await page.screenshot({ path: `.playwright-cli/profile-${role}-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("main").evaluate(element => { element.scrollTop = 0; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.playwright-cli/profile-${role}-mobile.png` });
  });
}
