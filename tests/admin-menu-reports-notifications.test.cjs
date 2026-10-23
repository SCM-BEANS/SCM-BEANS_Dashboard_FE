const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const root = join(__dirname, "..");
const recipeId = "f1000000-0000-4000-8000-000000000101";
const notificationId = "f1000000-0000-4000-8000-000000000102";
const ownerId = "f1000000-0000-4000-8000-000000000103";
const contractId = "f1000000-0000-4000-8000-000000000104";
const invoiceId = "f1000000-0000-4000-8000-000000000105";
const machineId = "f1000000-0000-4000-8000-000000000106";
const recipe = {
  id: recipeId,
  name: "TEST_DATA House Espresso",
  steps: ["GRIND:8s", "BREW:25s"],
  dosageBounds: ["bean:6:12", "water:30:50"],
};
const publishInput = {
  name: recipe.name,
  steps: recipe.steps,
  dosageBounds: recipe.dosageBounds,
};
const notification = {
  id: notificationId,
  ownerId,
  title: "TEST_DATA Notification",
  message: "Test-only notification body",
  type: "INFO",
  createdAt: "2026-10-23T09:30:00Z",
  read: false,
};
const invoice = {
  id: invoiceId,
  ownerId,
  contractId,
  amount: 1250000,
  period: "2026-10",
  type: "RENTAL",
  status: "ISSUED",
  currency: "VND",
  billingPeriodStart: "2026-10-01",
  billingPeriodEnd: "2026-10-31",
  dueDate: "2026-11-07",
  lineItems: [],
  createdAt: "2026-10-01T00:00:00Z",
};
const dashboard = {
  scope: "PLATFORM",
  asOfDate: "2026-10-23",
  usagePeriodStart: "2026-10-01",
  usagePeriodEnd: "2026-10-07",
  operationalMetrics: {
    cupsInSelectedPeriod: 31,
    dailyAcceptedCupUsage: [{ date: "2026-10-02", cups: 7 }],
  },
  financialMetrics: [{
    currency: "VND",
    amountIssued: 1250000,
    amountCollected: 800000,
    outstandingBalance: 450000,
    overdueBalance: 0,
  }],
};
const alert = {
  id: "f1000000-0000-4000-8000-000000000107",
  level: "HIGH",
  machineId,
  message: "TEST_DATA Alert message",
  acknowledged: false,
  ts: "2026-10-23T08:00:00Z",
};

function loadModule(relativePath, mocks = {}) {
  const fileName = join(root, relativePath);
  const source = readFileSync(fileName, "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const loaded = { exports: {} };
  const mockedRequire = (id) =>
    Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : require(id);
  new Function("require", "module", "exports", outputText)(
    mockedRequire,
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

function clientFor(handler) {
  const calls = [];
  const client = {
    get: async (url, config = {}) => {
      calls.push({ method: "GET", url, config });
      return { data: await handler("GET", url, undefined, config) };
    },
    post: async (url, data, config = {}) => {
      calls.push({ method: "POST", url, data, config });
      return { data: await handler("POST", url, data, config) };
    },
  };
  return { client, calls };
}

const httpMock = (client) => ({
  axiosClient: client,
  DOLORES_API_BASE_URL: "/api/dolores/v1",
});
const classNames = new Proxy({}, { get: (_target, key) => String(key) });
const actionBarMock = {
  AdminActionBar: ({ children }) => React.createElement("div", { "data-action-bar": "true" }, children),
};
const ButtonBar = React.forwardRef(({ href, children, ...props }, ref) => href
  ? React.createElement("a", { href, ref, ...props }, children)
  : React.createElement("button", { ref, ...props }, children));
const pathModule = loadModule("src/routes/path.ts");
const adminShellMocks = {
  "./admin-shell": {
    AdminShell: ({ children }) => React.createElement("main", null, children),
    adminStyles: classNames,
  },
  "@/components/button/button-bar": { ButtonBar },
  "@/components/action-bar/admin-action-bar": actionBarMock,
  "@/routes/path": pathModule,
};

function renderPage(Page) {
  return renderToStaticMarkup(React.createElement(Page));
}

test("recipe APIs validate payloads and use only global list, detail, and publish routes", async () => {
  const recipeSchemas = loadModule("src/schema/recipes.schema.ts");
  assert.equal(recipeSchemas.GlobalRecipesSchema.parse([recipe])[0].id, recipeId);
  assert.equal(recipeSchemas.GlobalRecipeSchema.safeParse({ ...recipe, id: "invalid" }).success, false);
  assert.equal(recipeSchemas.RecipePublishRequestSchema.safeParse({
    ...publishInput,
    steps: [],
  }).success, false);

  const { client, calls } = clientFor((method, url, data) => {
    if (method === "POST") return { ...recipe, ...data };
    return url === "/recipes/global" ? [recipe] : recipe;
  });
  const { recipesApi } = loadModule("src/apis/recipes.api.ts", {
    "@/lib/http": httpMock(client),
    "@/schema/recipes.schema": recipeSchemas,
  });
  const signal = new AbortController().signal;

  assert.deepEqual(await recipesApi.listGlobal(signal), [recipe]);
  assert.deepEqual(await recipesApi.getGlobalById(recipeId, signal), recipe);
  assert.deepEqual(await recipesApi.publishGlobal(publishInput), recipe);
  assert.deepEqual(calls.map(({ method, url }) => [method, url]), [
    ["GET", "/recipes/global"],
    ["GET", "/recipes/global/" + recipeId],
    ["POST", "/recipes/global"],
  ]);
  assert.equal(calls[0].config.baseURL, "/api/dolores/v1");
  assert.equal(calls[0].config.signal, signal);
  assert.deepEqual(calls[2].data, publishInput);
  await assert.rejects(recipesApi.getGlobalById("invalid"));
});

test("billing and notification schemas keep ownerId invoices and reject malformed responses", async () => {
  const billingSchemas = loadModule("src/schema/billing.schema.ts");
  assert.deepEqual(billingSchemas.InvoicesSchema.parse([invoice]), [invoice]);
  assert.equal(billingSchemas.InvoiceSchema.safeParse({ ...invoice, amount: "1250000" }).success, false);
  assert.equal(billingSchemas.InvoiceSchema.safeParse({
    ...invoice,
    ownerId: undefined,
  }).success, false);

  const notificationSchemas = loadModule("src/schema/notifications.schema.ts");
  assert.equal(notificationSchemas.NotificationsSchema.parse([notification])[0].read, false);
  assert.equal(notificationSchemas.AlertsSchema.parse([alert])[0].acknowledged, false);
  assert.equal(notificationSchemas.NotificationSchema.safeParse({
    ...notification,
    read: "false",
  }).success, false);
  assert.equal(notificationSchemas.AlertSchema.safeParse({
    ...alert,
    acknowledged: "false",
  }).success, false);

  const { client, calls } = clientFor((_method, url) => {
    if (url === "/billing/invoices") return [invoice];
    if (url === "/notifications") return [notification];
    if (url === "/alerts") return [alert];
    return { ...notification, read: true };
  });
  const { billingApi } = loadModule("src/apis/billing.api.ts", {
    "@/lib/http": httpMock(client),
    "@/schema/billing.schema": billingSchemas,
  });
  const { notificationsApi } = loadModule("src/apis/notifications.api.ts", {
    "@/lib/http": httpMock(client),
    "@/schema/notifications.schema": notificationSchemas,
  });
  const signal = new AbortController().signal;

  assert.deepEqual(await billingApi.listInvoices(signal), [invoice]);
  assert.deepEqual(await notificationsApi.list(signal), [notification]);
  assert.deepEqual(await notificationsApi.listAlerts(signal), [alert]);
  assert.equal((await notificationsApi.markAsRead(notificationId)).read, true);
  assert.deepEqual(calls.map(({ method, url }) => [method, url]), [
    ["GET", "/billing/invoices"],
    ["GET", "/notifications"],
    ["GET", "/alerts"],
    ["POST", "/notifications/" + notificationId + "/read"],
  ]);
  assert.ok(calls.every(({ config }) => config.baseURL === "/api/dolores/v1"));
  assert.equal(calls[0].config.signal, signal);
  assert.equal(calls[1].config.signal, signal);
  assert.equal(calls[2].config.signal, signal);
  await assert.rejects(notificationsApi.markAsRead("invalid"));
});

test("dashboard range validation enforces paired dates, calendar dates, and a maximum 90-day span", async () => {
  const dashboardSchemas = loadModule("src/schema/dashboard.schema.ts");
  assert.equal(dashboardSchemas.DashboardDateRangeSchema.safeParse({
    fromDate: "2026-10-01",
    toDate: "2026-10-07",
  }).success, true);
  assert.equal(dashboardSchemas.DashboardDateRangeSchema.safeParse({
    fromDate: "2026-02-30",
    toDate: "2026-03-01",
  }).success, false);
  assert.equal(dashboardSchemas.DashboardDateRangeSchema.safeParse({
    fromDate: "2026-01-01",
    toDate: "2026-04-15",
  }).success, false);

  const { client, calls } = clientFor(() => dashboard);
  const { dashboardApi } = loadModule("src/apis/dashboard.api.ts", {
    "@/lib/http": httpMock(client),
    "@/schema/dashboard.schema": dashboardSchemas,
  });
  const signal = new AbortController().signal;

  assert.equal((await dashboardApi.getOverview(signal, "2026-10-01", "2026-10-07")).scope, "PLATFORM");
  assert.deepEqual(calls[0].config.params, {
    fromDate: "2026-10-01",
    toDate: "2026-10-07",
  });
  assert.equal(calls[0].config.signal, signal);
  await assert.rejects(dashboardApi.getOverview(signal, "2026-10-01"));
  await assert.rejects(dashboardApi.getOverview(signal, "2026-01-01", "2026-04-15"));
  assert.equal(calls.length, 1);
});

test("menu page shows the read-only recipe detail and explicit global publish confirmation flow", () => {
  const recipeSchemas = loadModule("src/schema/recipes.schema.ts");
  const messages = loadModule("src/text/admin/admin-messages.ts").ADMIN_MESSAGES;
  const Page = loadModule("src/pages/admin/menu.page.tsx", {
    ...adminShellMocks,
    "@/apis/recipes.api": { recipesApi: {} },
    "@/schema/recipes.schema": recipeSchemas,
    "@/text/admin/admin-messages": { ADMIN_MESSAGES: messages },
    "@tanstack/react-query": {
      useQuery: ({ queryKey }) => queryKey.length === 3
        ? { data: [recipe], isPending: false, isError: false, refetch: () => {} }
        : { data: recipe, isPending: false, isError: false, refetch: () => {} },
      useMutation: () => ({ isPending: false, isError: false, mutate: () => {} }),
      useQueryClient: () => ({ invalidateQueries: async () => {} }),
    },
  }).default;
  const markup = renderPage(Page);

  assert.match(markup, /TEST_DATA House Espresso/);
  assert.match(markup, /Chỉnh sửa chưa được hỗ trợ/);
  assert.match(markup, /Phát hành toàn cục/);
  assert.doesNotMatch(markup, /xóa công thức|gửi menu riêng xuống máy/);
  assert.doesNotMatch(markup, /role="alertdialog"/);
});

test("reports page displays aggregate dashboard finance and full rental rows without deriving a total", async () => {
  const dashboardSchemas = loadModule("src/schema/dashboard.schema.ts");
  const billingSchemas = loadModule("src/schema/billing.schema.ts");
  const messages = loadModule("src/text/admin/admin-messages.ts").ADMIN_MESSAGES;
  const calls = [];
  const Page = loadModule("src/pages/admin/reports.page.tsx", {
    ...adminShellMocks,
    "next/router": {
      useRouter: () => ({
        isReady: true,
        query: { fromDate: "2026-10-01", toDate: "2026-10-07" },
        push: async (...args) => { calls.push(args); },
      }),
    },
    "@/apis/dashboard.api": {
      dashboardApi: {
        getOverview: async (...args) => { calls.push(args); return dashboard; },
      },
    },
    "@/apis/billing.api": { billingApi: { listInvoices: async () => [invoice] } },
    "@/schema/dashboard.schema": dashboardSchemas,
    "@/routes/path": loadModule("src/routes/path.ts"),
    "@/text/admin/admin-messages": { ADMIN_MESSAGES: messages },
    "@tanstack/react-query": {
      useQuery: (options) => {
        calls.push(options);
        return options.queryKey[1] === "dashboard"
          ? { data: dashboard, isPending: false, isError: false, refetch: () => {} }
          : { data: [invoice], isPending: false, isError: false, refetch: () => {} };
      },
    },
  }).default;
  const markup = renderPage(Page);
  assert.match(markup, /data-action-bar="true"/);
  const dashboardQuery = calls.find((item) => item && item.queryKey?.[1] === "dashboard");
  const requested = await dashboardQuery.queryFn({ signal: new AbortController().signal });
  const dashboardCall = calls.find(Array.isArray);

  assert.equal(requested.scope, "PLATFORM");
  assert.deepEqual(dashboardCall.slice(1), ["2026-10-01", "2026-10-07"]);
  assert.match(markup, /value="2026-10-01"/);
  assert.match(markup, /value="2026-10-07"/);
  assert.match(markup, /1\.250\.000 VND/);
  assert.match(markup, new RegExp(ownerId));
  assert.match(markup, new RegExp(ownerId));
  assert.match(markup, new RegExp(contractId));
  assert.match(markup, /không lọc theo ngày hoặc tự tính tổng/);
  assert.doesNotMatch(markup, /Tổng hóa đơn|Tổng doanh thu/);
});

test("notification page is read-only for alerts and changes the cache only after confirmed mark-read success", async () => {
  const notificationSchemas = loadModule("src/schema/notifications.schema.ts");
  const messages = loadModule("src/text/admin/admin-messages.ts").ADMIN_MESSAGES;
  let mutationOptions;
  let resolveRead;
  const cacheWrites = [];
  const invalidations = [];
  const Page = loadModule("src/pages/admin/notifications.page.tsx", {
    ...adminShellMocks,
    "@/apis/notifications.api": {
      notificationsApi: {
        list: async () => [notification],
        listAlerts: async () => [alert],
        markAsRead: () => new Promise((resolve) => { resolveRead = resolve; }),
      },
    },
    "@/schema/notifications.schema": notificationSchemas,
    "@/text/admin/admin-messages": { ADMIN_MESSAGES: messages },
    "@tanstack/react-query": {
      useQuery: ({ queryKey }) => queryKey[1] === "notifications"
        ? { data: [notification], isPending: false, isError: false, refetch: () => {} }
        : { data: [alert], isPending: false, isError: false, refetch: () => {} },
      useMutation: (options) => {
        mutationOptions = options;
        return { isPending: false, isError: false, variables: undefined, mutate: () => {} };
      },
      useQueryClient: () => ({
        setQueryData: (...args) => cacheWrites.push(args),
        invalidateQueries: async (query) => invalidations.push(query),
      }),
    },
  }).default;
  const markup = renderPage(Page);
  assert.match(markup, /data-action-bar="true"/);

  assert.match(markup, /TEST_DATA Notification/);
  assert.match(markup, /TEST_DATA Alert message/);
  assert.match(markup, /Cảnh báo chỉ xem/);
  assert.doesNotMatch(markup, /<button[^>]*>[^<]*(acknowledge|xác nhận)/i);

  const pending = mutationOptions.mutationFn(notificationId);
  assert.equal(cacheWrites.length, 0);
  resolveRead({ ...notification, read: true });
  const response = await pending;
  await mutationOptions.onSuccess(response);
  assert.equal(cacheWrites.length, 1);
  assert.deepEqual(invalidations, [{ queryKey: ["dolores", "notifications"] }]);
  assert.equal(cacheWrites[0][1]([{ ...notification }])[0].read, true);

  const failed = loadModule("src/apis/notifications.api.ts", {
    "@/lib/http": httpMock({
      get: async () => ({ data: [] }),
      post: async () => ({ data: { ...notification, read: false } }),
    }),
    "@/schema/notifications.schema": notificationSchemas,
  }).notificationsApi;
  await assert.rejects(failed.markAsRead(notificationId), /did not confirm/);
});
