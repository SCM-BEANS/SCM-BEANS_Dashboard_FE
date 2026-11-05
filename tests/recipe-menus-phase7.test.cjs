const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loader(mocks = {}) {
  const cache = new Map();
  function load(relative) {
    const file = path.resolve(__dirname, "..", relative);
    if (cache.has(file)) return cache.get(file).exports;
    const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
      fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React },
    });
    const result = { exports: {} }; cache.set(file, result);
    const resolve = (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id.startsWith("@/")) return load("src/" + id.slice(2) + ".ts");
      if (id.startsWith(".")) return load(path.relative(path.resolve(__dirname, ".."), path.resolve(path.dirname(file), id + ".ts")));
      return require(id);
    };
    new Function("require", "module", "exports", outputText)(resolve, result, result.exports);
    return result.exports;
  }
  return load;
}
const ownerId = "00000000-0000-4000-8000-000000000001";
const menuId = "00000000-0000-4000-8000-000000000002";
const recipeId = "00000000-0000-4000-8000-000000000003";
const machineId = "00000000-0000-4000-8000-000000000004";
const commandId = "00000000-0000-4000-8000-000000000005";
const defaultMenuId = "00000000-0000-0000-0000-000000000090";
const procedure = ["DOSE:18", "TAMP:100", "HOLDTAMP:50", "EXTRACT:36", "DRYTAMP:100"];
const globalRecipe = { id: recipeId, name: "Espresso", steps: procedure, revision: 2, menuId: defaultMenuId };
const local = { id: recipeId, ownerId, menuId, sourceGlobalRecipeId: null, sourceRevision: null, name: "My Espresso", createdAt: null, updatedAt: null, steps: procedure, dosageOverrides: [] };
const syncStatus = { machineId, targetVersion: 2, targetHash: "target", appliedVersion: 1, appliedHash: "old", commandId, state: "PENDING", retryCount: 0, lastError: null, requestedAt: "2026-11-05T08:00:00Z", lastAttemptAt: null, appliedAt: null, expiresAt: null };
const envelope = (content) => ({ content, page: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0, first: true, last: true });
const apiLoader = (client) => loader({ "@/lib/http": { axiosClient: client, DOLORES_API_BASE_URL: "/api/dolores/v1" } });
const schema = loader()("src/schema/recipes.schema.ts");
const menuSchema = loader()("src/schema/recipe-menus.schema.ts");

test("global detail strictly matches the five-field deployed DTO without dosageBounds", () => {
  assert.deepEqual(schema.GlobalRecipeSchema.parse(globalRecipe), globalRecipe);
  assert.equal(schema.GlobalRecipeSchema.safeParse({ ...globalRecipe, dosageBounds: [] }).success, false);
  assert.equal(schema.GlobalRecipeSchema.safeParse({ ...globalRecipe, id: "invalid" }).success, false);
  assert.equal(schema.GlobalRecipeSchema.safeParse({ ...globalRecipe, revision: undefined }).success, false);
});

test("new writes use only procedure and optional metadata, not legacy dosage bounds or physical DTO values", () => {
  assert.deepEqual(schema.RecipePublishRequestSchema.parse({ name: "Espresso", procedure, slug: "espresso" }), { name: "Espresso", procedure, slug: "espresso" });
  for (const extra of [{ steps: ["GRIND"] }, { dosageBounds: ["bean:90:110"] }, { coffeeWeight: 18 }, { ownerId }, { menuId }]) {
    assert.equal(schema.RecipePublishRequestSchema.safeParse({ name: "Espresso", procedure, ...extra }).success, false);
  }
});

test("structured fields preserve units, mandatory dose/extract and canonical directive order", () => {
  const result = schema.buildRecipeProcedure({ ...schema.emptyRecipeProcedure(), DOSE: "18", EXTRACT: "36", PREMILK: "2", POSTWATER: "20" });
  assert.deepEqual(result, ["PREMILK:2", "DOSE:18", "TAMP:100", "HOLDTAMP:50", "EXTRACT:36", "DRYTAMP:100", "POSTWATER:20"]);
  for (const bad of [
    ["DOSE:18"], ["EXTRACT:36"], ["DOSE:0.01", "EXTRACT:36"],
    ["DOSE:18", "EXTRACT:36", "PREMILK:2.5"],
    ["DOSE:18", "EXTRACT:36", "PREWATER:-1"],
    ["DOSE:18", "EXTRACT:36", "HEAT"],
    ["DOSE:18", "EXTRACT:36", "DOSE:20"],
    ["DOSE:18", "EXTRACT:36", "DRYTAMP:50"],
  ]) assert.equal(schema.RecipeProcedureSchema.safeParse(bad).success, false, JSON.stringify(bad));
});

test("Owner-created recipes tolerate null source and lifecycle timestamps, but reject invalid scope IDs", () => {
  assert.equal(menuSchema.OwnerMenuRecipeSchema.parse(local).sourceGlobalRecipeId, null);
  assert.equal(menuSchema.OwnerMenuRecipeSchema.safeParse({ ...local, menuId: "bad" }).success, false);
  assert.equal(menuSchema.RecipeMenuNameRequestSchema.safeParse({ name: "x".repeat(255) }).success, true);
  assert.equal(menuSchema.RecipeMenuNameRequestSchema.safeParse({ name: "x".repeat(256) }).success, false);
  assert.equal(menuSchema.CreateRecipeDslRequestSchema.safeParse({ name: "X", procedure, ownerId }).success, false);
  assert.equal(menuSchema.LocalRecipeSnapshotRequestSchema.safeParse({ name: "X", steps: procedure, dosageOverrides: [] }).success, true);
});

test("global POST and PUT send native procedure unchanged and validate returned identity", async () => {
  const calls = [];
  const api = apiLoader({
    post: async (...args) => { calls.push(["post", ...args]); return { data: globalRecipe }; },
    put: async (...args) => { calls.push(["put", ...args]); return { data: globalRecipe }; },
  })("src/apis/recipes.api.ts").recipesApi;
  const input = { name: "Espresso", procedure };
  await api.publishGlobal(input); await api.updateGlobal(recipeId, input);
  assert.deepEqual(calls.map((row) => [row[0], row[1], row[2]]), [
    ["post", "/recipes/global", input], ["put", "/recipes/global/" + recipeId, input],
  ]);
  assert.equal(calls.every((row) => row[3].baseURL === "/api/dolores/v1"), true);
  const bad = apiLoader({ put: async () => ({ data: { ...globalRecipe, id: ownerId } }) })("src/apis/recipes.api.ts").recipesApi;
  await assert.rejects(bad.updateGlobal(recipeId, input), /different global recipe/i);
});

test("array pagination honors headers, q and does not silently hide a next page when headers are absent", async () => {
  const calls = [];
  const summary = { ...globalRecipe }; delete summary.steps;
  const api = apiLoader({ get: async (...args) => { calls.push(args); return { data: [summary], headers: { "x-page": "2", "x-page-size": "1", "x-has-next": "false" } }; } })("src/apis/recipes.api.ts").recipesApi;
  assert.deepEqual(await api.listGlobalPage(2, 1, undefined, " espresso "), { items: [summary], page: 2, size: 1, hasNext: false });
  assert.deepEqual(calls[0][1].params, { page: 2, size: 1, q: "espresso" });
  const noHeaders = apiLoader({ get: async () => ({ data: [summary] }) })("src/apis/recipes.api.ts").recipesApi;
  assert.equal((await noHeaders.listGlobalPage(0, 1)).hasNext, true);
});

test("Owner native DSL uses path menu as target and only one create request per action", async () => {
  const calls = [];
  const api = apiLoader({ post: async (...args) => { calls.push(args); return { data: local }; } })("src/apis/recipe-menus.api.ts").recipeMenusApi;
  await api.createLocalDsl({ name: local.name, procedure, menuId: ownerId }, menuId);
  await api.createLocalDsl({ name: local.name, procedure });
  assert.deepEqual(calls.map((row) => [row[0], row[1]]), [
    ["/recipe-menus/local/" + menuId + "/recipes/dsl", { name: local.name, procedure }],
    ["/recipe-menus/local/dsl", { name: local.name, procedure }],
  ]);
  assert.equal(calls.length, 2);
});

test("copy preserves source ID/revision and rejects an unrelated source or destination", async () => {
  const snapshot = { ...local, sourceGlobalRecipeId: recipeId, sourceRevision: 2 };
  const api = apiLoader({ post: async () => ({ data: snapshot }) })("src/apis/recipe-menus.api.ts").recipeMenusApi;
  assert.equal((await api.copyGlobalRecipe({ globalRecipeId: recipeId, menuId })).sourceRevision, 2);
  const bad = apiLoader({ post: async () => ({ data: { ...snapshot, sourceGlobalRecipeId: ownerId } }) })("src/apis/recipe-menus.api.ts").recipeMenusApi;
  await assert.rejects(bad.copyGlobalRecipe({ globalRecipeId: recipeId, menuId }), /different recipe or menu/i);
});

test("menu lists use page envelopes, move is bodyless and removal means return to default", async () => {
  const calls = [];
  const api = apiLoader({
    get: async (...args) => { calls.push(["get", ...args]); return { data: envelope([{ ...local, steps: undefined, dosageOverrides: undefined }].map(({ steps, dosageOverrides, ...summary }) => summary)) }; },
    put: async (...args) => { calls.push(["put", ...args]); return { data: { ...globalRecipe, menuId } }; },
    delete: async (...args) => { calls.push(["delete", ...args]); return { data: globalRecipe }; },
  })("src/apis/recipe-menus.api.ts").recipeMenusApi;
  assert.equal((await api.listLocalRecipes(menuId, { q: "Esp" })).totalElements, 1);
  await api.assignGlobalRecipe(menuId, recipeId);
  assert.equal((await api.removeGlobalRecipe(menuId, recipeId)).menuId, defaultMenuId);
  assert.deepEqual(calls[1].slice(0, 3), ["put", "/recipe-menus/global/" + menuId + "/recipes/" + recipeId, undefined]);
  assert.equal(calls[0][2].params.q, "Esp");
  const wrong = apiLoader({ put: async () => ({ data: globalRecipe }) })("src/apis/recipe-menus.api.ts").recipeMenusApi;
  await assert.rejects(wrong.assignGlobalRecipe(menuId, recipeId), /different global recipe or menu/i);
});

test("204 deletes accept empty bodies and snapshot PATCH sends full name/steps without dosageBounds", async () => {
  const calls = [];
  const api = apiLoader({
    delete: async (...args) => { calls.push(["delete", ...args]); return { status: 204, data: "" }; },
    patch: async (...args) => { calls.push(["patch", ...args]); return { data: local }; },
  })("src/apis/recipe-menus.api.ts").recipeMenusApi;
  await api.deleteGlobal(menuId); await api.deleteLocal(menuId); await api.deleteLocalRecipe(recipeId);
  await api.editLocalRecipe(recipeId, { name: "My Espresso", steps: procedure, dosageOverrides: [] });
  assert.deepEqual(calls[3][2], { name: "My Espresso", steps: procedure, dosageOverrides: [] });
  assert.equal(calls.slice(0, 3).every((row) => row[0] === "delete"), true);
});

test("legacy update includes existing id, create omits id and ownerId is never accepted", async () => {
  const calls = [];
  const detail = { id: recipeId, ownerId, globalRecipeId: recipeId, globalRecipeName: "Espresso", dosageOverrides: ["water:40"] };
  const api = apiLoader({ post: async (...args) => { calls.push(args); return { data: detail }; } })("src/apis/recipes.api.ts").recipesApi;
  await api.upsertLocal({ globalRecipeId: recipeId, dosageOverrides: ["water:40"] });
  await api.upsertLocal({ id: recipeId, globalRecipeId: recipeId, dosageOverrides: [] });
  assert.equal(Object.hasOwn(calls[0][1], "id"), false);
  assert.equal(calls[1][1].id, recipeId);
  assert.equal(schema.LocalRecipeUpsertRequestSchema.safeParse({ ownerId, globalRecipeId: recipeId, dosageOverrides: [] }).success, false);
});

test("APPLIED requires target version/hash confirmation and sync history preserves pagination", async () => {
  assert.equal(schema.isRecipeSyncApplied({ ...syncStatus, state: "APPLIED" }), false);
  assert.equal(schema.isRecipeSyncApplied({ ...syncStatus, state: "DELIVERED", appliedVersion: 2, appliedHash: "target" }), false);
  assert.equal(schema.isRecipeSyncApplied({ ...syncStatus, state: "APPLIED", appliedVersion: 2, appliedHash: "target" }), true);
  const api = apiLoader({ get: async () => ({ data: [syncStatus], headers: { "x-page": "1", "x-page-size": "20", "x-has-next": "true" } }) })("src/apis/recipes.api.ts").recipesApi;
  const result = await api.getSyncHistoryPage(machineId, 1, 20);
  assert.equal(result.hasNext, true); assert.equal(result.page, 1);
  const wrong = apiLoader({ get: async () => ({ data: [{ ...syncStatus, machineId: ownerId }] }) })("src/apis/recipes.api.ts").recipesApi;
  await assert.rejects(wrong.getSyncHistoryPage(machineId), /different machine/i);
});

test("sync and replay stay on user APIs and reject foreign machine responses", async () => {
  const calls = [];
  const replay = { id: commandId, machineId, ownerId, commandType: "RECIPE_SYNC", payload: "[]", status: "PENDING", targetVersion: 2, targetHash: "target", attempts: 0, expiresAt: null, lastAttemptAt: null, acknowledgedAt: null, createdAt: null };
  const api = apiLoader({ post: async (...args) => { calls.push(args); return { data: args[0].endsWith("/replay") ? replay : [syncStatus] }; } })("src/apis/recipes.api.ts").recipesApi;
  await api.requestSync([machineId]); await api.replaySyncCommand(machineId, commandId);
  assert.deepEqual(calls[0][1], { machineIds: [machineId] });
  assert.equal(calls[1][0], "/recipes/sync/" + machineId + "/commands/" + commandId + "/replay");
  assert.equal(calls.some((row) => row[0].includes("/effective")), false);
});

test("saved 503, JSON-string errors and plain-text errors remain distinguishable", () => {
  const { getRecipeApiErrorDetails, getRecipeApiErrorMessage } = loader()("src/lib/api-errors.ts");
  const error = (status, data) => ({ isAxiosError: true, response: { status, data } });
  const saved = error(503, { saved: true, retryable: true, recipeId, message: "Propagation failed" });
  assert.equal(getRecipeApiErrorDetails(saved).saved, true);
  assert.match(getRecipeApiErrorMessage(saved, "mutation"), /Đã lưu công thức/);
  assert.equal(getRecipeApiErrorMessage(error(400, '"Invalid procedure"')), "Invalid procedure");
  assert.equal(getRecipeApiErrorMessage(error(409, { message: "Menu is not empty", correlationId: "trace-1" })), "Menu is not empty · Mã tra cứu: trace-1");
  assert.equal(getRecipeApiErrorDetails(error(204, "")).saved, false);
});

test("global and Owner menu CRUD preserve role-specific paths and never accept an Owner selector", async () => {
  const calls = [];
  const globalMenu = { id: menuId, name: "Menu", createdAt: "2026-11-05T08:00:00Z" };
  const client = {};
  for (const method of ["get", "post", "patch", "delete"]) client[method] = async (...args) => {
    calls.push([method, ...args]);
    const localScope = args[0].includes("/local");
    const menu = localScope ? { ...globalMenu, ownerId } : globalMenu;
    return { data: method === "delete" ? "" : method === "get" && !args[0].endsWith(menuId) ? envelope([menu]) : menu, status: method === "delete" ? 204 : 200 };
  };
  const api = apiLoader(client)("src/apis/recipe-menus.api.ts").recipeMenusApi;
  await api.listGlobal({ q: "Menu" }); await api.getGlobal(menuId);
  await api.createGlobal(" Menu "); await api.renameGlobal(menuId, "Menu"); await api.deleteGlobal(menuId);
  await api.listLocal(); await api.getLocal(menuId);
  await api.createLocal(" Menu "); await api.renameLocal(menuId, "Menu"); await api.deleteLocal(menuId);
  assert.deepEqual(calls.filter((row) => row[0] === "post").map((row) => [row[1], row[2]]), [
    ["/recipe-menus/global", { name: "Menu" }], ["/recipe-menus/local", { name: "Menu" }],
  ]);
  assert.equal(calls.every((row) => !JSON.stringify(row).includes('"ownerId"')), true);
});

test("Owner move and compatibility snapshot create preserve explicit destination and reject mismatches", async () => {
  const calls = [];
  const api = apiLoader({
    post: async (...args) => { calls.push(["post", ...args]); return { data: local }; },
    put: async (...args) => { calls.push(["put", ...args]); return { data: local }; },
  })("src/apis/recipe-menus.api.ts").recipeMenusApi;
  await api.createLocalRecipe(menuId, { name: "Compat", steps: procedure });
  await api.moveLocalRecipe(menuId, recipeId);
  assert.equal(calls[0][1], "/recipe-menus/local/" + menuId + "/recipes");
  assert.equal(calls[1][1], "/recipe-menus/local/" + menuId + "/recipes/" + recipeId);
  assert.equal(calls[1][2], undefined);
  const mismatch = apiLoader({ put: async () => ({ data: { ...local, menuId: ownerId } }) })("src/apis/recipe-menus.api.ts").recipeMenusApi;
  await assert.rejects(mismatch.moveLocalRecipe(menuId, recipeId), /different local recipe/i);
});

test("accepted sync request rejects missing and foreign machine confirmations", async () => {
  for (const data of [[], [{ ...syncStatus, machineId: ownerId }]]) {
    const api = apiLoader({ post: async () => ({ data }) })("src/apis/recipes.api.ts").recipesApi;
    await assert.rejects(api.requestSync([machineId]), /incomplete or unrequested/i);
  }
});
