const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
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
    },
  });

  assert.equal(roles.getPostLoginPath(tokenWithRoles(["admin"])), "/admin");
  assert.equal(roles.getPostLoginPath(tokenWithRoles(["ROLE_ADMIN"])), "/admin");
  assert.equal(roles.getPostLoginPath(tokenWithRoles(["owner"])), "/");
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
