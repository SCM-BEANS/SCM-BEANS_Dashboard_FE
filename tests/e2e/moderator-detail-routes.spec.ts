import { expect, test, type Page } from "@playwright/test";

const recipeId = "00000000-0000-0000-0000-000000000001";
const modelId = "e6dbdebd-ec02-4f15-b07b-8f1ec12c52bb";

async function prepareModeratorPage(page: Page) {
  const claims = Buffer.from(JSON.stringify({ roles: ["moderator"] })).toString("base64url");
  await page.context().addCookies([{
    name: "access_token",
    value: `header.${claims}.signature`,
    domain: "127.0.0.1",
    path: "/",
  }]);
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api\/dolores\/v1/, "");
    if (path === `/recipes/global/${recipeId}`) {
      return route.fulfill({ json: { id: recipeId, name: "Espresso kiểm thử", steps: ["DOSE:18", "EXTRACT:36"], revision: 1, menuId: null } });
    }
    if (path === `/machine-models/${modelId}`) {
      return route.fulfill({ json: {
        id: modelId,
        modelCode: "MODEL-TEST",
        manufacturer: "SCM Beans",
        displayName: "Mẫu máy kiểm thử",
        machineType: "CONVENTIONAL",
        specifications: {},
        active: true,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
      } });
    }
    if (path === "/recipe-menus/global") {
      return route.fulfill({ json: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true } });
    }
    return route.fulfill({ json: [] });
  });
}

test("Moderator opens a recipe detail with a backend-valid nil UUID", async ({ page }) => {
  await prepareModeratorPage(page);
  const response = await page.goto(`/moderator/menu/${recipeId}`);

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Espresso kiểm thử" })).toBeVisible();
});

test("Moderator menu creation route opens the shared editor", async ({ page }) => {
  await prepareModeratorPage(page);
  const response = await page.goto("/moderator/menu/new");

  expect(response?.status()).toBe(200);
  const dialog = page.getByRole("dialog", { name: "Tạo menu" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Tên menu *")).toBeVisible();
  await dialog.getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(page).toHaveURL("/moderator/menu");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Moderator opens a machine-model detail", async ({ page }) => {
  await prepareModeratorPage(page);
  const response = await page.goto(`/moderator/machines/models/${modelId}`);

  expect(response?.status()).toBe(200);
  await expect(page.getByText("Mẫu máy kiểm thử", { exact: true })).toBeVisible();
  await expect(page.getByText("MODEL-TEST", { exact: true })).toBeVisible();
});
