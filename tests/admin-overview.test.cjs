const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const axios = require("axios");

const root = join(__dirname, "..");

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

function tokenWithRoles(roles) {
  const payload = Buffer.from(JSON.stringify({ roles })).toString("base64url");
  return `header.${payload}.signature`;
}

function adminPageDependencies() {
  const React = require("react");
  return {
    "next/link": ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children),
    "@/components/button/button-bar": {
      ButtonBar: React.forwardRef(({ href, children, ...props }, ref) => href
        ? React.createElement("a", { href, ref, ...props }, children)
        : React.createElement("button", { ref, ...props }, children)),
    },
    "@/routes/path": {
      PATH_ADMIN: {
        REPORTS: "/admin/reports",
        IOT: "/admin/iot",
        MACHINES: "/admin/machines",
      },
    },
  };
}

test("admin role routing accepts IDaaS roles and rejects malformed tokens", () => {
  const roles = loadModule("src/lib/auth-role.ts", {
    "@/routes/path": {
      PATH_ADMIN: { ROOT: "/admin" },
      PATH_HOME: { ROOT: "/" },
      PATH_MODERATOR: { ROOT: "/moderator" },
      PATH_CUSTOMER: { ROOT: "/dashboard" },
      PATH_TECHNICIAN: { ROOT: "/technician" },
    },
  });

  assert.equal(roles.getPostLoginPath(tokenWithRoles(["admin"])), "/admin");
  assert.equal(roles.getPostLoginPath(tokenWithRoles(["ROLE_ADMIN"])), "/admin");
  assert.equal(roles.hasModeratorRole(tokenWithRoles(["moderator"])), true);
  assert.equal(roles.hasModeratorRole(tokenWithRoles(["ROLE_MODERATOR"])), true);
  assert.equal(roles.getPostLoginPath(tokenWithRoles(["moderator"])), "/moderator");
  assert.equal(roles.getPostLoginPath(tokenWithRoles(["ROLE_MODERATOR"])), "/moderator");
  assert.equal(roles.hasOwnerRole(tokenWithRoles(["owner"])), true);
  assert.equal(roles.hasOwnerRole(tokenWithRoles(["ROLE_OWNER"])), true);
  assert.equal(roles.getPostLoginPath(tokenWithRoles(["owner"])), "/dashboard");
  assert.equal(roles.hasTechnicianRole(tokenWithRoles(["technician"])), true);
  assert.equal(roles.hasTechnicianRole(tokenWithRoles(["ROLE_TECHNICIAN"])), true);
  assert.equal(roles.getPostLoginPath(tokenWithRoles(["technician"])), "/technician");
  assert.equal(roles.canAccessCustomerArea(tokenWithRoles(["owner"])), true);
  assert.equal(roles.canAccessTechnicianArea(tokenWithRoles(["technician"])), true);
  assert.equal(roles.canAccessCustomerArea(tokenWithRoles(["owner", "technician"])), false);
  assert.equal(roles.canAccessTechnicianArea(tokenWithRoles(["owner", "technician"])), false);
  assert.equal(roles.getPostLoginPath(tokenWithRoles(["owner", "technician"])), "/");
  assert.equal(roles.getPostLoginPath(tokenWithRoles(["guest"])), "/");
  assert.equal(roles.getPostLoginPath(tokenWithRoles(["admin", "moderator"])), "/admin");
  assert.equal(roles.hasModeratorRole("invalid"), false);
  assert.equal(roles.hasAdminRole("invalid"), false);
});

test("dashboard response validates current Dolores owner metrics", () => {
  const { DashboardOverviewSchema } = loadModule("src/schema/dashboard.schema.ts");
  const payload = {
    scope: "PLATFORM",
    ownerId: null,
    asOfDate: "2026-10-23",
    operationalMetrics: {
      totalOwners: 4,
      cupsInSelectedPeriod: 27,
      dailyAcceptedCupUsage: [{ date: "2026-10-22", cups: 11 }],
    },
    financialMetrics: [{ currency: "VND", amountIssued: 1000 }],
  };
  const parsed = DashboardOverviewSchema.parse(payload);
  assert.equal(parsed.operationalMetrics.totalOwners, 4);
  assert.throws(
    () => DashboardOverviewSchema.parse({
      ...payload,
      operationalMetrics: { totalOwners: -1 },
    }),
  );
});

test("overview API targets Dolores route and parses the response", async () => {
  const calls = [];
  const signal = new AbortController().signal;
  const payload = { scope: "PLATFORM", operationalMetrics: { totalOwners: 3 } };
  const { DashboardOverviewSchema } = loadModule("src/schema/dashboard.schema.ts");
  const { dashboardApi } = loadModule("src/apis/dashboard.api.ts", {
    "@/lib/http": {
      DOLORES_API_BASE_URL: "/api/dolores/v1",
      axiosClient: {
        get: async (url, config) => {
          calls.push({ url, config });
          return { data: payload };
        },
      },
    },
    "@/schema/dashboard.schema": { DashboardOverviewSchema },
  });

  const result = await dashboardApi.getOverview(signal);
  assert.equal(result.operationalMetrics.totalOwners, 3);
  assert.deepEqual(calls, [{
    url: "/dashboard/overview",
    config: { baseURL: "/api/dolores/v1", signal },
  }]);
});

test("shared HTTP client refreshes with IDaaS and retries Dolores on its own base URL", async () => {
  let accessToken = "old-access";
  const cookies = {
    get: (key) => key === "access_token" ? accessToken : undefined,
    set: (_key, value) => { accessToken = value; },
    remove: () => { accessToken = ""; },
  };
  const oldWindow = global.window;
  global.window = {
    location: { protocol: "http:", pathname: "/admin", assign: () => {} },
  };

  try {
    const { axiosClient, DOLORES_API_BASE_URL } = loadModule("src/lib/http.ts", {
      "js-cookie": { __esModule: true, default: cookies },
      "@/routes/path": { PATH_AUTH: { LOGIN: "/login" } },
      "@/schema/auth.schema": {
        LoginSuccessResponseSchema: { parse: (value) => value },
      },
    });
    const calls = [];
    let doloresCount = 0;
    axiosClient.defaults.adapter = async (config) => {
      calls.push({
        baseURL: config.baseURL,
        url: config.url,
        authorization: config.headers.get("Authorization"),
      });
      if (config.baseURL === DOLORES_API_BASE_URL && doloresCount++ === 0) {
        const response = {
          data: { error: "expired" },
          status: 401,
          statusText: "Unauthorized",
          headers: {},
          config,
        };
        throw new axios.AxiosError("Unauthorized", "ERR_BAD_RESPONSE", config, {}, response);
      }
      return {
        data: config.url === "/auth/refresh"
          ? { access_token: "new-access", expires_in: 900 }
          : { scope: "PLATFORM" },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    };

    const response = await axiosClient.get("/dashboard/overview", {
      baseURL: DOLORES_API_BASE_URL,
    });
    assert.deepEqual(response.data, { scope: "PLATFORM" });
    assert.deepEqual(calls, [
      { baseURL: "/api/dolores/v1", url: "/dashboard/overview", authorization: "Bearer old-access" },
      { baseURL: "/api/v1", url: "/auth/refresh", authorization: undefined },
      { baseURL: "/api/dolores/v1", url: "/dashboard/overview", authorization: "Bearer new-access" },
    ]);
  } finally {
    global.window = oldWindow;
  }
});

test("a second Dolores 401 stops after one refresh", async () => {
  const previousWindow = global.window;
  global.window = {
    location: { protocol: "http:", pathname: "/admin", assign: () => {} },
  };

  try {
    const { axiosClient, DOLORES_API_BASE_URL } = loadModule("src/lib/http.ts", {
      "js-cookie": {
        __esModule: true,
        default: { get: () => "old-access", set: () => {}, remove: () => {} },
      },
      "@/routes/path": { PATH_AUTH: { LOGIN: "/login" } },
      "@/schema/auth.schema": {
        LoginSuccessResponseSchema: { parse: (value) => value },
      },
    });
    const calls = [];
    axiosClient.defaults.adapter = async (config) => {
      calls.push({ baseURL: config.baseURL, url: config.url });
      if (config.url === "/auth/refresh") {
        return {
          data: { access_token: "new-access", expires_in: 900 },
          status: 200, statusText: "OK", headers: {}, config,
        };
      }
      const response = {
        data: { error: "unauthorized" },
        status: 401, statusText: "Unauthorized", headers: {}, config,
      };
      throw new axios.AxiosError("Unauthorized", "ERR_BAD_RESPONSE", config, {}, response);
    };

    await assert.rejects(
      axiosClient.get("/dashboard/overview", { baseURL: DOLORES_API_BASE_URL }),
      (error) => error.response?.status === 401,
    );
    assert.deepEqual(calls, [
      { baseURL: "/api/dolores/v1", url: "/dashboard/overview" },
      { baseURL: "/api/v1", url: "/auth/refresh" },
      { baseURL: "/api/dolores/v1", url: "/dashboard/overview" },
    ]);
  } finally {
    global.window = previousWindow;
  }
});

test("admin overview shows API metrics and links to available admin pages", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { ADMIN_MESSAGES } = loadModule("src/text/admin/admin-messages.ts");
  const result = {
    data: {
      scope: "PLATFORM",
      asOfDate: "2026-10-23",
      usagePeriodStart: "2026-10-01",
      usagePeriodEnd: "2026-10-23",
      operationalMetrics: {
        totalOwners: 4,
        cupsInSelectedPeriod: 27,
        openMaintenanceTickets: 2,
        openInstallationWorkOrders: 1,
        dailyAcceptedCupUsage: [{ date: "2026-10-22", cups: 11 }],
      },
      financialMetrics: [{ currency: "VND", amountIssued: 1000 }],
    },
    isPending: false,
    isError: false,
  };
  const { default: AdminPage } = loadModule("src/pages/admin/index.page.tsx", {
    ...adminPageDependencies(),
    "@tanstack/react-query": { useQuery: () => result },
    "@/apis/dashboard.api": { dashboardApi: {} },
    "@/text/admin/admin-messages": { ADMIN_MESSAGES },
    "./admin-shell": {
      AdminShell: ({ children, actions }) => React.createElement(React.Fragment, null, children, actions),
      adminStyles: new Proxy({}, { get: (_target, key) => String(key) }),
    },
  });

  const html = renderToStaticMarkup(React.createElement(AdminPage));
  assert.match(html, /Tổng quan vận hành/);
  assert.match(html, /Khách hàng/);
  assert.match(html, /2026-10-22/);
  assert.match(html, /1\.000/);
  assert.equal((html.match(/disabled=""/g) || []).length, 0);
  assert.match(html, /href="\/admin\/reports"/);
  assert.match(html, /href="\/admin\/iot"/);
  assert.match(html, /href="\/admin\/machines"/);
});

test("admin overview renders retry feedback when Dolores fails", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { ADMIN_MESSAGES } = loadModule("src/text/admin/admin-messages.ts");
  const { default: AdminPage } = loadModule("src/pages/admin/index.page.tsx", {
    ...adminPageDependencies(),
    "@tanstack/react-query": {
      useQuery: () => ({
        isPending: false,
        isError: true,
        error: new axios.AxiosError("Network Error"),
        refetch: () => {},
      }),
    },
    "@/apis/dashboard.api": { dashboardApi: {} },
    "@/text/admin/admin-messages": { ADMIN_MESSAGES },
    "./admin-shell": {
      AdminShell: ({ children, actions }) => React.createElement(React.Fragment, null, children, actions),
      adminStyles: new Proxy({}, { get: (_target, key) => String(key) }),
    },
  });

  const html = renderToStaticMarkup(React.createElement(AdminPage));
  assert.match(html, /Không kết nối được tới Dolores/);
  assert.match(html, /Thử lại/);
  assert.match(html, /role="alert"/);
});

test("admin overview distinguishes loading, empty data, and forbidden access", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { ADMIN_MESSAGES } = loadModule("src/text/admin/admin-messages.ts");
  const renderState = (query) => {
    const { default: AdminPage } = loadModule("src/pages/admin/index.page.tsx", {
      ...adminPageDependencies(),
      "@tanstack/react-query": { useQuery: () => query },
      "@/apis/dashboard.api": { dashboardApi: {} },
      "@/text/admin/admin-messages": { ADMIN_MESSAGES },
      "./admin-shell": {
        AdminShell: ({ children }) => children,
        adminStyles: new Proxy({}, { get: (_target, key) => String(key) }),
      },
    });
    return renderToStaticMarkup(React.createElement(AdminPage));
  };

  assert.match(renderState({ isPending: true, isError: false }), new RegExp(ADMIN_MESSAGES.OVERVIEW.LOADING));
  assert.match(
    renderState({ isPending: false, isError: false, data: { operationalMetrics: null } }),
    new RegExp(ADMIN_MESSAGES.OVERVIEW.EMPTY),
  );
  const forbiddenError = new axios.AxiosError("Forbidden", "ERR_BAD_RESPONSE", {}, {}, { status: 403 });
  assert.match(
    renderState({ isPending: false, isError: true, error: forbiddenError, refetch: () => {} }),
    new RegExp(ADMIN_MESSAGES.OVERVIEW.FORBIDDEN),
  );
});

function businessToday() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function calendarDayOffset(day, offset) {
  const value = new Date(`${day}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

test("operational dashboard date range is inclusive, ends no later than today, and allows at most 90 calendar days", () => {
  const { DashboardDateRangeSchema } = loadModule("src/schema/dashboard.schema.ts");
  const today = businessToday();
  assert.equal(DashboardDateRangeSchema.safeParse({ fromDate: calendarDayOffset(today, -89), toDate: today }).success, true);
  assert.equal(DashboardDateRangeSchema.safeParse({ fromDate: calendarDayOffset(today, -90), toDate: today }).success, false);
  assert.equal(DashboardDateRangeSchema.safeParse({ fromDate: today, toDate: calendarDayOffset(today, 1) }).success, false);
  assert.equal(DashboardDateRangeSchema.safeParse({ fromDate: today, toDate: calendarDayOffset(today, -1) }).success, false);
});

test("dashboard response strictly validates documented period financial metrics", () => {
  const { DashboardOverviewSchema } = loadModule("src/schema/dashboard.schema.ts");
  const quality = (status, counts = {}) => ({
    status,
    eligibleCount: 10,
    evidencedCount: 10,
    missingCount: 0,
    ambiguousCount: 0,
    excludedClassificationCount: 0,
    exclusionReasons: {},
    ...counts,
  });
  const metric = {
    currency: "VND",
    amountIssuedInPeriod: 1_250_000,
    amountCollectedInPeriod: 800_000,
    issuanceQuality: quality("COMPLETE"),
    collectionQuality: quality("PARTIAL", {
      evidencedCount: 8,
      missingCount: 2,
      excludedClassificationCount: 1,
      exclusionReasons: { "1": 1 },
    }),
    issuanceBasis: "CONTRACTUAL_ISSUANCE",
    collectionBasis: "PAYMENT_EVIDENCE",
  };
  const parsed = DashboardOverviewSchema.parse({
    operationalMetrics: { cupsInSelectedPeriod: 42, dailyAcceptedCupUsage: [] },
    periodFinancialMetrics: [metric],
  });
  assert.deepEqual(parsed.periodFinancialMetrics, [metric]);
  assert.equal(DashboardOverviewSchema.safeParse({
    periodFinancialMetrics: [{ ...metric, amountIssuedInPeriod: "1,250,000" }],
  }).success, false);
  assert.equal(DashboardOverviewSchema.safeParse({
    periodFinancialMetrics: [{ ...metric, issuanceQuality: { ...metric.issuanceQuality, status: "REPORTED" } }],
  }).success, false);
  assert.equal(DashboardOverviewSchema.safeParse({
    periodFinancialMetrics: [{ ...metric, collectionQuality: { ...metric.collectionQuality, missingCount: 0.5 } }],
  }).success, false);
  assert.equal(DashboardOverviewSchema.safeParse({
    periodFinancialMetrics: [{ ...metric, currency: null }],
  }).success, false);
  assert.equal(DashboardOverviewSchema.safeParse({
    periodFinancialMetrics: [{ ...metric, undocumentedValue: 123 }],
  }).success, false);
});

test("operational overview requests JWT-scoped aggregate data without a client ownerId", async () => {
  const calls = [];
  const signal = new AbortController().signal;
  const dashboardSchemas = loadModule("src/schema/dashboard.schema.ts");
  const { dashboardApi } = loadModule("src/apis/dashboard.api.ts", {
    "@/lib/http": {
      DOLORES_API_BASE_URL: "/api/dolores/v1",
      axiosClient: {
        get: async (url, config) => {
          calls.push({ url, config });
          return { data: { operationalMetrics: { cupsInSelectedPeriod: 42, dailyAcceptedCupUsage: [] } } };
        },
      },
    },
    "@/schema/dashboard.schema": dashboardSchemas,
  });
  await dashboardApi.getOverview(signal, "2026-10-26", "2026-11-01");
  assert.deepEqual(calls[0], {
    url: "/dashboard/overview",
    config: {
      baseURL: "/api/dolores/v1",
      signal,
      params: { fromDate: "2026-10-26", toDate: "2026-11-01" },
    },
  });
  assert.equal(Object.hasOwn(calls[0].config.params, "ownerId"), false);
});

test("shared operational overview offers calendar presets, explains aggregate scope, and avoids per-machine inference", () => {
  const componentPath = join(root, "src/components/machines/operational-overview.tsx");
  assert.ok(existsSync(componentPath), "all roles should share one operational overview presentation");
  const source = readFileSync(componentPath, "utf8");
  for (const label of ["Hôm nay", "Hôm qua", "Tuần này", "Tuần trước", "30 ngày", "Tháng này"]) {
    assert.ok(source.includes(label), `missing calendar shortcut ${label}`);
  }
  assert.ok(/default.{0,80}(?:7 ngày|seven days|7-day)/i.test(source), "default overview range should be seven calendar days");
  assert.ok(/type=["']date["']/.test(source), "custom overview range should use calendar-date inputs");
  assert.ok(/DashboardDateRangeSchema\.safeParse/.test(source), "custom ranges should use shared validation");
  assert.ok(/dailyAcceptedCupUsage/.test(source), "daily chart should use the aggregate API series");
  assert.ok(/cupsInSelectedPeriod/.test(source), "period cups should use the aggregate API total");
  assert.ok(/phạm vi tổng hợp|dữ liệu tổng hợp/i.test(source), "overview should disclose aggregate scope");
  assert.ok(/ngữ cảnh/i.test(source), "overview should disclose selected machine as context only");
  assert.ok(/periodFinancialMetrics/.test(source), "financial values should come from documented period metrics");
  assert.ok(/amountIssuedInPeriod/.test(source), "issued money should be labeled as a period amount");
  assert.ok(/amountCollectedInPeriod/.test(source), "collected money should be labeled as a period amount");
  assert.ok(/trong kỳ|period/i.test(source), "financial labels should identify the reporting period");
  assert.doesNotMatch(source, /amountIssued\s*\?\?\s*0|amountCollected\s*\?\?\s*0/);
  assert.doesNotMatch(source, /totalPayg|paygTotal/i);
  assert.doesNotMatch(source, /getDailyMachineCupUsage|daily-cups\/machines/);
  assert.doesNotMatch(source, /cupsInSelectedPeriod\s*\/|amountCollected\s*\/\s*\w*machine/i);
});

test("Owner, Admin, and Moderator machine routes retain context for the shared operational overview", () => {
  const pathSource = readFileSync(join(root, "src/routes/path.ts"), "utf8");
  for (const role of ["PATH_CUSTOMER", "PATH_ADMIN", "PATH_MODERATOR"]) {
    const roleStart = pathSource.indexOf(`export const ${role} = {`);
    const roleEnd = pathSource.indexOf("} as const", roleStart);
    const roleBlock = roleStart >= 0 && roleEnd >= 0 ? pathSource.slice(roleStart, roleEnd) : "";
    assert.ok(
      roleBlock.includes("MACHINE_OPERATIONAL_OVERVIEW") && roleBlock.includes("/operations"),
      `${role} should expose a machine-scoped operations route helper`,
    );
  }

  const routesSource = readFileSync(join(root, "src/routes/routes.ts"), "utf8");
  const ownerRouteStart = routesSource.indexOf("export function isSupportedCustomerSection");
  const ownerRouteEnd = routesSource.indexOf("export function isSupportedTechnicianSection", ownerRouteStart);
  const ownerRoutes = routesSource.slice(ownerRouteStart, ownerRouteEnd);
  assert.ok(/segments\.length\s*===\s*3/.test(ownerRoutes), "Owner routes should validate a three-segment machine operations URL");
  assert.ok(/segments\[2\]\s*===\s*["']operations["']/.test(ownerRoutes), "Owner route should accept only the operations child route");
  const moderatorRouteStart = routesSource.indexOf("export function isSupportedModeratorSection");
  const moderatorRoutes = routesSource.slice(moderatorRouteStart);
  assert.ok(moderatorRoutes.includes("operations"), "Moderator routes should validate machine operations UUID context");

  for (const [screen, label] of [
    ["src/pages/dashboard/machines/machines-screen.tsx", "Owner"],
    ["src/pages/admin/machines/machine-detail-screen.tsx", "Admin"],
    ["src/pages/moderator/machines/machine-detail-screen.tsx", "Moderator"],
  ]) {
    const source = readFileSync(join(root, screen), "utf8");
    assert.ok(/MACHINE_OPERATIONAL_OVERVIEW/.test(source), `${label} detail should preserve the selected machine in its operations link`);
    assert.ok(/Xem dữ liệu vận hành/.test(source), `${label} detail should expose the operational overview action`);
  }
});
