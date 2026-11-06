const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const uuid = (suffix) => `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`;
const ids = {
  tenant: uuid('1'), invoice: uuid('2'), proof: uuid('3'), buyback: uuid('4'),
  contract: uuid('5'), machine: uuid('6'), document: uuid('7'), workOrder: uuid('8'),
  location: uuid('9'), notification: uuid('10'), recipe: uuid('11'), profile: uuid('12'),
  request: uuid('13'), ticket: uuid('14'), assignment: uuid('15'), custodyEvent: uuid('16'), repairCase: uuid('17'),
};
const passthrough = { parse: (value) => value, safeParse: (value) => ({ success: true, data: value }) };
const schemas = new Proxy({ shape: { id: passthrough, ownerId: passthrough } }, {
  get(target, name) {
    if (name === 'unwrapLocations') return (value) => value;
    if (name === 'shape') return target.shape;
    if (name === 'MaintenanceRequestSchema') return { shape: { id: passthrough } };
    if (name === 'BILLING_DEFAULT_PAGE_SIZE') return 50;
    if (name === 'InvoiceListParamsSchema') return { ...passthrough, parse: (value = {}) => ({ page: 0, size: 50, ...value }) };
    if (name === 'InvoiceLineItemListParamsSchema' || name === 'PaymentProofListParamsSchema') return { ...passthrough, parse: (value = {}) => ({ page: 0, size: 50, ...value }) };
    if (name === 'LocationListParamsSchema') return { ...passthrough, shape: { ownerId: passthrough } };
    return passthrough;
  },
});
const buybackSchemas = new Proxy({}, {
  get(_target, name) {
    if (name === "BuybackStatusSchema") return require("zod").z.enum([
      "REQUESTED", "INSPECTION_PENDING", "VALUATION_PENDING", "APPROVED", "PAYMENT_PENDING",
      "PAID", "COLLECTION_PENDING", "COLLECTED", "REFURBISHING", "QA_PENDING",
      "AVAILABLE_FOR_RENT", "REJECTED", "CANCELLED",
    ]);
    return passthrough;
  },
});

function loadApi(relativePath, axiosClient) {
  const fileName = join(__dirname, '..', relativePath);
  const source = readFileSync(fileName, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const mocks = {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
  };
  const mockedRequire = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id === "@/schema/buybacks.schema") return buybackSchemas;
    if (id.startsWith('@/schema/')) return schemas;
    return require(id);
  };
  const loaded = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(mockedRequire, loaded.exports, loaded);
  return loaded.exports;
}

test('current domain APIs preserve HTTP methods, URLs, scope parameters, signals, and file responses', async () => {
  const signal = new AbortController().signal;
  const blob = new Blob(['document']);
  const profile = { id: ids.profile, idaasUserId: ids.profile };
  const location = { id: ids.location, ownerId: ids.profile };
  const contract = { id: ids.contract, tenantId: ids.tenant };
  const machine = { id: ids.machine };
  const notification = { id: ids.notification, read: true };
  const recipe = { id: ids.recipe };
  const invoice = { id: ids.invoice };
  const workOrder = { id: ids.workOrder, tenantId: ids.tenant };
  const workOrderDetails = { workOrder: { id: ids.workOrder } };
  const calls = [];
  let responseData;
  const axiosClient = {
    get: async (url, config = {}) => {
      calls.push({ method: 'GET', url, config });
      return { data: responseData };
    },
    post: async (url, data, config = {}) => {
      calls.push({ method: 'POST', url, data, config });
      return { data: responseData };
    },
  };
  const apis = {
    profiles: loadApi('src/apis/profiles.api.ts', axiosClient).profilesApi,
    locations: loadApi('src/apis/locations.api.ts', axiosClient).locationsApi,
    contracts: loadApi('src/apis/contracts.api.ts', axiosClient).contractsApi,
    machines: loadApi('src/apis/machines.api.ts', axiosClient).machinesApi,
    telemetry: loadApi('src/apis/telemetry.api.ts', axiosClient).telemetryApi,
    notifications: loadApi('src/apis/notifications.api.ts', axiosClient).notificationsApi,
    recipes: loadApi('src/apis/recipes.api.ts', axiosClient).recipesApi,
    billing: loadApi('src/apis/billing.api.ts', axiosClient).billingApi,
    buybacks: loadApi('src/apis/buybacks.api.ts', axiosClient).buybacksApi,
    workOrders: loadApi('src/apis/installation-work-orders.api.ts', axiosClient).installationWorkOrdersApi,
    dashboard: loadApi('src/apis/dashboard.api.ts', axiosClient).dashboardApi,
  };
  const recipeInput = { name: 'Test recipe', steps: ['BREW:25s'], dosageBounds: ['water:30:50'] };

  const operations = [
    ['profiles', 'list', [{ role: 'OWNER', page: 1, size: 20 }, signal], { items: [profile] }, 'GET', '/profiles', { baseURL: '/api/dolores/v1', params: { role: 'OWNER', page: 1, size: 20 }, signal }],
    ['profiles', 'getById', [ids.profile, signal], profile, 'GET', `/profiles/${ids.profile}`, { baseURL: '/api/dolores/v1', signal }],
    ['profiles', 'getHistory', [ids.profile, 2, 10, signal], { items: [] }, 'GET', `/profiles/${ids.profile}/history`, { baseURL: '/api/dolores/v1', params: { page: 2, size: 10 }, signal }],
    ['profiles', 'getContracts', [ids.profile, 3, 15, signal], { items: [] }, 'GET', `/profiles/${ids.profile}/contracts`, { baseURL: '/api/dolores/v1', params: { page: 3, size: 15 }, signal }],
    ['locations', 'list', [{ ownerId: ids.profile }, signal], [location], 'GET', '/locations', { baseURL: '/api/dolores/v1', params: { ownerId: ids.profile }, signal }],
    ['locations', 'listByTenant', [ids.tenant, signal], [{ id: ids.location, tenantId: ids.tenant }], 'GET', '/locations', { baseURL: '/api/dolores/v1', params: { tenantId: ids.tenant, activeOnly: false }, signal }],
    ['locations', 'getById', [ids.location, signal], location, 'GET', `/locations/${ids.location}`, { baseURL: '/api/dolores/v1', signal }],
    ['locations', 'create', [ids.profile, { name: 'Test store', city: 'Test City' }], location, 'POST', '/locations', { baseURL: '/api/dolores/v1', params: { ownerId: ids.profile } }, { name: 'Test store', city: 'Test City' }],
    ['contracts', 'list', [signal], [], 'GET', '/contracts', { baseURL: '/api/dolores/v1', signal }],
    ['contracts', 'getById', [ids.contract, signal], contract, 'GET', `/contracts/${ids.contract}`, { baseURL: '/api/dolores/v1', signal }],
    ['contracts', 'getModeratorById', [ids.contract, signal], contract, 'GET', `/contracts/${ids.contract}`, { baseURL: '/api/dolores/v1', signal }],
    ['contracts', 'getExpiry', [ids.contract, signal], {}, 'GET', `/contracts/${ids.contract}/expiry-status`, { baseURL: '/api/dolores/v1', signal }],
    ['contracts', 'getDocuments', [ids.contract, signal], [], 'GET', `/contracts/${ids.contract}/documents`, { baseURL: '/api/dolores/v1', signal }],
    ['contracts', 'getMachineHistory', [ids.machine, signal], [contract], 'GET', `/contracts/machine/${ids.machine}/history`, { baseURL: '/api/dolores/v1', signal }],
    ['contracts', 'downloadDocument', [ids.contract, ids.document, signal], blob, 'GET', `/contracts/${ids.contract}/documents/${ids.document}`, { baseURL: '/api/dolores/v1', responseType: 'blob', signal }],
    ['machines', 'list', [signal], [machine], 'GET', '/machines', { baseURL: '/api/dolores/v1', signal }],
    ['machines', 'getById', [ids.machine, signal], machine, 'GET', `/machines/${ids.machine}`, { baseURL: '/api/dolores/v1', signal }],
    ['machines', 'getInventorySummary', [signal], {}, 'GET', '/inventory/summary', { baseURL: '/api/dolores/v1', signal }],
    ['machines', 'getMaintenanceSchedule', [ids.machine, signal], {}, 'GET', `/machines/${ids.machine}/maintenance-schedule`, { baseURL: '/api/dolores/v1', signal }],
    ['machines', 'listMaintenanceTickets', [signal], [], 'GET', '/maintenance-tickets', { baseURL: '/api/dolores/v1', signal }],
    ['telemetry', 'getLatestHeartbeat', [ids.machine, signal], { machineId: ids.machine }, 'GET', `/telemetry-query/machines/${ids.machine}/heartbeats/latest`, { baseURL: '/api/dolores/v1', signal }],
    ['telemetry', 'listMachinePoints', [ids.machine, { from: '2026-10-01T00:00:00Z', to: '2026-10-02T00:00:00Z' }, 25, signal], [{ machineId: ids.machine }], 'GET', `/telemetry-query/machines/${ids.machine}/points`, { baseURL: '/api/dolores/v1', params: { from: '2026-10-01T00:00:00Z', to: '2026-10-02T00:00:00Z', limit: 100, offset: 25 }, signal }],
    ['notifications', 'list', [signal], [], 'GET', '/notifications', { baseURL: '/api/dolores/v1', signal }],
    ['notifications', 'unreadCount', [signal], { unreadCount: 0 }, 'GET', '/notifications/unread-count', { baseURL: '/api/dolores/v1', signal }],
    ['notifications', 'listAlerts', [signal], [], 'GET', '/alerts', { baseURL: '/api/dolores/v1', signal }],
    ['notifications', 'markAsRead', [ids.notification], notification, 'POST', `/notifications/${ids.notification}/read`, { baseURL: '/api/dolores/v1' }, undefined],
    ['recipes', 'listGlobal', [signal], [recipe], 'GET', '/recipes/global', { baseURL: '/api/dolores/v1', signal }],
    ['recipes', 'getGlobalById', [ids.recipe, signal], recipe, 'GET', `/recipes/global/${ids.recipe}`, { baseURL: '/api/dolores/v1', signal }],
    ['recipes', 'publishGlobal', [recipeInput], recipe, 'POST', '/recipes/global', { baseURL: '/api/dolores/v1' }, recipeInput],
    ['billing', 'listInvoices', [signal], [], 'GET', '/billing/invoices', { baseURL: '/api/dolores/v1', params: { page: 0, size: 50 }, signal }],
    ['billing', 'listModeratorInvoices', [signal], [invoice], 'GET', '/billing/invoices', { baseURL: '/api/dolores/v1', params: { page: 0, size: 50 }, signal }],
    ['billing', 'getModeratorInvoice', [ids.invoice, signal], invoice, 'GET', `/billing/invoices/${ids.invoice}`, { baseURL: '/api/dolores/v1', signal }],
    ['billing', 'listPaymentProofs', [ids.invoice, signal], [], 'GET', `/billing/invoices/${ids.invoice}/payment-proofs`, { baseURL: '/api/dolores/v1', params: { page: 0, size: 50 }, signal }],
    ['billing', 'downloadPaymentProofContent', [ids.proof, signal], blob, 'GET', `/billing/payment-proofs/${ids.proof}/content`, { baseURL: '/api/dolores/v1', headers: { Accept: '*/*' }, responseType: 'blob', signal }],
    ['buybacks', 'getById', [ids.buyback, signal], { id: ids.buyback }, 'GET', `/buybacks/${ids.buyback}`, { baseURL: '/api/dolores/v1', signal }],
    ['workOrders', 'listByOwner', [ids.profile, signal], [{ id: ids.workOrder, ownerId: ids.profile }], 'GET', '/installation-work-orders', { baseURL: '/api/dolores/v1', params: { ownerId: ids.profile }, signal }],
    ['workOrders', 'getById', [ids.workOrder, signal], workOrderDetails, 'GET', `/installation-work-orders/${ids.workOrder}`, { baseURL: '/api/dolores/v1', signal }],
    ['dashboard', 'getOverview', [signal, '2026-10-01', '2026-10-07'], {}, 'GET', '/dashboard/overview', { baseURL: '/api/dolores/v1', signal, params: { fromDate: '2026-10-01', toDate: '2026-10-07' } }],
  ];

  for (const [apiName, methodName, args, expectedResponse, method, url, config, data] of operations) {
    responseData = expectedResponse;
    assert.equal(typeof apis[apiName]?.[methodName], 'function', `${apiName}.${methodName} must be available`);
    const result = await apis[apiName][methodName](...args);
    assert.deepEqual(result, expectedResponse, `${apiName}.${methodName} returns parsed response data`);
    const actual = calls.at(-1);
    assert.equal(actual.method, method, `${apiName}.${methodName} uses the expected HTTP method`);
    assert.equal(actual.url, url, `${apiName}.${methodName} uses the expected relative route`);
    assert.deepEqual(actual.config, config, `${apiName}.${methodName} preserves query, signal, and response config`);
    if (method === 'POST') assert.deepEqual(actual.data, data, `${apiName}.${methodName} preserves its body`);
  }

  assert.equal(calls.length, operations.length);
  assert.ok(calls.every((call) => !/^https?:\/\//i.test(call.url)), 'Dolores requests must use relative paths');
});

test('module 1 maintenance mutations preserve methods, routes, response identities, and request bodies', async () => {
  const calls = [];
  const responses = [
    { id: ids.ticket, machineId: ids.machine, status: 'PENDING' },
    { id: ids.ticket, status: 'PENDING', version: 5 },
    { id: ids.ticket, status: 'PENDING', overdueReviewedAt: '2026-11-02T09:00:00' },
    { id: ids.ticket, status: 'PENDING' },
    { id: ids.request, status: 'OVERDUE_REVIEW', overdueReviewedAt: '2026-11-02T09:00:00' },
    { id: ids.request, replacementAssignmentId: ids.assignment },
    { id: ids.custodyEvent, maintenanceRequestId: ids.request, repairCaseId: ids.repairCase, eventType: 'PRIMARY_COLLECTED', machineId: ids.machine },
    { id: ids.request, status: 'CLOSED' },
  ];
  const axiosClient = {
    post: async (url, data, config) => {
      calls.push({ method: 'POST', url, data, config });
      return { data: responses.shift() };
    },
    patch: async (url, data, config) => {
      calls.push({ method: 'PATCH', url, data, config });
      return { data: responses.shift() };
    },
    put: async (url, data, config) => {
      calls.push({ method: 'PUT', url, data, config });
      return { data: responses.shift() };
    },
  };
  const machinesApi = loadApi('src/apis/machines.api.ts', axiosClient).machinesApi;
  const requestsApi = loadApi('src/apis/maintenance-requests.api.ts', axiosClient).maintenanceRequestsApi;

  await machinesApi.createMaintenanceTicket(ids.machine, { alertLevel: 'Warning' });
  await machinesApi.updateMaintenanceTicketDetails(ids.ticket, {
    expectedVersion: 4,
    scheduledDueAt: null,
    alertLevel: 'Critical',
  });
  await machinesApi.recordMaintenanceTicketOverdueReview(ids.ticket, { reason: 'Đã lên lịch lại' });
  await machinesApi.unassignMaintenanceTicket(ids.ticket);
  await requestsApi.recordOverdueReview(ids.request, { reason: 'Đã liên hệ chủ máy' });
  await requestsApi.linkReplacementAssignment(ids.request, ids.assignment);
  await requestsApi.recordCustodyEvent(ids.request, {
    eventType: 'PRIMARY_COLLECTED',
    machineId: ids.machine,
    conditionNotes: 'Vỏ máy còn nguyên',
    evidenceReference: 'private/custody/primary-1',
    acknowledgementUnavailableReason: 'Owner chưa thể phản hồi tại thời điểm bàn giao',
  });
  await requestsApi.recordClosureException(ids.request, { reason: 'Đã xác nhận trả máy qua biên bản' });

  assert.deepEqual(calls, [
    { method: 'POST', url: `/machines/${ids.machine}/maintenance-tickets`, data: { alertLevel: 'Warning' }, config: { baseURL: '/api/dolores/v1' } },
    { method: 'PATCH', url: `/maintenance-tickets/${ids.ticket}/details`, data: { expectedVersion: 4, scheduledDueAt: null, alertLevel: 'Critical' }, config: { baseURL: '/api/dolores/v1' } },
    { method: 'POST', url: `/maintenance-tickets/${ids.ticket}/overdue-review`, data: { reason: 'Đã lên lịch lại' }, config: { baseURL: '/api/dolores/v1' } },
    { method: 'POST', url: `/maintenance-tickets/${ids.ticket}/unassign`, data: undefined, config: { baseURL: '/api/dolores/v1' } },
    { method: 'POST', url: `/maintenance-requests/${ids.request}/overdue-review`, data: { reason: 'Đã liên hệ chủ máy' }, config: { baseURL: '/api/dolores/v1' } },
    { method: 'PUT', url: `/maintenance-requests/${ids.request}/replacement-assignment/${ids.assignment}`, data: undefined, config: { baseURL: '/api/dolores/v1' } },
    { method: 'POST', url: `/maintenance-requests/${ids.request}/custody-events`, data: {
      eventType: 'PRIMARY_COLLECTED',
      machineId: ids.machine,
      conditionNotes: 'Vỏ máy còn nguyên',
      evidenceReference: 'private/custody/primary-1',
      acknowledgementUnavailableReason: 'Owner chưa thể phản hồi tại thời điểm bàn giao',
    }, config: { baseURL: '/api/dolores/v1' } },
    { method: 'POST', url: `/maintenance-requests/${ids.request}/closure-exception`, data: { reason: 'Đã xác nhận trả máy qua biên bản' }, config: { baseURL: '/api/dolores/v1' } },
  ]);
});

test('repair workflow reads use bounded pagination, request filters, and validated detail identities', async () => {
  const signal = new AbortController().signal;
  const ids = {
    machine: '00000000-0000-4000-8000-000000000006',
    request: '00000000-0000-4000-8000-000000000007',
    otherRequest: '00000000-0000-4000-8000-000000000008',
    repairCase: '00000000-0000-4000-8000-000000000009',
    ticket: '00000000-0000-4000-8000-000000000010',
    assignment: '00000000-0000-4000-8000-000000000011',
  };
  const calls = [];
  const responses = [
    {
      data: [{ id: ids.repairCase, maintenanceRequestId: ids.otherRequest, status: 'TRIAGE' }],
      headers: { 'x-page': '0', 'x-page-size': '100', 'x-has-next': 'true' },
    },
    {
      data: [{ id: ids.repairCase, maintenanceRequestId: ids.request, status: 'REPLACEMENT_PLANNED' }],
      headers: { 'x-page': '1', 'x-page-size': '100', 'x-has-next': 'false' },
    },
    { data: [{ id: ids.request, requestType: 'REPAIR' }], headers: { 'x-page': '2', 'x-page-size': '20', 'x-has-next': 'false' } },
    { data: { id: ids.request }, headers: {} },
    { data: { id: ids.ticket }, headers: {} },
    { data: { id: ids.assignment }, headers: {} },
  ];
  const axiosClient = {
    get: async (url, config = {}) => {
      calls.push({ url, config });
      return responses.shift();
    },
  };
  const repairCasesApi = loadApi('src/apis/repair-cases.api.ts', axiosClient).repairCasesApi;
  const maintenanceRequestsApi = loadApi('src/apis/maintenance-requests.api.ts', axiosClient).maintenanceRequestsApi;
  const machinesApi = loadApi('src/apis/machines.api.ts', axiosClient).machinesApi;
  const replacementAssignmentsApi = loadApi('src/apis/replacement-assignments.api.ts', axiosClient).replacementAssignmentsApi;

  const repairCase = await repairCasesApi.findReferenceByMaintenanceRequestId(ids.request, ids.machine, signal);
  assert.deepEqual(repairCase, {
    id: ids.repairCase,
    maintenanceRequestId: ids.request,
    status: 'REPLACEMENT_PLANNED',
  });
  assert.deepEqual(calls.slice(0, 2).map(({ url, config }) => ({ url, config })), [
    { url: '/repair-cases', config: { baseURL: '/api/dolores/v1', params: { machineId: ids.machine, page: 0, size: 100 }, signal } },
    { url: '/repair-cases', config: { baseURL: '/api/dolores/v1', params: { machineId: ids.machine, page: 1, size: 100 }, signal } },
  ]);

  const requestPage = await maintenanceRequestsApi.listPage({ page: 2, size: 20, requestType: 'REPAIR' }, signal);
  assert.deepEqual(requestPage, { items: [{ id: ids.request, requestType: 'REPAIR' }], page: 2, size: 20, hasNext: false });
  assert.deepEqual(calls.at(-1), {
    url: '/maintenance-requests',
    config: { baseURL: '/api/dolores/v1', params: { page: 2, size: 20, requestType: 'REPAIR' }, signal },
  });

  assert.equal((await maintenanceRequestsApi.getById(ids.request, signal)).id, ids.request);
  assert.equal((await machinesApi.getMaintenanceTicketById(ids.ticket, signal)).id, ids.ticket);
  assert.equal((await replacementAssignmentsApi.getById(ids.assignment, signal)).id, ids.assignment);
  assert.deepEqual(calls.slice(-3).map(({ url, config }) => ({ url, config })), [
    { url: `/maintenance-requests/${ids.request}`, config: { baseURL: '/api/dolores/v1', signal } },
    { url: `/maintenance-tickets/${ids.ticket}`, config: { baseURL: '/api/dolores/v1', signal } },
    { url: `/replacement-assignments/${ids.assignment}`, config: { baseURL: '/api/dolores/v1', signal } },
  ]);

  const mismatchedApi = loadApi('src/apis/maintenance-requests.api.ts', {
    get: async () => ({ data: { id: ids.otherRequest }, headers: {} }),
  }).maintenanceRequestsApi;
  await assert.rejects(mismatchedApi.getById(ids.request), /different maintenance request/);
});
