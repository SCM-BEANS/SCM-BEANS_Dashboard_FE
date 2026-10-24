const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");

function loadTypescript(relativePath, mocks = {}) {
  const fileName = join(__dirname, "..", relativePath);
  const source = readFileSync(fileName, "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  const module = { exports: {} };
  const mockedRequire = (id) => Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : require(id);
  new Function("require", "exports", "module", outputText)(mockedRequire, module.exports, module);
  return module.exports;
}

const dashboardKey = JSON.stringify(["dolores", "dashboard", "overview"]);
const notificationsKey = JSON.stringify(["dolores", "notifications"]);
const unreadCountKey = JSON.stringify(["dolores", "notifications", "unread-count"]);
const alertsKey = JSON.stringify(["dolores", "alerts"]);
const defaultQuery = { data: undefined, isPending: false, isError: false, error: null, refetch: async () => {} };
const styles = {
  pageContent: "pageContent",
  pageHeading: "pageHeading",
  pendingNotice: "pendingNotice",
  partialNotice: "partialNotice",
  retryButton: "retryButton",
  errorNotice: "errorNotice",
};

function renderScreen(sectionPath, states = {}, mutationState = {}, notificationApiOverrides = {}) {
  const queryOptions = [];
  const mutationOptions = [];
  const apiCalls = [];
  const mutationCalls = [];
  const invalidations = [];
  const messages = loadTypescript("src/text/moderator/moderator-messages.ts").MODERATOR_MESSAGES;
  const module = loadTypescript("src/pages/moderator/moderator-read-screens.tsx", {
    "@tanstack/react-query": {
      useQuery: (options) => {
        queryOptions.push(options);
        return states[JSON.stringify(options.queryKey)] ?? defaultQuery;
      },
      useMutation: (options) => {
        mutationOptions.push(options);
        return {
          mutate: (id) => mutationCalls.push(id),
          isPending: false,
          variables: undefined,
          isError: false,
          error: null,
          ...mutationState,
        };
      },
      useQueryClient: () => ({
        invalidateQueries: async (filters) => { invalidations.push(filters); },
      }),
    },
    "@/apis/dashboard.api": {
      dashboardApi: {
        getOverview: async (signal) => {
          apiCalls.push(["dashboard", signal]);
          return { scope: "OPERATOR" };
        },
      },
    },
    "@/apis/contracts.api": {
      contractsApi: {
        listByTenant: async () => [],
        getModeratorById: async () => undefined,
        getDocuments: async () => [],
      },
    },
    "@/apis/notifications.api": {
      notificationsApi: {
        list: async (signal) => {
          apiCalls.push(["notifications", signal]);
          return [];
        },
        unreadCount: async (signal) => {
          apiCalls.push(["unreadCount", signal]);
          return { unreadCount: 0 };
        },
        markAsRead: async (id) => {
          apiCalls.push(["markAsRead", id]);
          return { id, title: "Server notice", message: "Read notification", type: "SYSTEM", read: true };
        },
        listAlerts: async (signal) => {
          apiCalls.push(["alerts", signal]);
          return [];
        },
        ...notificationApiOverrides,
      },
    },
    "@/apis/tenants.api": {
      tenantsApi: { list: async () => [], getById: async () => undefined },
    },
    "@/schema/contracts.schema": {
      ContractIdSchema: { safeParse: (value) => ({ success: /^[0-9a-f-]{36}$/i.test(value) }) },
    },
    "@/schema/tenants.schema": {
      TenantIdSchema: { safeParse: (value) => ({ success: /^[0-9a-f-]{36}$/i.test(value) }) },
    },
    "next/link": ({ href, children }) => React.createElement("a", { href }, children),
    "@/routes/path": {
      PATH_MODERATOR: {
        NOTIFICATIONS: "/moderator/notifications",
        NOTIFICATION_ALERTS: "/moderator/notifications/alerts",
      },
    },
    "./moderator-shell": { moderatorStyles: styles },
    "@/text/moderator/moderator-messages": { MODERATOR_MESSAGES: messages },
  });
  const component = module.ModeratorReadScreen({ sectionPath });
  const tree = typeof component.type === "function" ? component.type(component.props) : component;
  const html = renderToStaticMarkup(tree);
  return { html, tree, queryOptions, mutationOptions, apiCalls, mutationCalls, invalidations, messages };
}

function result(data) {
  return { data, isPending: false, isError: false, error: null, refetch: async () => {} };
}

function findElements(root, type) {
  if (Array.isArray(root)) return root.flatMap((child) => findElements(child, type));
  if (!React.isValidElement(root)) return [];
  const matches = root.type === type ? [root] : [];
  return [...matches, ...findElements(root.props.children, type)];
}

test("overview renders only values returned by the operator dashboard API", () => {
  const { html } = renderScreen("", {
    [dashboardKey]: result({
      scope: "OPERATOR",
      asOfDate: "2026-10-22",
      operationalMetrics: {
        totalOwners: 5,
        cupsInSelectedPeriod: 41,
        dailyAcceptedCupUsage: [{ date: "2026-10-21", cups: 13 }],
        openMaintenanceTickets: 2,
        openInstallationWorkOrders: 1,
      },
      financialMetrics: [{ currency: "VND", amountIssued: 100000, outstandingBalance: 25000 }],
    }),
  });

  assert.match(html, /OPERATOR/);
  assert.match(html, /Tổng số Owner/);
  assert.match(html, />5</);
  assert.match(html, />41</);
  assert.match(html, /2026-10-21/);
  assert.match(html, /25/);
  assert.doesNotMatch(html, /demo|fixture/i);
});

test("notifications offer mark-as-read only for unread records while alerts remain read-only", () => {
  const notificationId = "00000000-0000-4000-8000-000000000101";
  const alertId = "00000000-0000-4000-8000-000000000102";
  const { html: notificationHtml } = renderScreen("notifications", {
    [notificationsKey]: result([{
      id: notificationId,
      ownerId: null,
      title: "Server notice",
      message: "Read-only notification",
      type: "SYSTEM",
      createdAt: null,
      read: false,
    }]),
    [unreadCountKey]: result({ unreadCount: 3 }),
  });
  const { html: alertsHtml } = renderScreen("notifications/alerts", {
    [alertsKey]: result([{
      id: alertId,
      level: "HIGH",
      machineId: null,
      message: "Server alert",
      acknowledged: false,
      ts: "2026-10-21T10:00:00Z",
    }]),
  });

  assert.match(notificationHtml, /Server notice/);
  assert.match(notificationHtml, /Read-only notification/);
  assert.match(notificationHtml, /Chưa đọc/);
  assert.match(notificationHtml, />3</);
  assert.match(notificationHtml, /Đánh dấu đã đọc/);
  assert.match(alertsHtml, /Server alert/);
  assert.match(alertsHtml, /không lọc theo Owner hoặc tenant/);
  assert.match(alertsHtml, /Đang hoạt động/);
  assert.doesNotMatch(alertsHtml, /<button/);
});

test("mark-as-read submits the clicked notification and refreshes list/count only after a confirmed response", async () => {
  const notificationId = "00000000-0000-4000-8000-000000000101";
  const notification = {
    id: notificationId,
    ownerId: null,
    title: "Server notice",
    message: "Read-only notification",
    type: "SYSTEM",
    createdAt: null,
    read: false,
  };
  const screen = renderScreen("notifications", {
    [notificationsKey]: result([notification]),
    [unreadCountKey]: result({ unreadCount: 1 }),
  });
  const markReadButton = findElements(screen.tree, "button")
    .find((button) => button.props.children === screen.messages.READ_SCREENS.MARK_READ);

  assert.ok(markReadButton);
  markReadButton.props.onClick();
  assert.deepEqual(screen.mutationCalls, [notificationId]);
  assert.deepEqual(screen.invalidations, []);

  const confirmed = await screen.mutationOptions[0].mutationFn(notificationId);
  await screen.mutationOptions[0].onSuccess(confirmed);
  assert.equal(confirmed.read, true);
  assert.deepEqual(screen.apiCalls.filter(([name]) => name === "markAsRead"), [["markAsRead", notificationId]]);
  assert.deepEqual(screen.invalidations, [{ queryKey: ["dolores", "notifications"] }]);
});

test("mark-as-read prevents duplicate submissions and keeps failed records unread", async () => {
  const notificationId = "00000000-0000-4000-8000-000000000101";
  const notification = {
    id: notificationId,
    ownerId: null,
    title: "Server notice",
    message: "Read-only notification",
    type: "SYSTEM",
    createdAt: null,
    read: false,
  };
  const pending = renderScreen("notifications", {
    [notificationsKey]: result([notification]),
    [unreadCountKey]: result({ unreadCount: 1 }),
  }, { isPending: true, variables: notificationId });
  const pendingButton = findElements(pending.tree, "button")[0];
  assert.equal(pendingButton.props.disabled, true);
  assert.equal(pendingButton.props.children, pending.messages.READ_SCREENS.MARKING_READ);

  const failure = new Error("write rejected");
  const rejected = renderScreen("notifications", {
    [notificationsKey]: result([notification]),
    [unreadCountKey]: result({ unreadCount: 1 }),
  }, { isError: true, error: failure }, {
    markAsRead: async () => { throw failure; },
  });
  assert.match(rejected.html, /role="alert"/);
  assert.match(rejected.html, /Không thể đánh dấu thông báo đã đọc/);
  assert.match(rejected.html, /Chưa đọc/);
  assert.equal(findElements(rejected.tree, "button").length, 1);
  await assert.rejects(rejected.mutationOptions[0].mutationFn(notificationId), /write rejected/);
  assert.deepEqual(rejected.invalidations, []);

  const alreadyRead = renderScreen("notifications", {
    [notificationsKey]: result([{ ...notification, read: true }]),
    [unreadCountKey]: result({ unreadCount: 0 }),
  });
  assert.equal(findElements(alreadyRead.tree, "button").length, 0);
});

test("read screens distinguish loading, empty, 401, 403, and failed requests from empty results", () => {
  const { html: loadingHtml } = renderScreen("", {
    [dashboardKey]: { ...defaultQuery, isPending: true },
  });
  const { html: emptyOverviewHtml } = renderScreen("", {
    [dashboardKey]: result({ scope: "OPERATOR" }),
  });
  const { html: emptyAlertsHtml } = renderScreen("notifications/alerts", {
    [alertsKey]: result([]),
  });
  const { html: emptyNotificationsHtml } = renderScreen("notifications", {
    [notificationsKey]: result([]),
    [unreadCountKey]: result({ unreadCount: 0 }),
  });
  const unauthorized = Object.assign(new Error("unauthorized"), {
    isAxiosError: true,
    response: { status: 401 },
  });
  const forbidden = Object.assign(new Error("forbidden"), {
    isAxiosError: true,
    response: { status: 403 },
  });
  const { html: unauthorizedHtml } = renderScreen("notifications", {
    [notificationsKey]: { ...defaultQuery, isError: true, error: unauthorized },
    [unreadCountKey]: result({ unreadCount: 0 }),
  });
  const { html: forbiddenHtml } = renderScreen("", {
    [dashboardKey]: { ...defaultQuery, isError: true, error: forbidden },
  });
  const networkError = Object.assign(new Error("offline"), { isAxiosError: true });
  const { html: networkErrorHtml } = renderScreen("notifications/alerts", {
    [alertsKey]: { ...defaultQuery, isError: true, error: networkError },
  });
  const { html: staleEmptyErrorHtml } = renderScreen("notifications/alerts", {
    [alertsKey]: { ...result([]), isError: true, error: networkError },
  });

  assert.match(loadingHtml, /Đang tải tổng quan vận hành/);
  assert.match(emptyOverviewHtml, /Dolores chưa trả về số liệu tổng quan/);
  assert.match(emptyNotificationsHtml, /Dolores hiện không trả về thông báo nào/);
  assert.match(emptyNotificationsHtml, />0</);
  assert.match(emptyAlertsHtml, /Dolores hiện không trả về cảnh báo nào/);
  assert.match(unauthorizedHtml, /đăng nhập lại/);
  assert.match(forbiddenHtml, /không có quyền đọc dữ liệu này/);
  assert.match(networkErrorHtml, /Dolores hiện không phản hồi/);
  assert.match(networkErrorHtml, /Thử lại/);
  assert.match(networkErrorHtml, /role="alert"/);
  assert.match(staleEmptyErrorHtml, /Dolores hiện không phản hồi/);
  assert.doesNotMatch(unauthorizedHtml, /không trả về thông báo nào/);
  assert.doesNotMatch(forbiddenHtml, /chưa trả về số liệu tổng quan/);
  assert.doesNotMatch(networkErrorHtml, /không trả về cảnh báo nào/);
  assert.doesNotMatch(staleEmptyErrorHtml, /không trả về cảnh báo nào/);
});

test("query functions pass cancellation signals and rendering does not send a write", async () => {
  const dashboard = renderScreen("", {
    [dashboardKey]: result({ operationalMetrics: {} }),
  });
  const notifications = renderScreen("notifications", {
    [notificationsKey]: result([]),
    [unreadCountKey]: result({ unreadCount: 0 }),
  });
  const alerts = renderScreen("notifications/alerts", {
    [alertsKey]: result([]),
  });
  const signal = new AbortController().signal;

  await Promise.all([
    ...dashboard.queryOptions,
    ...notifications.queryOptions,
    ...alerts.queryOptions,
  ].map((options) => options.queryFn({ signal })));

  assert.deepEqual(dashboard.apiCalls, [["dashboard", signal]]);
  assert.deepEqual(notifications.apiCalls, [["notifications", signal], ["unreadCount", signal]]);
  assert.deepEqual(notifications.mutationCalls, []);
  assert.deepEqual(alerts.apiCalls, [["alerts", signal]]);
  assert.equal([
    ...dashboard.queryOptions,
    ...notifications.queryOptions,
    ...alerts.queryOptions,
  ].some((options) => options.mutationFn), false);
});
