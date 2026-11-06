const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const schemas = new Proxy({}, { get: (_, name) => ({ parse: value => { if ((name === "MachineIdSchema" || name === "CoffeePackageOrderIdSchema") && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error(`Invalid ${name}`); return value; } }) });
function load(file, axiosClient) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", source)(id => id === "@/lib/http" ? { axiosClient, DOLORES_API_BASE_URL: "/api" } : id.startsWith("@/schema/") ? schemas : require(id), module, module.exports);
  return module.exports;
}
const id = "00000000-0000-4000-8000-000000000001";
test("machine contract history sends filter and pagination and handles 404", async () => {
  const calls = [];
  const api = load("src/apis/contracts.api.ts", { get: async (url, config) => { calls.push([url, config]); return { data: [], headers: { "x-has-next": "true" } }; } }).contractsApi;
  assert.equal((await api.listByMachine(id, { status: "ACTIVE", page: 1, size: 10 })).hasNext, true);
  assert.equal(calls[0][0], `/contracts/machine/${id}`); assert.deepEqual(calls[0][1].params, { status: "ACTIVE", page: 1, size: 10 });
  const controller = new AbortController();
  assert.deepEqual(await api.getMachineHistory(id, controller.signal), []);
  assert.equal(calls[1][0], `/contracts/machine/${id}`);
  assert.deepEqual(calls[1][1].params, { page: 0, size: 100 });
  assert.equal(calls[1][1].signal, controller.signal);
  await assert.rejects(api.listByMachine("invalid", { page: 0, size: 10 }), /MachineIdSchema/);
  assert.equal(calls.length, 2);
  const empty = load("src/apis/contracts.api.ts", { get: async () => { throw { response: { status: 404 } }; } }).contractsApi;
  assert.deepEqual(await empty.listByMachine(id, { page: 0, size: 10 }), { items: [], hasNext: false });
  assert.deepEqual(await empty.getMachineHistory(id), []);
});
test("order receipt uses the order endpoint", async () => {
  let path; const api = load("src/apis/coffee-packages.api.ts", { post: async url => { path = url; return { data: { orderId: id, status: "DELIVERED" } }; } }).coffeePackagesApi;
  await api.confirmOrderReceived(id); assert.equal(path, `/coffee-package-orders/${id}/confirm-received`);
  path = undefined;
  await assert.rejects(api.confirmOrderReceived("invalid"), /CoffeePackageOrderIdSchema/);
  assert.equal(path, undefined);
  const mismatch = load("src/apis/coffee-packages.api.ts", { post: async () => ({ data: { orderId: "00000000-0000-4000-8000-000000000002", status: "DELIVERED" } }) }).coffeePackagesApi;
  await assert.rejects(mismatch.confirmOrderReceived(id), /different order/);
});
test("legacy review validates technician and sends the decision and correlation", async () => {
  let call; const api = load("src/apis/recall-work-orders.api.ts", { post: async (url, body) => { call = [url, body]; return { data: { id } }; } }).recallWorkOrdersApi;
  await assert.rejects(api.legacyReview(id, { decision: "VERIFY_ALREADY_AT_DEPOT", reason: "test", correlationId: "trace" }));
  await api.legacyReview(id, { decision: "PICKUP_REQUIRED", reason: "test", correlationId: "trace" });
  assert.equal(call[0], `/recall-work-orders/${id}/legacy-review`); assert.deepEqual(call[1], { decision: "PICKUP_REQUIRED", reason: "test", correlationId: "trace" });
});
