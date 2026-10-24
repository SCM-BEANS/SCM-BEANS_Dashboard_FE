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

const machineId = '00000000-0000-4000-8000-000000000111';
const tenantId = '00000000-0000-4000-8000-000000000101';
const otherTenantId = '00000000-0000-4000-8000-000000000102';
const workOrderId = '00000000-0000-4000-8000-000000000211';
const checklistId = '00000000-0000-4000-8000-000000000311';
const locationId = '00000000-0000-4000-8000-000000000711';
const tenant = { id: tenantId, name: 'Tenant kiểm thử', type: 'contract_owner' };
const machine = {
  id: machineId,
  tenantId,
  serialNumber: 'API-SMART-111',
  status: 'DEPLOYED_CONTRACT_OWNER',
  machineType: 'SMART_IOT',
  locationId,
};
const workOrder = {
  id: workOrderId,
  tenantId,
  contractId: '00000000-0000-4000-8000-000000000201',
  machineId,
  machineType: 'SMART_IOT',
  status: 'ASSIGNED',
  assignedTechnicianId: '00000000-0000-4000-8000-000000000401',
  scheduledFor: '2026-10-25T09:00:00Z',
  startedAt: null,
  completedAt: null,
  handoverRecipient: null,
  failureReason: null,
  createdAt: '2026-10-20T09:00:00Z',
  updatedAt: '2026-10-20T09:00:00Z',
};
const workOrderDetails = {
  workOrder,
  checklistItems: [{ id: checklistId, itemCode: 'POWER', label: 'Kiểm tra nguồn', required: true, displayOrder: 1, result: 'PASSED', notes: 'Đạt', completedBy: null, completedAt: null }],
  accessories: [],
  evidence: [{ id: '00000000-0000-4000-8000-000000000501', originalFilename: 'handover.pdf', contentType: 'application/pdf', sizeBytes: 512, sha256: 'sha-test', uploadedBy: null, uploadedAt: '2026-10-20T10:00:00Z' }],
};

function query(data, overrides = {}) {
  return { data, isPending: false, isError: false, isFetching: false, error: null, refetch: async () => {}, ...overrides };
}

function loadOperational(queryResults = {}, infiniteResult, apiOverrides = {}) {
  const queryOptions = [];
  const infiniteOptions = [];
  const styles = new Proxy({}, { get: (_target, key) => String(key) });
  const getKey = (options) => JSON.stringify(options.queryKey);
  const useQuery = (options) => {
    queryOptions.push(options);
    return queryResults[getKey(options)] ?? query(undefined, { isPending: options.enabled !== false });
  };
  const useInfiniteQuery = (options) => {
    infiniteOptions.push(options);
    return infiniteResult ?? query(undefined, { isPending: options.enabled !== false, hasNextPage: false, fetchNextPage: async () => {} });
  };
  const schemas = {
    '@/schema/locations.schema': loadTypescript('src/schema/locations.schema.ts'),
    '@/schema/machines.schema': loadTypescript('src/schema/machines.schema.ts'),
    '@/schema/installation-work-orders.schema': loadTypescript('src/schema/installation-work-orders.schema.ts'),
    '@/schema/tenants.schema': loadTypescript('src/schema/tenants.schema.ts'),
    '@/schema/telemetry.schema': loadTypescript('src/schema/telemetry.schema.ts', {
      '@/schema/machines.schema': loadTypescript('src/schema/machines.schema.ts'),
    }),
  };
  const module = loadTypescript('src/pages/moderator/moderator-operational-screens.tsx', {
    '@tanstack/react-query': { useQuery, useInfiniteQuery },
    axios: { isAxiosError: (error) => Boolean(error && typeof error === 'object' && 'response' in error) },
    'next/link': ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children),
    '@/apis/installation-work-orders.api': { installationWorkOrdersApi: { listByTenant: async () => [], getById: async () => workOrderDetails, ...apiOverrides.installationWorkOrdersApi } },
    '@/apis/locations.api': { locationsApi: { listByTenant: async () => [], getById: async () => ({ id: locationId, name: 'API location' }), ...apiOverrides.locationsApi } },
    '@/apis/machines.api': {
      machinesApi: {
        list: async () => [machine], getById: async () => machine,
        getInventorySummary: async () => ({ totalMachines: 1 }),
        getMaintenanceSchedule: async () => ({ nextPreventiveMaintenanceAt: null, cupsServedSinceLastDescale: 0 }),
        listMaintenanceTickets: async () => [],
      },
    },
    '@/apis/telemetry.api': { telemetryApi: { getLatestHeartbeat: async () => ({ machineId, status: 'ONLINE' }), listMachinePoints: async () => [] }, TELEMETRY_POINTS_PAGE_SIZE: 100 },
    '@/apis/tenants.api': { tenantsApi: { list: async () => [tenant] } },
    '@/routes/path': loadTypescript('src/routes/path.ts'),
    '@/text/moderator/moderator-messages': loadTypescript('src/text/moderator/moderator-messages.ts'),
    './moderator-shell': { moderatorStyles: styles },
    ...schemas,
  });
  return { module, queryOptions, infiniteOptions };
}

function renderOperational(name, path, queryResults = {}, infiniteResult, apiOverrides) {
  const loaded = loadOperational(queryResults, infiniteResult, apiOverrides);
  const Component = loaded.module[name];
  const html = renderToStaticMarkup(React.createElement(Component, { path }));
  return { html, ...loaded };
}

function mockAxios(responses) {
  const calls = [];
  return {
    calls,
    axiosClient: {
      get: async (url, config) => {
        calls.push({ url, config });
        return { data: responses.shift() };
      },
    },
  };
}

test('work-order schema validates canonical IDs, checklist/accessory data, and metadata-only evidence', () => {
  const schema = loadTypescript('src/schema/installation-work-orders.schema.ts');
  assert.equal(schema.InstallationWorkOrderSummarySchema.parse(workOrder).id, workOrderId);
  assert.equal(schema.InstallationWorkOrderDetailsSchema.parse(workOrderDetails).evidence[0].originalFilename, 'handover.pdf');
  assert.equal('url' in schema.InstallationWorkOrderDetailsSchema.parse({
    ...workOrderDetails,
    evidence: [{ ...workOrderDetails.evidence[0], url: 'private-url' }],
  }).evidence[0], false);
  assert.equal(schema.InstallationWorkOrderSummarySchema.safeParse({ ...workOrder, id: 'YC-017' }).success, false);
  assert.equal(schema.InstallationWorkOrderDetailsSchema.safeParse({
    ...workOrderDetails,
    evidence: [{ ...workOrderDetails.evidence[0], sizeBytes: -1 }],
  }).success, false);
});

test('installation work-order API uses shared Dolores client, tenant scope, UUID detail, and response identity guards', async () => {
  const axios = mockAxios([[workOrder], workOrderDetails]);
  const schema = loadTypescript('src/schema/installation-work-orders.schema.ts');
  const api = loadTypescript('src/apis/installation-work-orders.api.ts', {
    '@/lib/http': { axiosClient: axios.axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/installation-work-orders.schema': schema,
  }).installationWorkOrdersApi;
  const signal = new AbortController().signal;
  assert.deepEqual(await api.listByTenant(tenantId, signal), [workOrder]);
  assert.deepEqual(await api.getById(workOrderId, signal), workOrderDetails);
  assert.deepEqual(axios.calls.map(({ url, config }) => [url, config]), [
    ['/installation-work-orders', { baseURL: '/api/dolores/v1', params: { tenantId }, signal }],
    [`/installation-work-orders/${workOrderId}`, { baseURL: '/api/dolores/v1', signal }],
  ]);
  await assert.rejects(api.listByTenant('tenant-fixture'));
  await assert.rejects(api.getById('YC-017'));
  assert.equal(axios.calls.length, 2);

  const mismatch = mockAxios([[{ ...workOrder, tenantId: otherTenantId }]]);
  const mismatchApi = loadTypescript('src/apis/installation-work-orders.api.ts', {
    '@/lib/http': { axiosClient: mismatch.axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/installation-work-orders.schema': schema,
  }).installationWorkOrdersApi;
  await assert.rejects(mismatchApi.listByTenant(tenantId), /outside the requested tenant scope/);

  const wrongWorkOrder = { ...workOrderDetails, workOrder: { ...workOrder, id: '00000000-0000-4000-8000-000000000212' } };
  const identityMismatch = mockAxios([wrongWorkOrder]);
  const identityMismatchApi = loadTypescript('src/apis/installation-work-orders.api.ts', {
    '@/lib/http': { axiosClient: identityMismatch.axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/installation-work-orders.schema': schema,
  }).installationWorkOrdersApi;
  await assert.rejects(identityMismatchApi.getById(workOrderId), /different installation work order/);
});

test('machine list renders API UUIDs, and legacy detail IDs do not enable any request', () => {
  const results = {
    [JSON.stringify(['dolores', 'machines'])]: query([machine]),
    [JSON.stringify(['dolores', 'inventory-summary'])]: query({ totalMachines: 1 }),
  };
  const list = renderOperational('ModeratorMachinesScreen', 'machines', results);
  assert.match(list.html, /API-SMART-111/);
  assert.match(list.html, new RegExp(`href="/moderator/machines/${machineId}"`));
  assert.doesNotMatch(list.html, /S-018|C-204/);

  const legacy = renderOperational('ModeratorMachinesScreen', 'machines/S-018');
  assert.match(legacy.html, /không phải UUID từ API/);
  assert.equal(legacy.queryOptions.some((options) => options.enabled), false);
});

test('machine empty and forbidden responses stay distinct', () => {
  const empty = renderOperational('ModeratorMachinesScreen', 'machines', {
    [JSON.stringify(['dolores', 'machines'])]: query([]),
    [JSON.stringify(['dolores', 'inventory-summary'])]: query({ totalMachines: 0 }),
  });
  assert.match(empty.html, /không trả về máy nào/i);

  const forbidden = renderOperational('ModeratorMachinesScreen', 'machines', {
    [JSON.stringify(['dolores', 'machines'])]: query(undefined, { data: undefined, isError: true, error: { response: { status: 403 } } }),
    [JSON.stringify(['dolores', 'inventory-summary'])]: query({ totalMachines: 0 }),
  });
  assert.match(forbidden.html, /không có quyền đọc dữ liệu/i);
  assert.doesNotMatch(forbidden.html, /không trả về máy nào/i);
});

test('machine history filters the global maintenance collection by canonical machine UUID and shows the scope', () => {
  const otherMachineId = '00000000-0000-4000-8000-000000000112';
  const results = {
    [JSON.stringify(['dolores', 'maintenance-tickets'])]: query([
      { id: '00000000-0000-4000-8000-000000000601', machineId, tenantId, status: 'PENDING', notes: 'Ticket đúng máy' },
      { id: '00000000-0000-4000-8000-000000000602', machineId: otherMachineId, tenantId, status: 'RESOLVED', notes: 'Ticket máy khác' },
    ]),
  };
  const history = renderOperational('ModeratorTechnicalScreen', `machine-history/${machineId}`, results);
  assert.match(history.html, /Ticket đúng máy/);
  assert.doesNotMatch(history.html, /Ticket máy khác/);
  assert.match(history.html, /lọc theo UUID máy ở phía giao diện/);
});

test('machine detail loads its schedule, location, and only tickets with the matching machine UUID', () => {
  const otherMachineId = '00000000-0000-4000-8000-000000000112';
  const results = {
    [JSON.stringify(['dolores', 'machines', 'id', machineId])]: query({ ...machine, nextPreventiveMaintenanceAt: '2026-11-01T09:00:00Z' }),
    [JSON.stringify(['dolores', 'machines', 'maintenance-schedule', machineId])]: query({ nextPreventiveMaintenanceAt: '2026-11-01T09:00:00Z', cupsServedSinceLastDescale: 20 }),
    [JSON.stringify(['dolores', 'maintenance-tickets'])]: query([
      { id: '00000000-0000-4000-8000-000000000601', machineId, tenantId, status: 'PENDING', notes: 'Ticket của máy này' },
      { id: '00000000-0000-4000-8000-000000000602', machineId: otherMachineId, tenantId, status: 'RESOLVED', notes: 'Ticket máy khác' },
    ]),
    [JSON.stringify(['dolores', 'locations', 'id', locationId])]: query({ id: locationId, tenantId, name: 'API location' }),
  };
  const detail = renderOperational('ModeratorMachinesScreen', `machines/${machineId}`, results);
  assert.match(detail.html, /API-SMART-111/);
  assert.match(detail.html, /API location/);
  assert.match(detail.html, /Ticket của máy này/);
  assert.doesNotMatch(detail.html, /Ticket máy khác/);
  assert.ok(detail.queryOptions.every((options) => options.retry === false));

  const mismatchedLocation = renderOperational('ModeratorMachinesScreen', `machines/${machineId}`, {
    ...results,
    [JSON.stringify(['dolores', 'locations', 'id', locationId])]: query({ id: locationId, tenantId: otherTenantId, name: 'Cross-tenant location' }),
  });
  assert.doesNotMatch(mismatchedLocation.html, /Cross-tenant location/);
  assert.match(mismatchedLocation.html, /không khớp hồ sơ máy/);
});

test('tenant-scoped location fan-out is bounded and preserves partial failures without presenting an empty result', async () => {
  const tenants = Array.from({ length: 8 }, (_value, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 101).padStart(12, '0')}`,
    name: `Tenant ${index}`,
  }));
  let active = 0;
  let maximum = 0;
  const { queryOptions } = renderOperational('ModeratorIoTScreen', 'iot/customer', {
    [JSON.stringify(['dolores', 'tenants'])]: query(tenants),
  }, undefined, {
    locationsApi: {
      listByTenant: async (id) => {
        active += 1;
        maximum = Math.max(maximum, active);
        await new Promise((resolve) => setTimeout(resolve, 2));
        active -= 1;
        if (id === tenants[2].id) throw { response: { status: 403 } };
        return [{ id: locationId, tenantId: id, name: `Location ${id}` }];
      },
    },
  });
  const locationsQuery = queryOptions.find((options) => options.queryKey[2] === 'locations-by-tenant');
  const result = await locationsQuery.queryFn({ signal: new AbortController().signal });
  assert.equal(maximum, 5);
  assert.equal(result.records.length, 7);
  assert.deepEqual(result.failedTenants.map(({ tenant: failedTenant }) => failedTenant.id), [tenants[2].id]);

  const rendered = renderOperational('ModeratorIoTScreen', 'iot/customer', {
    [JSON.stringify(['dolores', 'tenants'])]: query(tenants),
    [JSON.stringify(['dolores', 'moderator', 'locations-by-tenant', tenants.map(({ id }) => id)])]: query(result),
  });
  assert.match(rendered.html, /một số tenant chưa tải được/i);
  assert.doesNotMatch(rendered.html, /không trả về địa điểm cho tenant nào/i);
  assert.match(rendered.html, /Chưa xác định/);
});

test('work-order fan-out is bounded, passes cancellation, and keeps successful tenant records on partial failure', async () => {
  const tenants = Array.from({ length: 8 }, (_value, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 201).padStart(12, '0')}`,
    name: `Tenant ${index}`,
  }));
  const tenantIds = tenants.map(({ id }) => id);
  let active = 0;
  let maximum = 0;
  const apiCalls = [];
  const { queryOptions } = renderOperational('ModeratorTechnicalScreen', 'technical-requests', {
    [JSON.stringify(['dolores', 'tenants'])]: query(tenants),
    [JSON.stringify(['dolores', 'maintenance-tickets'])]: query([]),
  }, undefined, {
    installationWorkOrdersApi: {
      listByTenant: async (id, signal) => {
        apiCalls.push({ id, signal });
        active += 1;
        maximum = Math.max(maximum, active);
        await new Promise((resolve) => setTimeout(resolve, 2));
        active -= 1;
        if (id === tenants[4].id) throw { response: { status: 503 } };
        return [{ ...workOrder, id: `00000000-0000-4000-8000-${String(Number(id.slice(-4)) + 300).padStart(12, '0')}`, tenantId: id }];
      },
    },
  });
  const workOrdersQuery = queryOptions.find((options) => options.queryKey[2] === 'installation-work-orders-by-tenant');
  const signal = new AbortController().signal;
  const result = await workOrdersQuery.queryFn({ signal });
  assert.equal(maximum, 5);
  assert.equal(result.records.length, 7);
  assert.equal(result.failedTenants[0].tenant.id, tenants[4].id);
  assert.ok(apiCalls.every((call) => call.signal === signal));

  const rendered = renderOperational('ModeratorTechnicalScreen', 'technical-requests', {
    [JSON.stringify(['dolores', 'tenants'])]: query(tenants),
    [JSON.stringify(['dolores', 'maintenance-tickets'])]: query([]),
    [JSON.stringify(['dolores', 'moderator', 'installation-work-orders-by-tenant', tenantIds])]: query(result),
  });
  assert.match(rendered.html, /một số tenant chưa tải được/i);
  assert.doesNotMatch(rendered.html, /không trả về ticket hoặc work order/i);

  const aborted = new AbortController();
  aborted.abort();
  let requestsAfterAbort = 0;
  const abortCase = renderOperational('ModeratorTechnicalScreen', 'technical-requests', {
    [JSON.stringify(['dolores', 'tenants'])]: query(tenants),
    [JSON.stringify(['dolores', 'maintenance-tickets'])]: query([]),
  }, undefined, {
    installationWorkOrdersApi: { listByTenant: async () => { requestsAfterAbort += 1; return []; } },
  });
  const abortQuery = abortCase.queryOptions.find((options) => options.queryKey[2] === 'installation-work-orders-by-tenant');
  await assert.rejects(abortQuery.queryFn({ signal: aborted.signal }), { name: 'AbortError' });
  assert.equal(requestsAfterAbort, 0);
});

test('IoT waits for a selected and API-confirmed Smart IoT machine plus explicit date range, without polling', () => {
  const results = { [JSON.stringify(['dolores', 'machines'])]: query([machine]) };
  const iot = renderOperational('ModeratorIoTScreen', 'iot/machines', results);
  assert.match(iot.html, /Chọn máy/);
  assert.doesNotMatch(iot.html, /Từ ngày/);
  assert.match(iot.html, /Chọn một machine UUID/);
  const telemetryOptions = iot.infiniteOptions[0];
  assert.equal(telemetryOptions.enabled, false);
  assert.equal(telemetryOptions.refetchInterval, undefined);
  assert.deepEqual(telemetryOptions.queryKey, ['dolores', 'telemetry', 'points', '', null]);
  assert.equal(telemetryOptions.getNextPageParam(new Array(100), [], 99_900), 100_000);
  assert.equal(telemetryOptions.getNextPageParam(new Array(100), [], 100_000), undefined);
  assert.equal(telemetryOptions.getNextPageParam(new Array(99), [], 0), undefined);
  assert.equal(iot.queryOptions.find((options) => options.queryKey[1] === 'telemetry' && options.queryKey[2] === 'heartbeat').enabled, false);
});

test('work-order detail renders read-only checklist and evidence metadata without download links', () => {
  const results = { [JSON.stringify(['dolores', 'installation-work-orders', 'id', workOrderId])]: query(workOrderDetails) };
  const detail = renderOperational('ModeratorTechnicalScreen', `technical-requests/${workOrderId}`, results);
  assert.match(detail.html, /Kiểm tra nguồn/);
  assert.match(detail.html, /handover\.pdf/);
  assert.match(detail.html, /512 bytes/);
  assert.doesNotMatch(detail.html, /private-url|presigned|object\.storage|Tải xuống/);

  const legacy = renderOperational('ModeratorTechnicalScreen', 'technical-requests/YC-017');
  assert.match(legacy.html, /dữ liệu mẫu cũ/);
  assert.equal(legacy.queryOptions.find((options) => options.queryKey[1] === 'installation-work-orders').enabled, false);
});

test('technical create action stays disabled with an explanation and sends no write request', () => {
  const screen = renderOperational('ModeratorTechnicalScreen', 'technical-requests/new');
  assert.match(screen.html, /Tạo yêu cầu/);
  assert.match(screen.html, /đang bị khóa/);
  assert.match(screen.html, /<button[^>]*disabled/);
  assert.equal(screen.queryOptions.some((options) => options.enabled), false);
});

test('catch-all route sends machine, IoT, technical, and machine-history paths to the read-screen boundary', async () => {
  const messages = loadTypescript('src/text/moderator/moderator-messages.ts').MODERATOR_MESSAGES;
  const styles = new Proxy({}, { get: (_target, key) => String(key) });
  const route = loadTypescript('src/pages/moderator/[[...sections]].page.tsx', {
    '@/routes/routes': { isSupportedModeratorSection: () => true, MODERATOR_NAVIGATION_LINKS: [] },
    '@/routes/path': { PATH_MODERATOR: { ROOT: '/moderator' } },
    '@/text/moderator/moderator-messages': { MODERATOR_MESSAGES: messages },
    './moderator-shell': { ModeratorShell: ({ children }) => React.createElement('main', null, children), moderatorStyles: styles },
    './moderator-read-screens': { ModeratorReadScreen: () => React.createElement('p', null, 'read') },
  });
  for (const section of ['machines', `machines/${machineId}`, 'iot/customer', 'technical-requests', `technical-requests/${workOrderId}`, 'machine-history', `machine-history/${machineId}`]) {
    assert.equal(route.isModeratorReadRoute(section), true, section);
    assert.deepEqual(await route.getServerSideProps({ params: { sections: section.split('/') } }), { props: { sectionPath: section } });
  }
  assert.equal(route.isModeratorReadRoute('menu'), true);
});

test('shared read-screen dispatcher classifies Phase 3 paths for lazy operational screens', () => {
  const styles = new Proxy({}, { get: (_target, key) => String(key) });
  const path = loadTypescript('src/routes/path.ts');
  const messages = loadTypescript('src/text/moderator/moderator-messages.ts');
  const module = loadTypescript('src/pages/moderator/moderator-read-screens.tsx', {
    '@tanstack/react-query': { useQuery: () => query(undefined) },
    axios: { isAxiosError: () => false },
    'next/link': ({ href, children }) => React.createElement('a', { href }, children),
    '@/apis/dashboard.api': { dashboardApi: {} },
    '@/apis/contracts.api': { contractsApi: {} },
    '@/apis/notifications.api': { notificationsApi: {} },
    '@/apis/tenants.api': { tenantsApi: {} },
    '@/routes/path': path,
    '@/schema/contracts.schema': loadTypescript('src/schema/contracts.schema.ts'),
    '@/schema/tenants.schema': loadTypescript('src/schema/tenants.schema.ts'),
    './moderator-shell': { moderatorStyles: styles },
    '@/text/moderator/moderator-messages': messages,
  });
  for (const [sectionPath, expected] of [
    ['machines', 'machines'],
    ['iot/customer', 'iot'],
    ['technical-requests', 'technical'],
    [`machine-history/${machineId}`, 'technical'],
  ]) {
    assert.equal(module.getOperationalScreenKind(sectionPath), expected, sectionPath);
  }
  assert.equal(module.getOperationalScreenKind('contracts'), null);
});
