const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { join, resolve, dirname } = require("node:path");
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
  steps: ["DOSE:18", "TAMP:100", "HOLDTAMP:50", "EXTRACT:36", "DRYTAMP:100"],
  revision: 3,
  menuId: "00000000-0000-0000-0000-000000000090",
};
const publishInput = {
  name: recipe.name,
  procedure: recipe.steps,
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

function loadModule(relativePath, mocks = {}, resolveAliases = false, cache = new Map()) {
  const fileName = resolve(root, relativePath);
  if (cache.has(fileName)) return cache.get(fileName).exports;
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
  cache.set(fileName, loaded);
  const mockedRequire = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (resolveAliases && (id.startsWith("@/") || id.startsWith("."))) {
      const base = id.startsWith("@/") ? join(root, "src", id.slice(2)) : resolve(dirname(fileName), id);
      const dependency = [base + ".ts", base + ".tsx"].find(existsSync);
      if (!dependency) throw new Error("Unresolved test import: " + id);
      return loadModule(dependency, mocks, true, cache);
    }
    return (id === "@/lib/evidence-multipart" ? require("./evidence-multipart-helper.cjs") : require(id));
  };
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
  ActionBar: ({ children }) => React.createElement("div", { "data-action-bar": "true" }, children),
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
  "@/components/action-bar/action-bar": actionBarMock,
  "@/routes/path": pathModule,
};

function renderPage(Page) {
  return renderToStaticMarkup(React.createElement(Page));
}

test("recipe APIs publish native DSL and validate paginated global summaries and detail identity", async () => {
  const recipeSchemas = loadModule("src/schema/recipes.schema.ts");
  assert.equal(recipeSchemas.GlobalRecipesSchema.parse([recipe])[0].id, recipeId);
  assert.equal(recipeSchemas.GlobalRecipeSchema.safeParse({ ...recipe, id: "invalid" }).success, false);
  assert.equal(recipeSchemas.RecipePublishRequestSchema.safeParse({
    ...publishInput,
    procedure: [],
  }).success, false);

  const { steps, ...summary } = recipe;
  const { client, calls } = clientFor((_method, url) => {
    return url === "/recipes/global" && _method === "GET" ? [summary] : recipe;
  });
  const { recipesApi } = loadModule("src/apis/recipes.api.ts", {
    "@/lib/http": httpMock(client),
    "@/schema/recipes.schema": recipeSchemas,
  }, true);
  const signal = new AbortController().signal;

  assert.deepEqual(await recipesApi.listGlobal(signal), [summary]);
  assert.deepEqual(await recipesApi.getGlobalById(recipeId, signal), recipe);
  assert.deepEqual(await recipesApi.publishGlobal(publishInput), recipe);
  assert.deepEqual(calls.map(({ method, url }) => [method, url]), [
    ["GET", "/recipes/global"],
    ["GET", "/recipes/global/" + recipeId],
    ["POST", "/recipes/global"],
  ]);
  assert.equal(calls[0].config.baseURL, "/api/dolores/v1");
  assert.equal(calls[0].config.signal, signal);
  assert.deepEqual(calls[0].config.params, { page: 0, size: 50 });
  assert.deepEqual(calls[2].data, publishInput);
  await assert.rejects(recipesApi.getGlobalById("invalid"));
  await assert.rejects(recipesApi.publishGlobal({ name: recipe.name, steps, dosageBounds: [] }));
  assert.equal(calls.length, 3, "invalid UUIDs and legacy write payloads must fail before HTTP");
});

test("billing and notification schemas accept nullable legacy invoice scope fields and reject malformed responses", async () => {
  const billingSchemas = loadModule("src/schema/billing.schema.ts");
  assert.deepEqual(billingSchemas.InvoicesSchema.parse([invoice]), [invoice]);
  assert.equal(billingSchemas.InvoiceSchema.safeParse({ ...invoice, amount: "1250000" }).success, false);
  assert.equal(billingSchemas.InvoiceSchema.safeParse({
    ...invoice,
    ownerId: undefined,
  }).success, true);

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

test("Admin menu route renders shared global management with current DTO and role actions", async () => {
  const queries = [];
  const reads = [];
  const writes = [];
  const { steps, ...summary } = recipe;
  const envelope = { content: [{ id: recipe.menuId, name: 'Default menu', createdAt: '2026-11-05T08:00:00Z' }], page: 0, size: 20, totalElements: 1, totalPages: 1, first: true, last: true };
  const Page = loadModule("src/pages/admin/menu/index.page.tsx", {
    '../admin-shell': { AdminShell: ({ children }) => React.createElement('main', { 'data-admin-shell': true }, children) },
    'next/router': { useRouter: () => ({ push: async () => true }) },
    '@/apis/recipes.api': { recipesApi: {
      listGlobalPage: async (...args) => { reads.push(['list', ...args]); return { items: [summary], page: 0, size: 20, hasNext: false }; },
      getGlobalById: async (...args) => { reads.push(['detail', ...args]); return recipe; },
      publishGlobal: async (input) => { writes.push(input); return recipe; },
    } },
    '@/apis/recipe-menus.api': { recipeMenusApi: { listGlobal: async () => envelope } },
    '@/components/button/button-bar': { ButtonBar },
    '@/components/navigation/back-button-heading': { BackButtonHeading: ({ title, description }) => React.createElement('header', null, title, description) },
    '@/lib/query-subject': { authScopedQuerySubject: (role) => 'test:' + role },
    '@/lib/api-errors': { getRecipeApiErrorMessage: () => 'API error', getRecipeApiErrorDetails: () => ({}) },
    './legacy-recipe-overrides': { LegacyRecipeOverrides: () => { throw new Error('Inactive legacy view must not mount'); } },
    './recipe-sync-panel': { RecipeSyncPanel: () => { throw new Error('Inactive sync view must not mount'); } },
    '../repair-workflow/repair-workflow.module.css': classNames,
    '@tanstack/react-query': {
      useQuery: (options) => {
        queries.push(options);
        const data = options.enabled === false ? undefined : options.queryKey[1] === 'recipe-menus'
          ? envelope : options.queryKey[2] === 'global-detail' ? recipe : { items: [summary], page: 0, size: 20, hasNext: false };
        return { data, isPending: false, isError: false, refetch: async () => {} };
      },
      useMutation: () => ({ isPending: false, mutate: () => { throw new Error('Rendering must not write'); } }),
      useQueryClient: () => ({ invalidateQueries: async () => {} }),
    },
  }, true).default;
  const markup = renderPage(Page);
  assert.match(markup, /data-admin-shell="true"/);
  for (const label of ['TEST_DATA House Espresso', 'Phiên bản 3', 'Tạo menu', 'Tạo công thức', 'Chỉnh sửa', 'Xóa công thức', 'Theo dõi đồng bộ', 'Điều chỉnh cũ']) assert.ok(markup.includes(label), label);
  assert.match(markup, /chưa phản ánh quy trình vừa cập nhật/);
  assert.doesNotMatch(markup, /dosageBounds|Chỉnh sửa chưa được hỗ trợ|Phát hành toàn cục/);
  const signal = new AbortController().signal;
  for (const options of queries.filter((item) => item.enabled !== false)) await options.queryFn({ signal });
  assert.deepEqual(reads, [['list', 0, 20, signal, ''], ['detail', recipeId, signal]]);
  assert.equal(queries.find((item) => item.queryKey[2] === 'local').enabled, false, 'Admin must not request Owner menus');
  assert.equal(writes.length, 0, 'loading the page must not publish a recipe');
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
