const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { QueryClient, QueryClientProvider } = require("@tanstack/react-query");

const root = join(__dirname, "..");
const machineId = "f1000000-0000-4000-8000-000000000004";
const otherMachineId = "f1000000-0000-4000-8000-000000000006";
const ownerId = "f1000000-0000-4000-8000-000000000001";
const now = "2026-10-23T00:00:00Z";
const machine = {
  id: machineId, ownerId, serialNumber: "TEST_DATA-MACHINE-01", status: "IN_WAREHOUSE",
  deployedAt: now, nextPreventiveMaintenanceAt: now, cupsServedSinceLastDescale: 12,
  region: "TEST_DATA North", locationId: "f1000000-0000-4000-8000-000000000002",
  machineType: "SMART_IOT",
};
const inventoryItem = {
  id: machineId, ownerId, serialNumber: machine.serialNumber, status: machine.status,
  deployedAt: now, region: machine.region, contractStartDate: "2026-10-01", contractEndDate: "2027-10-01",
  monthlyRentalFee: 1500000,
};
const heartbeat = { machineId, status: "ONLINE", evaluatedAt: now, lastSeenAt: now, health: { firmwareVersion: "TEST_DATA-1" } };
const point = { timestamp: now, field: "temperature", value: 24, machineId, ownerId };

function loadModule(relativePath, mocks = {}) {
  const fileName = join(root, relativePath);
  const source = readFileSync(fileName, "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const loaded = { exports: {} };
  const mockedRequire = (id) => Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : require(id);
  new Function("require", "module", "exports", outputText)(mockedRequire, loaded, loaded.exports);
  return loaded.exports;
}

const machineSchemas = loadModule("src/schema/machines.schema.ts");
const telemetrySchemas = loadModule("src/schema/telemetry.schema.ts", { "@/schema/machines.schema": machineSchemas });
const profileSchemas = loadModule("src/schema/profiles.schema.ts");
const messageModule = loadModule("src/text/admin/admin-operations-messages.ts");
const messages = messageModule.ADMIN_OPERATIONS_MESSAGES;
const pathModule = loadModule("src/routes/path.ts");
const axiosMock = (client) => ({ axiosClient: client, DOLORES_API_BASE_URL: "/api/dolores/v1" });

function clientFor(handler) {
  const calls = [];
  const client = {
    get: async (url, config = {}) => {
      calls.push({ url, config });
      return { data: await handler(url, config) };
    },
  };
  return { client, calls };
}

test("machine API reads inventory, summary, detail and schedule through the shared Dolores base", async () => {
  const summary = { totalMachines: 1, statusCounts: { IN_WAREHOUSE: 1 } };
  const schedule = { nextPreventiveMaintenanceAt: now, cupsServedSinceLastDescale: 12 };
  const { client, calls } = clientFor((url) => {
    if (url === "/machines") return [inventoryItem];
    if (url === "/inventory/summary") return summary;
    if (url.endsWith("/maintenance-schedule")) return schedule;
    return machine;
  });
  const { machinesApi } = loadModule("src/apis/machines.api.ts", {
    "@/lib/http": axiosMock(client), "@/schema/machines.schema": machineSchemas,
  });
  const signal = new AbortController().signal;

  assert.equal((await machinesApi.list(signal))[0].ownerId, ownerId);
  assert.equal((await machinesApi.getInventorySummary(signal)).totalMachines, 1);
  assert.equal((await machinesApi.getById(machineId, signal)).id, machineId);
  assert.equal((await machinesApi.getMaintenanceSchedule(machineId, signal)).cupsServedSinceLastDescale, 12);
  assert.deepEqual(calls.map(({ url }) => url), ["/machines", "/inventory/summary", `/machines/${machineId}`, `/machines/${machineId}/maintenance-schedule`]);
  assert.ok(calls.every(({ config }) => config.baseURL === "/api/dolores/v1" && config.signal === signal));
  await assert.rejects(machinesApi.getById("invalid-id"));
  assert.equal(calls.length, 4);
});

test("machine detail and telemetry reject mismatched machine identities", async () => {
  const mismatchClient = clientFor(() => ({ ...machine, id: otherMachineId }));
  const mismatchApi = loadModule("src/apis/machines.api.ts", {
    "@/lib/http": axiosMock(mismatchClient.client), "@/schema/machines.schema": machineSchemas,
  }).machinesApi;
  await assert.rejects(mismatchApi.getById(machineId), /different machine/);

  const heartbeatClient = clientFor(() => ({ ...heartbeat, machineId: otherMachineId }));
  const heartbeatApi = loadModule("src/apis/telemetry.api.ts", {
    "@/lib/http": axiosMock(heartbeatClient.client), "@/schema/machines.schema": machineSchemas,
    "@/schema/telemetry.schema": telemetrySchemas,
  }).telemetryApi;
  await assert.rejects(heartbeatApi.getLatestHeartbeat(machineId), /different machine UUID/);

  const pointsClient = clientFor(() => [{ ...point, machineId: otherMachineId }]);
  const pointsApi = loadModule("src/apis/telemetry.api.ts", {
    "@/lib/http": axiosMock(pointsClient.client), "@/schema/machines.schema": machineSchemas,
    "@/schema/telemetry.schema": telemetrySchemas,
  }).telemetryApi;
  await assert.rejects(pointsApi.listMachinePoints(machineId, { from: "2026-10-22T00:00:00Z", to: now }, 0), /different machine UUID/);
});

test("telemetry query validates UUID, range and paging before sending the GET", async () => {
  const { client, calls } = clientFor(() => [point]);
  const { telemetryApi } = loadModule("src/apis/telemetry.api.ts", {
    "@/lib/http": axiosMock(client), "@/schema/machines.schema": machineSchemas,
    "@/schema/telemetry.schema": telemetrySchemas,
  });
  const signal = new AbortController().signal;
  const data = await telemetryApi.listMachinePoints(machineId, { from: "2026-10-22T00:00:00Z", to: now }, 100, signal);

  assert.equal(data[0].machineId, machineId);
  assert.equal(calls[0].url, `/telemetry-query/machines/${machineId}/points`);
  assert.deepEqual(calls[0].config.params, { from: "2026-10-22T00:00:00Z", to: now, limit: 100, offset: 100 });
  assert.equal(calls[0].config.baseURL, "/api/dolores/v1");
  assert.equal(calls[0].config.signal, signal);
  await assert.rejects(telemetryApi.listMachinePoints("invalid-id", { from: "2026-10-22T00:00:00Z", to: now }, 0));
  await assert.rejects(telemetryApi.listMachinePoints(machineId, { from: now, to: "2026-10-22T00:00:00Z" }, 0));
  await assert.rejects(telemetryApi.listMachinePoints(machineId, { from: "bad-date", to: now }, 0));
  await assert.rejects(telemetryApi.listMachinePoints(machineId, { from: "2026-10-22T00:00:00Z", to: now }, 100_001));
  assert.equal(calls.length, 1);
});

function queryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
}

const styleMap = new Proxy({}, { get: (_target, key) => String(key) });
function pageMocks(apiMocks, router = { isReady: true, query: {} }) {
  return {
    "next/link": ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children),
    "next/router": { useRouter: () => router },
    "./admin-shell": { AdminShell: ({ children }) => React.createElement("div", null, children), adminStyles: styleMap },
    "../admin-shell": { AdminShell: ({ children }) => React.createElement("div", null, children), adminStyles: styleMap },
    "@/routes/path": pathModule,
    "@/text/admin/admin-operations-messages": messageModule,
    "@/schema/machines.schema": machineSchemas,
    "@/schema/telemetry.schema": telemetrySchemas,
    "@/schema/profiles.schema": profileSchemas,
    "@/apis/machines.api": { machinesApi: {} },
    "@/apis/telemetry.api": { telemetryApi: {} },
    "@/apis/contracts.api": { contractsApi: {} },
    "@/apis/locations.api": { locationsApi: {} },
    "@/apis/profiles.api": { profilesApi: {} },
    ...apiMocks,
  };
}

function renderPage(Page, client) {
  return renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(Page)));
}

test("machine inventory page renders loaded rows and a meaningful empty state", () => {
  const Page = loadModule("src/pages/admin/machines.page.tsx", pageMocks({
    "@/apis/machines.api": { machinesApi: { list: async () => [inventoryItem], getInventorySummary: async () => ({ totalMachines: 1, statusCounts: { IN_WAREHOUSE: 1 } }) } },
  })).default;
  const client = queryClient();
  client.setQueryData(["dolores", "machines", "inventory"], [inventoryItem]);
  client.setQueryData(["dolores", "machines", "inventory-summary"], { totalMachines: 1, statusCounts: { IN_WAREHOUSE: 1 } });
  const markup = renderPage(Page, client);
  assert.match(markup, /TEST_DATA-MACHINE-01/);
  assert.match(markup, new RegExp(`/admin/machines/${machineId}`));
  assert.match(markup, /Owner ID/);

  const emptyClient = queryClient();
  emptyClient.setQueryData(["dolores", "machines", "inventory"], []);
  emptyClient.setQueryData(["dolores", "machines", "inventory-summary"], { totalMachines: 0, statusCounts: {} });
  const emptyMarkup = renderPage(Page, emptyClient);
  assert.ok(emptyMarkup.includes(messages.COMMON.EMPTY));
});

test("machine detail rejects an invalid route UUID without issuing API reads", () => {
  const Page = loadModule("src/pages/admin/machines/[machineId].page.tsx", pageMocks({}, { isReady: true, query: { machineId: "invalid-id" } })).default;
  const markup = renderPage(Page, queryClient());
  assert.ok(markup.includes(messages.MACHINES.INVALID_ID));
  assert.match(markup, /role="alert"/);
});

test("IoT Owner detail joins only matching machines, contracts and locations", () => {
  const Page = loadModule("src/pages/admin/iot.page.tsx", pageMocks({}, { isReady: true, query: { ownerId } })).default;
  const client = queryClient();
  client.setQueryData(["dolores", "profiles", "owner", ownerId, "iot"], {
    idaasUserId: ownerId, email: "owner@example.invalid", fullName: "TEST_DATA Owner",
    emailVerified: true, roles: ["OWNER"], status: "ACTIVE",
  });
  client.setQueryData(["dolores", "machines", "inventory"], [inventoryItem]);
  client.setQueryData(["dolores", "contracts", "all"], [{
    id: "f1000000-0000-4000-8000-000000000003", ownerId, machineId, status: "ACTIVE", machineTypeSnapshot: "SMART_IOT",
  }]);
  client.setQueryData(["dolores", "locations", "owner", ownerId], [{
    id: "f1000000-0000-4000-8000-000000000002", ownerId, name: "TEST_DATA Store", address: "Test Street", city: "Test City", active: true,
  }]);

  const markup = renderPage(Page, client);
  assert.match(markup, /TEST_DATA Owner/);
  assert.match(markup, /TEST_DATA Store/);
  assert.match(markup, /TEST_DATA-MACHINE-01/);
  assert.match(markup, /Smart IoT/);
  assert.match(markup, new RegExp(`href="/admin/machines/${machineId}"`));
});
