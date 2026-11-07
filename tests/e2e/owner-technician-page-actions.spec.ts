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

