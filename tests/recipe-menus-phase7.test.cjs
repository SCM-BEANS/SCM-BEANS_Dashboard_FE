const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function load(relativePath, mocks = {}) {
  const fileName = join(__dirname, "..", relativePath);
  const { outputText } = ts.transpileModule(readFileSync(fileName, "utf8"), {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const loaded = { exports: {} };
  new Function("require", "module", "exports", outputText)((id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id), loaded, loaded.exports);
  return loaded.exports;
}

const ownerId = "00000000-0000-4000-8000-000000000001";
const menuId = "00000000-0000-4000-8000-000000000002";
const recipeId = "00000000-0000-4000-8000-000000000003";
const machineId = "00000000-0000-4000-8000-000000000004";
const localRecipe = { id: recipeId, ownerId, menuId, sourceGlobalRecipeId: recipeId, sourceRevision: 3, name: "Espresso", steps: ["Brew"], dosageBounds: ["water:1:2"], dosageOverrides: [], createdAt: "2026-10-31T10:00:00Z", updatedAt: "2026-10-31T10:00:00Z" };

function loadMenus(axiosClient) {
  const schemas = load("src/schema/recipe-menus.schema.ts");
  return load("src/apis/recipe-menus.api.ts", {
    "@/lib/http": { axiosClient, DOLORES_API_BASE_URL: "/api/dolores/v1" },
    "@/schema/recipe-menus.schema": schemas,
  }).recipeMenusApi;
}

test("Owner menu snapshots use the Owner-scoped collection and page response", async () => {
  const calls = [];
  const api = loadMenus({ get: async (url, config) => { calls.push([url, config]); return { data: { content: [localRecipe], page: 0, size: 20, totalElements: 1, totalPages: 1, first: true, last: true } }; } });
  const result = await api.listLocalRecipes(menuId, { page: 0, size: 20 });
  assert.equal(result.content[0].ownerId, ownerId);
  assert.deepEqual(calls[0], [`/recipe-menus/local/${menuId}/recipes`, { baseURL: "/api/dolores/v1", params: { page: 0, size: 20 }, signal: undefined }]);
});

test("copy creates an independent scoped snapshot and rejects a different source recipe", async () => {
  const calls = [];
  const api = loadMenus({ post: async (url, data, config) => { calls.push([url, data, config]); return { data: localRecipe }; } });
  assert.equal((await api.copyGlobalRecipe({ globalRecipeId: recipeId, menuId })).id, recipeId);
  assert.deepEqual(calls[0], ["/recipe-menus/local/copies", { globalRecipeId: recipeId, menuId }, { baseURL: "/api/dolores/v1" }]);
  const mismatch = loadMenus({ post: async () => ({ data: { ...localRecipe, sourceGlobalRecipeId: ownerId } }) });
  await assert.rejects(mismatch.copyGlobalRecipe({ globalRecipeId: recipeId, menuId }), /different recipe or menu/i);
});

test("recipe sync request uses owner-authenticated machine IDs and validates status identity", async () => {
  const calls = [];
  const status = { machineId, targetVersion: 4, targetHash: "hash", appliedVersion: 3, appliedHash: "old", commandId: recipeId, state: "PENDING", retryCount: 0, lastError: null, requestedAt: "2026-10-31T10:00:00Z", lastAttemptAt: null, appliedAt: null, expiresAt: null };
  const recipesSchema = load("src/schema/recipes.schema.ts");
  const menuSchema = load("src/schema/recipe-menus.schema.ts");
  const api = load("src/apis/recipes.api.ts", {
    "@/lib/http": { axiosClient: { post: async (url, body, config) => { calls.push([url, body, config]); return { data: [status] }; } }, DOLORES_API_BASE_URL: "/api/dolores/v1" },
    "@/schema/recipes.schema": recipesSchema,
    "@/schema/recipe-menus.schema": menuSchema,
    "@/schema/machines.schema": { MachineIdSchema: { parse: (value) => value } },
  }).recipesApi;
  assert.equal((await api.requestSync([machineId]))[0].state, "PENDING");
  assert.deepEqual(calls[0], ["/recipes/sync", { machineIds: [machineId] }, { baseURL: "/api/dolores/v1" }]);
});

test("Owner menu UI uses recipe-menu scope and omits device polling and raw storage references", () => {
  const source = readFileSync(join(__dirname, "../src/components/features/recipe-menus/recipe-menus-screen.tsx"), "utf8");
  assert.match(source, /recipeMenusApi\.listLocal/);
  assert.match(source, /recipeMenusApi\.copyGlobalRecipe/);
  assert.match(source, /recipeMenusApi\.createLocalRecipe/);
  assert.match(source, /recipeMenusApi\.moveLocalRecipe/);
  assert.match(source, /recipeMenusApi\.getLocal\(/);
  assert.match(source, /recipeMenusApi\.getGlobal\(/);
  assert.match(source, /recipeMenusApi\.editLocalRecipe/);
  assert.match(source, /recipesApi\.requestSync/);
  assert.doesNotMatch(source, /recipesApi\.(listLocal|upsertLocal|deleteLocal)/);
  assert.doesNotMatch(source, /effective\/.*sync|pollRecipeCommand|deviceToken/i);
});

test("All recipe-menu controller methods use their documented endpoints and payloads", async () => {
  const calls = [];
  const menu = { id: menuId, name: "Espresso", createdAt: "2026-11-04T10:00:00Z" };
  const ownerMenu = { ...menu, ownerId };
  const globalRecipe = { id: recipeId, name: "Espresso", revision: 3, menuId };
  const localSummary = { id: recipeId, ownerId, menuId, sourceGlobalRecipeId: recipeId, sourceRevision: 3, name: "Espresso", createdAt: "2026-11-04T10:00:00Z", updatedAt: "2026-11-04T10:00:00Z" };
  const localDetail = { ...localSummary, steps: ["Brew"], dosageBounds: ["water:1:2"], dosageOverrides: [] };
  const page = (content) => ({ content: [content], page: 0, size: 100, totalElements: 1, totalPages: 1, first: true, last: true });
  const response = (data) => ({ data });
  const api = loadMenus({
    get: async (url, config) => {
      calls.push(["GET", url, undefined, config]);
      if (url.endsWith("/global")) return response(page(menu));
      if (url.endsWith("/global/" + menuId + "/recipes")) return response(page(globalRecipe));
      if (url.endsWith("/local/" + menuId + "/recipes")) return response(page(localSummary));
      if (url.endsWith("/local/recipes/" + recipeId)) return response(localDetail);
      if (url.endsWith("/local")) return response(page(ownerMenu));
      return response(url.includes("/local/") ? ownerMenu : menu);
    },
    post: async (url, body, config) => {
      calls.push(["POST", url, body, config]);
      return response(url.includes("/local") ? localDetail : menu);
    },
    patch: async (url, body, config) => { calls.push(["PATCH", url, body, config]); return response(url === `/recipe-menus/local/${menuId}` ? ownerMenu : url.includes("/local") ? localDetail : menu); },
    put: async (url, body, config) => { calls.push(["PUT", url, body, config]); return response(url.includes("/local") ? localDetail : globalRecipe); },
    delete: async (url, config) => { calls.push(["DELETE", url, undefined, config]); return response(undefined); },
  });

  await api.listGlobal({ page: 0, size: 100 });
  await api.getGlobal(menuId);
  await api.createGlobal("Espresso");
  await api.renameGlobal(menuId, "Espresso");
  await api.deleteGlobal(menuId);
  await api.listGlobalRecipes(menuId, { page: 0, size: 100 });
  await api.assignGlobalRecipe(menuId, recipeId);
  await api.removeGlobalRecipe(menuId, recipeId);
  await api.listLocal({ page: 0, size: 100 });
  await api.getLocal(menuId);
  await api.createLocal("Espresso");
  await api.renameLocal(menuId, "Espresso");
  await api.deleteLocal(menuId);
  await api.listLocalRecipes(menuId, { page: 0, size: 100 });
  await api.getLocalRecipe(recipeId);
  await api.createLocalRecipe(menuId, { name: "Espresso", steps: ["Brew"], dosageBounds: ["water:1:2"], dosageOverrides: [] });
  await api.copyGlobalRecipe({ globalRecipeId: recipeId, menuId });
  await api.moveLocalRecipe(menuId, recipeId);
  await api.editLocalRecipe(recipeId, { name: "Espresso", steps: ["Brew"], dosageBounds: ["water:1:2"], dosageOverrides: [] });
  await api.deleteLocalRecipe(recipeId);

  assert.deepEqual(calls.map(([method, url]) => `${method} ${url}`), [
    `GET /recipe-menus/global`,
    `GET /recipe-menus/global/${menuId}`,
    `POST /recipe-menus/global`,
    `PATCH /recipe-menus/global/${menuId}`,
    `DELETE /recipe-menus/global/${menuId}`,
    `GET /recipe-menus/global/${menuId}/recipes`,
    `PUT /recipe-menus/global/${menuId}/recipes/${recipeId}`,
    `DELETE /recipe-menus/global/${menuId}/recipes/${recipeId}`,
    `GET /recipe-menus/local`,
    `GET /recipe-menus/local/${menuId}`,
    `POST /recipe-menus/local`,
    `PATCH /recipe-menus/local/${menuId}`,
    `DELETE /recipe-menus/local/${menuId}`,
    `GET /recipe-menus/local/${menuId}/recipes`,
    `GET /recipe-menus/local/recipes/${recipeId}`,
    `POST /recipe-menus/local/${menuId}/recipes`,
    `POST /recipe-menus/local/copies`,
    `PUT /recipe-menus/local/${menuId}/recipes/${recipeId}`,
    `PATCH /recipe-menus/local/recipes/${recipeId}`,
    `DELETE /recipe-menus/local/recipes/${recipeId}`,
  ]);
  assert.deepEqual(calls[0][3].params, { page: 0, size: 100 });
  assert.deepEqual(calls[15][2], { name: "Espresso", steps: ["Brew"], dosageBounds: ["water:1:2"], dosageOverrides: [] });
  assert.deepEqual(calls[16][2], { globalRecipeId: recipeId, menuId });
  assert.equal(calls.length, 20);
  assert.equal(calls.every((call) => call[3].baseURL === "/api/dolores/v1"), true);
});

test("Admin, Moderator, and Owner menu entry points share the role-scoped menu screen", () => {
  const root = join(__dirname, "..");
  const admin = readFileSync(join(root, "src/pages/admin/menu/index.page.tsx"), "utf8");
  const moderator = readFileSync(join(root, "src/pages/moderator/menu/recipes-screen.tsx"), "utf8");
  const dashboardMenu = readFileSync(join(root, "src/pages/dashboard/menu/menu-screen.tsx"), "utf8");
  const ownerReadRoute = readFileSync(join(root, "src/pages/dashboard/read/customer-read-screen.tsx"), "utf8");
  assert.match(admin, /RecipeMenusScreen role="operator" operatorRole="ADMIN"/);
  assert.match(moderator, /RecipeMenusScreen role="operator" operatorRole="MODERATOR"/);
  assert.match(dashboardMenu, /RecipeMenusScreen role="owner"/);
  assert.match(ownerReadRoute, /RecipeMenusScreen role="owner"/);
  const shared = readFileSync(join(root, "src/components/features/recipe-menus/recipe-menus-screen.tsx"), "utf8");
  assert.match(shared, /enabled: owner/);
  assert.match(shared, /enabled: !owner/);
});
