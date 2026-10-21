const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');

function loadTypescript(relativePath, mocks = {}) {
  const fileName = join(__dirname, '..', relativePath);
  const source = readFileSync(fileName, 'utf8');
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
  new Function('require', 'exports', 'module', outputText)(mockedRequire, module.exports, module);
  return module.exports;
}

const uuid = '00000000-0000-4000-8000-000000000101';

function renderModerator(sections, queryResults = {}) {
  const hookCalls = [];
  const results = {
    dashboard: { data: undefined, isPending: false, isError: false, error: null, refetch: async () => {} },
    alerts: { data: [], isPending: false, isError: false, error: null, refetch: async () => {} },
    notifications: { data: [], isPending: false, isError: false, error: null, refetch: async () => {} },
    unreadCount: { data: { unreadCount: 0 }, isPending: false, isError: false, error: null, refetch: async () => {} },
    ...queryResults,
  };

  const MockPage = ({ title, description, actions, children }) => React.createElement(
    'main',
    null,
    React.createElement('h1', null, title),
    description && React.createElement('p', null, description),
    actions,
    children
  );
  const MockPanel = ({ children }) => React.createElement('section', null, children);
  const MockTable = ({ headers, rows }) => React.createElement(
    'table',
    null,
    React.createElement('thead', null, React.createElement('tr', null, headers.map((header) => React.createElement('th', { key: header }, header)))),
    React.createElement('tbody', null, rows.map((row, rowIndex) => React.createElement(
      'tr',
      { key: rowIndex },
      row.map((cell, cellIndex) => React.createElement('td', { key: cellIndex }, cell))
    )))
  );
  const MockButton = ({ href, children }) => href
    ? React.createElement('a', { href }, children)
    : React.createElement('button', null, children);
  const ui = {
    DoloresButton: MockButton,
    DoloresField: () => null,
    DoloresFieldGrid: ({ children }) => React.createElement('div', null, children),
    DoloresMetric: ({ label, value }) => React.createElement('p', null, `${label}: ${value}`),
    DoloresNotice: ({ title, children }) => React.createElement('div', { role: 'status' }, React.createElement('strong', null, title), children),
    DoloresPanel: MockPanel,
    DoloresPanelTitle: ({ children }) => React.createElement('h2', null, children),
    DoloresTable: MockTable,
  };
  const root = '/moderator';
  const moderatorPaths = {
    root,
    invoices: `${root}/invoices`,
    technicalRequests: `${root}/technical-requests`,
    notifications: `${root}/notifications`,
    notificationAlerts: `${root}/notifications/alerts`,
    iotMachines: `${root}/iot/machines`,
    contractExpiry: `${root}/contracts/expiry`,
    technicalRequestDetail: () => `${root}/technical-requests/detail`,
    invoiceReconcile: `${root}/invoices/reconcile`,
    menuSent: `${root}/menu/sent`,
  };
  const { ModeratorSectionPage } = loadTypescript(
    'src/app/(moderator)/moderator/_components/ModeratorDashboardScreens.tsx',
    {
      'next/link': ({ href, children }) => React.createElement('a', { href }, children),
      '@/app/_features/dashboard/DashboardOverview': {
        DashboardOverview: ({ title, description, actions, metrics = [], children }) => React.createElement(
          'main',
          null,
          React.createElement('h1', null, title),
          description && React.createElement('p', null, description),
          actions,
          metrics.map(({ label, value }) => React.createElement('p', { key: label }, `${label}: ${value}`)),
          children
        ),
      },
      '@/app/_features/machines/MachinePresentation': {},
      '@/app/_shell/dolores/DoloresShell': { DoloresPage: MockPage },
      '@/app/_ui/dolores/DoloresUI': ui,
      '@/app/_features/demo-flow/demoFlowStore': {
        isRetrievalAssessment: () => false,
        readDemoFields: () => [],
        readDemoRecord: () => null,
        useDemoRecord: () => null,
        writeDemoRecord: () => false,
        writeDemoFlow: () => false,
      },
      '@/routes/path': {
        PATH_MODERATOR: moderatorPaths,
        PATH_TECHNICIAN: { taskRefurbishment: `${root}/technician/refurbishment` },
      },
      '@/hooks/dolores/useDashboardOverview': {
        useDashboardOverview: () => { hookCalls.push('dashboard'); return results.dashboard; },
      },
      '@/hooks/dolores/useAlerts': {
        useAlerts: () => { hookCalls.push('alerts'); return results.alerts; },
      },
      '@/hooks/dolores/useNotifications': {
        useNotifications: () => { hookCalls.push('notifications'); return results.notifications; },
        useUnreadNotificationCount: () => { hookCalls.push('unreadCount'); return results.unreadCount; },
      },
      '@/app/_shell/dolores/DoloresShell.module.css': {},
    }
  );
  const html = renderToStaticMarkup(React.createElement(ModeratorSectionPage, { sections }));
  return { html, hookCalls };
}

test('moderator dashboard renders operator metrics and daily cup usage from the API', () => {
  const { html, hookCalls } = renderModerator([], {
    dashboard: {
      data: {
        scope: 'OPERATOR',
        asOfDate: '2026-10-21',
        usagePeriodStart: '2026-10-15',
        usagePeriodEnd: '2026-10-21',
        operationalMetrics: {
          totalTenants: 17,
          expiringContractsWithin30Days: 2,
          cupsInSelectedPeriod: 91,
          dailyAcceptedCupUsage: [{ date: '2026-10-20', cups: 14 }],
          openMaintenanceTickets: 3,
          openInstallationWorkOrders: 4,
        },
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: async () => {},
    },
  });

  assert.ok(hookCalls.includes('dashboard'));
  assert.match(html, /Scope: OPERATOR/);
  assert.match(html, /Tenant[^<]*: 17/);
  assert.match(html, /14/);
  assert.match(html, /20\/10/);
  assert.doesNotMatch(html, /Chứng từ chờ đối chiếu|Smart IoT đang thuê|98/);
});

test('moderator alerts and notifications render API records and server unread count', () => {
  const alertMessage = 'TDD alert from Dolores';
  const notificationTitle = 'TDD notification from Dolores';
  const { html: alertHtml, hookCalls: alertHookCalls } = renderModerator(['notifications', 'alerts'], {
    alerts: {
      data: [{ id: uuid, level: 'HIGH', machineId: null, message: alertMessage, acknowledged: false, ts: '2026-10-20T13:05:00' }],
      isPending: false,
      isError: false,
      error: null,
      refetch: async () => {},
    },
  });
  const { html: notificationHtml, hookCalls: notificationHookCalls } = renderModerator(['notifications'], {
    notifications: {
      data: [{ id: uuid, tenantId: null, title: notificationTitle, message: 'API notification body', type: 'SYSTEM', read: false, createdAt: '2026-10-20T13:05:00Z' }],
      isPending: false,
      isError: false,
      error: null,
      refetch: async () => {},
    },
    unreadCount: { data: { unreadCount: 3 }, isPending: false, isError: false, error: null, refetch: async () => {} },
  });

  assert.ok(alertHookCalls.includes('alerts'));
  assert.match(alertHtml, new RegExp(alertMessage));
  assert.doesNotMatch(alertHtml, /Mất kết nối \/ lỗi menu|Hợp đồng sắp hết hạn/);
  assert.ok(notificationHookCalls.includes('notifications'));
  assert.ok(notificationHookCalls.includes('unreadCount'));
  assert.match(notificationHtml, new RegExp(notificationTitle));
  assert.match(notificationHtml, /API notification body/);
  assert.match(notificationHtml, /3/);
  assert.doesNotMatch(notificationHtml, /Kết quả Technician YC-017|Hóa đơn HD-09-204/);
});

test('moderator read errors remain visible and are not shown as empty results', () => {
  const { html } = renderModerator(['notifications', 'alerts'], {
    alerts: { data: undefined, isPending: false, isError: true, error: { status: 403 }, refetch: async () => {} },
  });

  assert.match(html, /403/);
  assert.match(html, /role="alert"/);
  assert.match(html, /Thử lại/);
  assert.doesNotMatch(html, /Chưa có cảnh báo|Không có dữ liệu/);
});

test('moderator notification errors distinguish missing authentication from forbidden scope', () => {
  const { html } = renderModerator(['notifications'], {
    unreadCount: { data: undefined, isPending: false, isError: true, error: { status: 401 }, refetch: async () => {} },
  });

  assert.match(html, /401/);
  assert.match(html, /token/i);
  assert.match(html, /role="alert"/);
  assert.doesNotMatch(html, /403/);
});

test('moderator read screens expose loading and empty states explicitly', () => {
  const { html: loadingHtml } = renderModerator([], {
    dashboard: { data: undefined, isPending: true, isError: false, error: null, refetch: async () => {} },
  });
  const { html: emptyAlertsHtml } = renderModerator(['notifications', 'alerts'], {
    alerts: { data: [], isPending: false, isError: false, error: null, refetch: async () => {} },
  });
  const { html: emptyNotificationsHtml } = renderModerator(['notifications'], {
    notifications: { data: [], isPending: false, isError: false, error: null, refetch: async () => {} },
    unreadCount: { data: { unreadCount: 0 }, isPending: false, isError: false, error: null, refetch: async () => {} },
  });

  assert.match(loadingHtml, /Đang tải tổng quan vận hành/);
  assert.match(loadingHtml, /aria-live="polite"/);
  assert.match(emptyAlertsHtml, /Không có cảnh báo đang hoạt động/);
  assert.match(emptyAlertsHtml, /aria-live="polite"/);
  assert.match(emptyNotificationsHtml, /Không có thông báo/);
  assert.match(emptyNotificationsHtml, /Thông báo chưa đọc/);
  assert.match(emptyNotificationsHtml, />0</);
});
