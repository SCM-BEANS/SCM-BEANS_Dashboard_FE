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
  new Function("require", "module", "exports", outputText)(
    (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id),
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

const id = "00000000-0000-4000-8000-000000000001";
const item = {
  actionKey: "INVOICE:" + id + ":OWNER_INVOICE_PAYMENT",
  resourceType: "INVOICE",
  resourceId: id,
  actionType: "OWNER_INVOICE_PAYMENT",
  status: "PENDING",
  title: "Thanh toán hóa đơn",
  ownerId: id,
  ownerName: "Owner",
  contractId: id,
  machineId: id,
  machineSerialNumber: "M-001",
  technicianId: null,
  technicianName: null,
  createdAt: "2026-10-31T10:00:00Z",
  scheduledAt: null,
  dueAt: "2026-10-31T10:00:00Z",
  overdue: true,
  priority: "HIGH",
  priorityReason: "Overdue",
  detailPath: "/api/v1/invoices/" + id,
  workType: null,
  availableActions: [{ code: "VIEW", method: "GET", path: "/api/v1/invoices/" + id }],
  nextAction: { code: "VIEW", method: "GET", path: "/api/v1/invoices/" + id },
};

test("dashboard action items use the authenticated API route with validated bounded filters", async () => {
  const calls = [];
  const schemas = load("src/schema/dashboard.schema.ts");
  const api = load("src/apis/dashboard.api.ts", {
    "@/lib/http": {
      axiosClient: { get: async (url, config) => { calls.push([url, config]); return { data: { items: [item], page: 1, size: 20, hasMore: true, generatedAt: "2026-10-31T10:00:00Z", businessTimezone: "Asia/Ho_Chi_Minh", workflowAvailability: [] } }; } },
      DOLORES_API_BASE_URL: "/api/dolores/v1",
    },
    "@/schema/dashboard.schema": schemas,
  }).dashboardApi;
  const result = await api.getActionItems({ timeBucket: "OVERDUE", page: 1, size: 20 });
  assert.equal(result.items[0].resourceId, id);
  assert.equal(result.hasMore, true);
  assert.deepEqual(calls[0], ["/dashboard/action-items", {
    baseURL: "/api/dolores/v1", signal: undefined, params: { timeBucket: "OVERDUE", page: 1, size: 20 },
  }]);
  await assert.rejects(api.getActionItems({ page: -1, size: 101 }), /too_small|too_big/i);
  assert.equal(calls.length, 1);
});

test("alert acknowledgment posts only the UUID action route and consumes the no-content response", async () => {
  const calls = [];
  const schemas = load("src/schema/notifications.schema.ts");
  const api = load("src/apis/notifications.api.ts", {
    "@/lib/http": { axiosClient: { post: async (...args) => calls.push(args) }, DOLORES_API_BASE_URL: "/api/dolores/v1" },
    "@/schema/notifications.schema": schemas,
  }).notificationsApi;
  await api.acknowledgeAlert(id);
  assert.deepEqual(calls[0], ["/alerts/" + id + "/ack", undefined, { baseURL: "/api/dolores/v1" }]);
  await assert.rejects(api.acknowledgeAlert("not-a-uuid"));
  assert.equal(calls.length, 1);
});

test("operational UI scopes queries, uses mapped role routes and never navigates to API action paths", () => {
  const panel = readFileSync(join(__dirname, "../src/components/features/operations/action-items-panel.tsx"), "utf8");
  const alertAction = readFileSync(join(__dirname, "../src/components/features/operations/alert-acknowledgement-button.tsx"), "utf8");
  const notificationInbox = readFileSync(join(__dirname, "../src/components/notifications/notification-inbox.tsx"), "utf8");
  assert.match(panel, /authScopedQuerySubject\(role\)/);
  assert.match(panel, /mappedWorkflowPath/);
  assert.match(panel, /path\.startsWith\(.*api/);
  assert.doesNotMatch(panel, /href=\{item\.(?:detailPath|nextAction)|href=\{item\.availableActions/);
  assert.match(alertAction, /\["CRITICAL", "HIGH"\]/);
  assert.match(alertAction, /invalidateQueries\(\{ queryKey: \["dolores", "alerts"\] \}\)/);
  assert.match(notificationInbox, /authScopedQuerySubject\(roleScope\)/);
});

test("authorized heartbeat cards refresh and Moderator telemetry remains disabled until backend role scope is aligned", () => {
  const panel = readFileSync(join(__dirname, "../src/components/features/operations/machine-heartbeat-panel.tsx"), "utf8");
  const admin = readFileSync(join(__dirname, "../src/pages/admin/machines/machine-detail-screen.tsx"), "utf8");
  const moderator = readFileSync(join(__dirname, "../src/pages/moderator/iot/iot-screen.tsx"), "utf8");
  const points = readFileSync(join(__dirname, "../src/components/features/operations/machine-telemetry-points-panel.tsx"), "utf8");
  assert.match(panel, /refetchInterval: 5_000/);
  assert.match(admin, /refetchInterval: isSmartIot \? 5_000 : false/);
  assert.match(moderator, /IOT_MODERATOR_TELEMETRY_UNAVAILABLE/);
  assert.doesNotMatch(moderator, /telemetryApi\.(?:getLatestHeartbeat|listMachinePoints)/);
  assert.match(points, /TELEMETRY_POINTS_PAGE_SIZE/);
  assert.match(points, /enabled: Boolean\(range\)/);
  assert.match(points, /authScopedQuerySubject\(role\)/);
});
