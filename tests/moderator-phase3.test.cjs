const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');
const { createDoloresAxiosMock } = require('./helpers/doloresAxiosMock.cjs');

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
const workOrderId = '00000000-0000-4000-8000-000000000211';
const checklistId = '00000000-0000-4000-8000-000000000311';
const locationId = '00000000-0000-4000-8000-000000000711';
const paths = {
  root: '/moderator',
  machines: '/moderator/machines',
  machinesList: '/moderator/machines/list',
  machineDetail: (id) => `/moderator/machines/${encodeURIComponent(id)}`,
  machineStock: '/moderator/machines/stock',
  machineCustomer: '/moderator/machines/customer',
  machineLoans: '/moderator/machines/loans',
  machineRepairHistory: '/moderator/machines/repair-history',
  machineSubstitute: '/moderator/machines/substitute',
  machineSubstituteReturn: '/moderator/machines/substitute/return',
  iot: '/moderator/iot',
  iotCustomer: '/moderator/iot/customer',
  iotMachines: '/moderator/iot/machines',
  technicalRequests: '/moderator/technical-requests',
  technicalRequestsList: '/moderator/technical-requests/list',
  technicalRequestDetail: (id) => `/moderator/technical-requests/${encodeURIComponent(id)}`,
  newTechnicalRequest: '/moderator/technical-requests/new',
  technicalRequestType: (kind) => `/moderator/technical-requests/new/${kind}`,
  machineHistory: '/moderator/machine-history',
  machineHistoryDetail: (id) => `/moderator/machine-history/${encodeURIComponent(id)}`,
  contracts: '/moderator/contracts',
  notifications: '/moderator/notifications',
};

function query(data, overrides = {}) {
  return { data, isPending: false, isError: false, isFetching: false, error: null, refetch: async () => {}, ...overrides };
}

const machine = {
  id: machineId,
  tenantId,
  serialNumber: 'API-SMART-111',
  status: 'DEPLOYED_CONTRACT_OWNER',
  deployedAt: '2026-10-20T10:00:00Z',
  region: 'Quận 3',
  ownerType: 'TENANT',
  contractStartDate: '2026-10-01',
  contractEndDate: '2027-10-01',
  monthlyRentalFee: 750000,
  machineType: 'SMART_IOT',
  locationId: null,
};
const tenant = { id: tenantId, name: 'Tenant kiểm thử', type: 'contract_owner' };
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

function renderOperational(componentName, path, resultOverrides = {}) {
  const calls = { details: [], locationIds: [], telemetry: [] };
  const results = {
    inventory: query([machine]),
    machineDetail: query({ ...machine, locationId, nextPreventiveMaintenanceAt: '2026-11-01T09:00:00Z', cupsServedSinceLastDescale: 20 }),
    locationDetail: query({ id: locationId, tenantId, name: 'API location', address: '12 Main Street', active: true, machineCount: 1 }),
    schedule: query({ nextPreventiveMaintenanceAt: '2026-11-01T09:00:00Z', cupsServedSinceLastDescale: 20 }),
    tickets: query([]),
    tenants: query([tenant]),
    locations: { locations: [], failedTenants: [], isLoading: false, retryFailed: () => {}, refetchAll: () => {} },
    workOrders: { workOrders: [{ tenant, workOrder }], failedTenants: [], isLoading: false, retryFailed: () => {}, refetchAll: () => {} },
    workOrderDetail: query({ workOrder, checklistItems: [{ id: checklistId, itemCode: 'POWER', label: 'Kiểm tra nguồn', required: true, displayOrder: 1, result: 'PASSED', notes: 'Đạt', completedBy: null, completedAt: null }], accessories: [], evidence: [{ id: '00000000-0000-4000-8000-000000000501', originalFilename: 'handover.pdf', contentType: 'application/pdf', sizeBytes: 512, sha256: 'sha-test', uploadedBy: null, uploadedAt: '2026-10-20T10:00:00Z' }] }),
    telemetry: query({ pages: [[]], pageParams: [0], hasNextPage: false, isFetchingNextPage: false, fetchNextPage: async () => {} }),
    ...resultOverrides,
  };

  const MockPage = ({ title, description, actions, children }) => React.createElement('main', null,
    React.createElement('h1', null, title), description && React.createElement('p', null, description), actions, children);
  const MockTable = ({ headers, rows, emptyMessage }) => React.createElement('table', null,
    React.createElement('thead', null, React.createElement('tr', null, headers.map((header) => React.createElement('th', { key: header }, header)))),
    React.createElement('tbody', null, rows.length ? rows.map((row, rowIndex) => React.createElement('tr', { key: rowIndex }, row.map((cell, cellIndex) => React.createElement('td', { key: cellIndex }, cell)))) : emptyMessage && React.createElement('tr', null, React.createElement('td', null, emptyMessage))));
  const ui = {
    DoloresButton: ({ href, children, onClick, disabled, type }) => href
      ? React.createElement('a', { href, 'aria-disabled': disabled }, children)
      : React.createElement('button', { onClick, disabled, type }, children),
    DoloresField: ({ label, value, children }) => React.createElement('div', null, `${label}: `, children ?? value),
    DoloresFieldGrid: ({ children }) => React.createElement('div', null, children),
    DoloresMetric: ({ label, value }) => React.createElement('p', null, `${label}: ${value}`),
    DoloresNotice: ({ title, children }) => React.createElement('aside', null, React.createElement('strong', null, title), children),
    DoloresPanel: ({ children }) => React.createElement('section', null, children),
    DoloresPanelTitle: ({ children }) => React.createElement('h2', null, children),
    DoloresTable: MockTable,
  };
  const machinePresentation = {
    MachineIdentityLabel: ({ machine: value }) => React.createElement('span', null, value.displayId),
    MachineStatusLabel: ({ status }) => React.createElement('span', null, status?.label),
    MachineTypeLabel: ({ machine: value }) => React.createElement('span', null, value.typeLabel),
  };
  const module = loadTypescript('src/app/(moderator)/moderator/_components/ModeratorOperationalScreens.tsx', {
    'next/link': ({ href, children }) => React.createElement('a', { href }, children),
    '@/app/_shell/dolores/DoloresShell': { DoloresPage: MockPage },
    '@/app/_ui/dolores/DoloresUI': ui,
    '@/app/_features/machines/MachinePresentation': machinePresentation,
    '@/routes/path': { PATH_MODERATOR: paths },
    '@/hooks/dolores/useMachines': {
      useMachineInventory: () => results.inventory,
      isMachineId: (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
      useMachineDetail: (id) => { calls.details.push(id); return results.machineDetail; },
      useMachineMaintenanceSchedule: () => results.schedule,
      useMachineMaintenanceTickets: () => results.tickets,
    },
    '@/hooks/dolores/useTenants': { useTenants: () => results.tenants },
    '@/hooks/dolores/usePlatformLocations': {
      usePlatformLocations: () => results.locations,
      useLocationById: (id) => { if (id) calls.locationIds.push(id); return results.locationDetail; },
    },
    '@/hooks/dolores/useInstallationWorkOrders': {
      usePlatformInstallationWorkOrders: () => results.workOrders,
      useInstallationWorkOrderById: (id) => { calls.details.push(id); return results.workOrderDetail; },
    },
    '@/hooks/dolores/useTelemetry': { useMachineTelemetryPoints: (id, range, enabled) => { calls.telemetry.push({ id, range, enabled }); return results.telemetry; } },
  });
  const Component = module[componentName];
  const html = renderToStaticMarkup(React.createElement(Component, { path }));
  return { html, calls };
}

test('installation work-order schema validates canonical IDs and detail metadata without download URLs', () => {
  const { InstallationWorkOrderDetailsSchema, InstallationWorkOrderSummarySchema } = loadTypescript('src/schemas/dolores/installationWorkOrders.ts');
  assert.equal(InstallationWorkOrderSummarySchema.parse(workOrder).id, workOrderId);
  assert.throws(() => InstallationWorkOrderSummarySchema.parse({ ...workOrder, id: 'YC-017' }));
  const details = {
    workOrder,
    checklistItems: [{ id: checklistId, itemCode: 'POWER', label: 'Kiểm tra nguồn', required: true, displayOrder: 1, result: 'PASSED', notes: null, completedBy: null, completedAt: null }],
    accessories: [],
    evidence: [{ id: '00000000-0000-4000-8000-000000000501', originalFilename: 'handover.pdf', contentType: 'application/pdf', sizeBytes: 512, sha256: 'sha-test', uploadedBy: null, uploadedAt: '2026-10-20T10:00:00Z' }],
  };
  assert.equal(InstallationWorkOrderDetailsSchema.parse(details).evidence[0].originalFilename, 'handover.pdf');
  assert.throws(() => InstallationWorkOrderDetailsSchema.parse({ ...details, evidence: [{ ...details.evidence[0], sizeBytes: -1 }] }));
});

test('machine and maintenance schemas accept backend LocalDateTime values without an offset', () => {
  const { MachineInventoryItemSchema, MachineDetailSchema, MaintenanceScheduleSchema } = loadTypescript('src/schemas/dolores/machines.ts');
  assert.equal(MachineInventoryItemSchema.parse({ ...machine, deployedAt: '2026-10-20T10:00:00' }).deployedAt, '2026-10-20T10:00:00');
  assert.equal(MachineDetailSchema.parse({ ...machine, nextPreventiveMaintenanceAt: '2026-11-01T09:00:00' }).nextPreventiveMaintenanceAt, '2026-11-01T09:00:00');
  assert.equal(MaintenanceScheduleSchema.parse({ nextPreventiveMaintenanceAt: '2026-11-01T09:00:00', cupsServedSinceLastDescale: 20 }).cupsServedSinceLastDescale, 20);
});

test('installation work-order API uses tenant-scoped list and UUID detail paths', async () => {
  const axiosMock = createDoloresAxiosMock([[], []]);
  const { calls } = axiosMock;
  const schema = { parse: (value) => value };
  const { installationWorkOrdersApi } = loadTypescript('src/apis/dolores/installationWorkOrders.api.ts', {
    './client': axiosMock.module,
    '@/schemas/dolores/installationWorkOrders': {
      InstallationWorkOrderListSchema: schema,
      InstallationWorkOrderDetailsSchema: schema,
      InstallationWorkOrderTenantIdSchema: { parse: (value) => { if (value !== tenantId) throw new Error('invalid tenant UUID'); return value; } },
      InstallationWorkOrderIdSchema: { parse: (value) => { if (value !== workOrderId) throw new Error('invalid UUID'); return value; } },
    },
  });
  await installationWorkOrdersApi.listByTenant(tenantId);
  await installationWorkOrdersApi.getById(workOrderId);
  assert.deepEqual(calls.map(({ config: { method, url, params } }) => ({ method, url, params })), [
    { method: 'GET', url: '/installation-work-orders', params: { tenantId } },
    { method: 'GET', url: `/installation-work-orders/${workOrderId}`, params: undefined },
  ]);
  await assert.rejects(installationWorkOrdersApi.getById('YC-017'), /invalid UUID/);
  assert.equal(calls.length, 2);
});

test('location detail API and hook use a canonical UUID route and reject fixture identifiers', async () => {
  const axiosMock = createDoloresAxiosMock([{ id: locationId, name: 'API location' }]);
  const { calls: requests } = axiosMock;
  const passthroughSchema = { parse: (value) => value };
  const { locationsApi } = loadTypescript('src/apis/dolores/locations.api.ts', {
    './client': axiosMock.module,
    '@/schemas/dolores/locations': {
      StoreLocationIdSchema: { parse: (id) => { if (id !== locationId) throw new Error('invalid UUID'); return id; } },
      StoreLocationListSchema: passthroughSchema,
      StoreLocationSchema: passthroughSchema,
      unwrapLocations: (response) => response,
    },
  });
  await locationsApi.getById(locationId);
  assert.equal(requests[0].config.url, `/locations/${locationId}`);
  await assert.rejects(locationsApi.getById('S-018'), /invalid UUID/);
  assert.equal(requests.length, 1);

  const queryOptions = [];
  const { useLocationById } = loadTypescript('src/hooks/dolores/usePlatformLocations.ts', {
    '@tanstack/react-query': {
      useQueries: () => [],
      useQuery: (options) => { queryOptions.push(options); return options; },
    },
    '@/apis/dolores/locations.api': { locationsApi: { getById: async (id) => ({ id }), listByTenant: async () => [] } },
    '@/schemas/dolores/locations': { StoreLocationIdSchema: { safeParse: (id) => ({ success: id === locationId }) } },
    '@/schemas/dolores/tenants': {},
    './queryPolicy': { retryDoloresRead: () => false },
    './tenantRequestLimiter': { withTenantRequestSlot: (_signal, request) => request() },
  });
  useLocationById('location-fixture');
  useLocationById(locationId);
  assert.equal(queryOptions[0].enabled, false);
  assert.equal(queryOptions[1].enabled, true);
  assert.deepEqual(queryOptions[1].queryKey, ['dolores', 'locations', 'id', locationId]);
});

test('installation work-order hooks gate requests on canonical IDs and keep tenant reads bounded', () => {
  const queries = [];
  const singleQueries = [];
  const { usePlatformInstallationWorkOrders, useInstallationWorkOrderById } = loadTypescript('src/hooks/dolores/useInstallationWorkOrders.ts', {
    '@tanstack/react-query': {
      useQueries: ({ queries: values }) => { queries.push(...values); return values.map(() => ({ data: undefined, isPending: true, isError: false, error: null, refetch: async () => {} })); },
      useQuery: (options) => { singleQueries.push(options); return options; },
    },
    '@/apis/dolores/installationWorkOrders.api': { installationWorkOrdersApi: { listByTenant: async () => [], getById: async () => ({}) } },
    '@/schemas/dolores/installationWorkOrders': {
      InstallationWorkOrderIdSchema: { safeParse: (id) => ({ success: id === workOrderId }) },
      InstallationWorkOrderTenantIdSchema: { safeParse: (id) => ({ success: id === tenantId }) },
    },
    '@/schemas/dolores/tenants': {},
    './queryPolicy': { retryDoloresRead: () => false },
    './tenantRequestLimiter': { withTenantRequestSlot: (_signal, request) => request() },
  });
  usePlatformInstallationWorkOrders([tenant, { ...tenant, id: 'tenant-fixture' }], true);
  assert.equal(queries.length, 2);
  assert.equal(queries[0].enabled, true);
  assert.equal(queries[1].enabled, false);
  useInstallationWorkOrderById('YC-017');
  useInstallationWorkOrderById(workOrderId);
  assert.equal(singleQueries[0].enabled, false);
  assert.equal(singleQueries[1].enabled, true);
  assert.deepEqual(singleQueries[1].queryKey, ['dolores', 'installation-work-orders', 'id', workOrderId]);
});

test('telemetry hook waits for an explicit UUID and range and does not poll automatically', async () => {
  const optionsList = [];
  const requests = [];
  const { useMachineTelemetryPoints } = loadTypescript('src/hooks/dolores/useTelemetry.ts', {
    '@tanstack/react-query': { useInfiniteQuery: (options) => { optionsList.push(options); return options; } },
    '@/apis/dolores/telemetry.api': {
      TELEMETRY_POINTS_PAGE_SIZE: 100,
      telemetryApi: { listMachinePoints: async (...args) => { requests.push(args); return []; } },
    },
    '@/hooks/dolores/queryPolicy': { retryDoloresRead: () => false },
    '@/schemas/dolores/machines': { MachineIdSchema: { safeParse: (id) => ({ success: id === machineId }) } },
  });
  useMachineTelemetryPoints('S-018', null, true);
  assert.equal(optionsList[0].enabled, false);
  assert.deepEqual(optionsList[0].queryKey, ['dolores', 'telemetry', 'points', 'S-018', null, null]);
  const range = { from: '2026-10-20T00:00:00Z', to: '2026-10-21T00:00:00Z' };
  useMachineTelemetryPoints(machineId, range, true);
  assert.equal(optionsList[1].enabled, true);
  assert.equal(optionsList[1].refetchInterval, undefined);
  await optionsList[1].queryFn({ signal: new AbortController().signal, pageParam: 100 });
  assert.equal(requests[0][0], machineId);
  assert.equal(requests[0][1], range.from);
  assert.equal(requests[0][2], range.to);
  assert.equal(requests[0][3], 100);
});

test('machine and technical Moderator screens render API records with UUID routes and explicit empty/error states', () => {
  const machines = renderOperational('ModeratorMachinesScreen', 'machines');
  assert.match(machines.html, /API-SMART-111/);
  assert.match(machines.html, new RegExp(`href="${paths.machineDetail(machineId)}"`));
  assert.doesNotMatch(machines.html, /S-018|C-204/);

  const empty = renderOperational('ModeratorMachinesScreen', 'machines', { inventory: query([]) });
  assert.match(empty.html, /không trả về máy nào/i);

  const failed = renderOperational('ModeratorMachinesScreen', 'machines', { inventory: query(undefined, { data: undefined, isError: true, error: { status: 503 } }) });
  assert.match(failed.html, /503/);
  assert.doesNotMatch(failed.html, /Không có máy/);

  const staleEmpty = renderOperational('ModeratorMachinesScreen', 'machines', { inventory: query([], { isError: true, error: { status: 503 } }) });
  assert.match(staleEmpty.html, /503/);
  assert.doesNotMatch(staleEmpty.html, /Dolores không trả về máy nào/i);

  const technical = renderOperational('ModeratorTechnicalScreen', 'technical-requests', {
    tickets: query([{ id: '00000000-0000-4000-8000-000000000601', machineId, tenantId, status: 'PENDING', source: 'MODERATOR', notes: 'API maintenance' }]),
  });
  assert.match(technical.html, /API maintenance/);
  assert.match(technical.html, new RegExp(`href="${paths.technicalRequestDetail(workOrderId)}"`));
  assert.doesNotMatch(technical.html, /YC-017|YC-018|Nguyễn Văn Nam/);

  const failedEmptyTickets = renderOperational('ModeratorTechnicalScreen', 'machine-history', {
    tickets: query([], { isError: true, error: { status: 503 } }),
  });
  assert.match(failedEmptyTickets.html, /503/);
  assert.doesNotMatch(failedEmptyTickets.html, /Dolores không trả về ticket bảo trì phù hợp/);
});

test('Moderator machine and work-order details reject fixture IDs and show API detail metadata', () => {
  const staleMachine = renderOperational('ModeratorMachinesScreen', 'machines/S-018');
  assert.match(staleMachine.html, /ID máy mẫu cũ/);
  assert.deepEqual(staleMachine.calls.details, ['S-018']);

  const staleWorkOrder = renderOperational('ModeratorTechnicalScreen', 'technical-requests/YC-017');
  assert.match(staleWorkOrder.html, /ID yêu cầu mẫu cũ/);

  const detail = renderOperational('ModeratorTechnicalScreen', `technical-requests/${workOrderId}`);
  assert.match(detail.html, /Kiểm tra nguồn/);
  assert.match(detail.html, /handover\.pdf/);
  assert.doesNotMatch(detail.html, /Tải xuống|presigned|object.storage/);
});

test('machine detail resolves locationId through the authorized location detail endpoint', () => {
  const detail = renderOperational('ModeratorMachinesScreen', `machines/${machineId}`);
  assert.match(detail.html, /API location/);
  assert.deepEqual(detail.calls.locationIds, [locationId]);
});

test('IoT telemetry query starts only after an explicit machine and bounded date range are selected', () => {
  const rendered = renderOperational('ModeratorIoTScreen', 'iot/machines');
  assert.match(rendered.html, /Chọn khoảng thời gian/);
  assert.match(rendered.html, /API-SMART-111/);
  assert.deepEqual(rendered.calls.telemetry, [{ id: machineId, range: null, enabled: false }]);
  assert.doesNotMatch(rendered.html, /Đã đồng bộ 09:42|Số liệu hiển thị là dữ liệu demo/);
});

test('Phase 3 UUID routes accept canonical machine, maintenance-history, and work-order IDs', () => {
  const pathModule = loadTypescript('src/routes/path.ts');
  const routeModule = loadTypescript('src/routes/routes.ts', { './path': pathModule });
  assert.equal(routeModule.isSupportedModeratorSection(`machines/${machineId}`), true);
  assert.equal(routeModule.isSupportedModeratorSection(`machine-history/${machineId}`), true);
  assert.equal(routeModule.isSupportedModeratorSection(`technical-requests/${workOrderId}`), true);
  assert.equal(routeModule.isSupportedModeratorSection('technical-requests/YC-017'), true);
});

test('Moderator Phase 3 API read routes receive the API data label', () => {
  const relativePath = 'src/app/_shell/dolores/DoloresShell.tsx';
  const source = readFileSync(join(__dirname, '..', relativePath), 'utf8');
  for (const route of ['PATH_MODERATOR.machines', 'PATH_MODERATOR.machineStock', 'PATH_MODERATOR.iot', 'PATH_MODERATOR.iotMachines', 'PATH_MODERATOR.technicalRequests', 'PATH_MODERATOR.machineHistory']) {
    assert.ok(source.includes(route), `Expected ${route} in API route labels`);
  }
});
