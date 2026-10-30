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
};
const passthrough = { parse: (value) => value, safeParse: (value) => ({ success: true, data: value }) };
const schemas = new Proxy({ shape: { ownerId: passthrough } }, {
  get(target, name) {
    if (name === 'unwrapLocations') return (value) => value;
    if (name === 'shape') return target.shape;
    if (name === 'LocationListParamsSchema') return { ...passthrough, shape: { ownerId: passthrough } };
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
  const tenant = { id: ids.tenant, name: 'Test tenant' };
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
    put: async (url, data, config = {}) => {
      calls.push({ method: 'PUT', url, data, config });
      return { data: responseData };
    },
    delete: async (url, config = {}) => {
      calls.push({ method: 'DELETE', url, config });
      return { data: responseData };
    },
  };
  const apis = {
    profiles: loadApi('src/apis/profiles.api.ts', axiosClient).profilesApi,
    locations: loadApi('src/apis/locations.api.ts', axiosClient).locationsApi,
    contracts: loadApi('src/apis/contracts.api.ts', axiosClient).contractsApi,
    machines: loadApi('src/apis/machines.api.ts', axiosClient).machinesApi,
    machineModels: loadApi('src/apis/machine-models.api.ts', axiosClient).machineModelsApi,
    telemetry: loadApi('src/apis/telemetry.api.ts', axiosClient).telemetryApi,
    notifications: loadApi('src/apis/notifications.api.ts', axiosClient).notificationsApi,
    recipes: loadApi('src/apis/recipes.api.ts', axiosClient).recipesApi,
    billing: loadApi('src/apis/billing.api.ts', axiosClient).billingApi,
    buybacks: loadApi('src/apis/buybacks.api.ts', axiosClient).buybacksApi,
    tenants: loadApi('src/apis/tenants.api.ts', axiosClient).tenantsApi,
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
    ['locations', 'update', [ids.location, { name: 'Updated store' }], location, 'PUT', `/locations/${ids.location}`, { baseURL: '/api/dolores/v1' }, { name: 'Updated store' }],
    ['locations', 'deactivate', [ids.location], undefined, 'DELETE', `/locations/${ids.location}`, { baseURL: '/api/dolores/v1' }],
    ['contracts', 'list', [signal], [], 'GET', '/contracts', { baseURL: '/api/dolores/v1', signal }],
    ['contracts', 'listByTenant', [ids.tenant, signal], [contract], 'GET', `/contracts/tenant/${ids.tenant}`, { baseURL: '/api/dolores/v1', signal }],
    ['contracts', 'getById', [ids.contract, signal], contract, 'GET', `/contracts/${ids.contract}`, { baseURL: '/api/dolores/v1', signal }],
    ['contracts', 'getModeratorById', [ids.contract, signal], contract, 'GET', `/contracts/${ids.contract}`, { baseURL: '/api/dolores/v1', signal }],
    ['contracts', 'getExpiry', [ids.contract, signal], {}, 'GET', `/contracts/${ids.contract}/expiry-status`, { baseURL: '/api/dolores/v1', signal }],
    ['contracts', 'getDocuments', [ids.contract, signal], [], 'GET', `/contracts/${ids.contract}/documents`, { baseURL: '/api/dolores/v1', signal }],
    ['contracts', 'amendPolicy', [ids.contract, { snapshot: { policyVersion: 1 }, reason: 'Updated terms', effectiveDate: '2026-11-01' }], contract, 'POST', `/contracts/${ids.contract}/policy-amendments`, { baseURL: '/api/dolores/v1' }, { snapshot: { policyVersion: 1 }, reason: 'Updated terms', effectiveDate: '2026-11-01' }],
    ['contracts', 'getPolicyHistory', [ids.contract, signal], [], 'GET', `/contracts/${ids.contract}/policy-history`, { baseURL: '/api/dolores/v1', params: { page: 0, size: 100 }, signal }],
    ['contracts', 'continueContract', [ids.contract, { startDate: '2026-11-01', endDate: '2027-11-01', terms: 'Continued', monthlyRentalFee: 100 }], { id: ids.contract }, 'POST', `/contracts/${ids.contract}/continuations`, { baseURL: '/api/dolores/v1' }, { startDate: '2026-11-01', endDate: '2027-11-01', terms: 'Continued', monthlyRentalFee: 100 }],
    ['contracts', 'requestTermination', [ids.contract, { type: 'NORMAL', reason: 'Term ended', idempotencyKey: 'ik-1', correlationId: 'corr-1' }], { id: ids.contract, contractId: ids.contract, ownerId: ids.profile, type: 'NORMAL', status: 'REQUESTED', reason: 'Term ended' }, 'POST', `/contracts/${ids.contract}/termination-cases`, { baseURL: '/api/dolores/v1' }, { type: 'NORMAL', reason: 'Term ended', idempotencyKey: 'ik-1', correlationId: 'corr-1' }],
    ['contracts', 'getMachineHistory', [ids.machine, signal], [contract], 'GET', `/contracts/machine/${ids.machine}/history`, { baseURL: '/api/dolores/v1', signal }],
    ['contracts', 'downloadDocument', [ids.contract, ids.document, signal], blob, 'GET', `/contracts/${ids.contract}/documents/${ids.document}`, { baseURL: '/api/dolores/v1', responseType: 'blob', signal }],
    ['machines', 'list', [signal], [machine], 'GET', '/machines', { baseURL: '/api/dolores/v1', signal }],
    ['machines', 'getById', [ids.machine, signal], machine, 'GET', `/machines/${ids.machine}`, { baseURL: '/api/dolores/v1', signal }],
    ['machines', 'getInventorySummary', [signal], {}, 'GET', '/inventory/summary', { baseURL: '/api/dolores/v1', signal }],
    ['machines', 'getMaintenanceSchedule', [ids.machine, signal], {}, 'GET', `/machines/${ids.machine}/maintenance-schedule`, { baseURL: '/api/dolores/v1', signal }],
    ['machines', 'listMaintenanceTickets', [{ machineId: ids.machine, page: 0, size: 100 }, signal], [], 'GET', '/maintenance-tickets', { baseURL: '/api/dolores/v1', params: { machineId: ids.machine, page: 0, size: 100 }, signal }],
    ['machines', 'update', [ids.machine, { serialNumber: 'S-01', status: 'IN_WAREHOUSE', region: 'HCMC' }], machine, 'PUT', `/machines/${ids.machine}`, { baseURL: '/api/dolores/v1' }, { serialNumber: 'S-01', status: 'IN_WAREHOUSE', region: 'HCMC' }],
    ['machines', 'delete', [ids.machine], undefined, 'DELETE', `/machines/${ids.machine}`, { baseURL: '/api/dolores/v1' }],
    ['machineModels', 'create', [{ modelCode: 'M-1', manufacturer: 'Maker', displayName: 'Model 1', machineType: 'CONVENTIONAL', specifications: {} }], { id: ids.machine }, 'POST', '/machine-models', { baseURL: '/api/dolores/v1' }, { modelCode: 'M-1', manufacturer: 'Maker', displayName: 'Model 1', machineType: 'CONVENTIONAL', specifications: {} }],
    ['machineModels', 'assignMachineToModel', [ids.machine, ids.machine, { reason: 'Test assignment' }], { machineId: ids.machine, modelId: ids.machine, machineType: 'CONVENTIONAL', mappedAt: '2026-10-29T10:00:00' }, 'POST', `/machine-models/${ids.machine}/machines/${ids.machine}`, { baseURL: '/api/dolores/v1' }, { reason: 'Test assignment' }],
    ['machineModels', 'getById', [ids.machine, signal], { id: ids.machine }, 'GET', `/machine-models/${ids.machine}`, { baseURL: '/api/dolores/v1', signal }],
    ['machineModels', 'update', [ids.machine, { modelCode: 'M-1', manufacturer: 'Maker', displayName: 'Model 1', machineType: 'CONVENTIONAL', specifications: {} }], { id: ids.machine }, 'PUT', `/machine-models/${ids.machine}`, { baseURL: '/api/dolores/v1' }, { modelCode: 'M-1', manufacturer: 'Maker', displayName: 'Model 1', machineType: 'CONVENTIONAL', specifications: {} }],
    ['machineModels', 'deactivate', [ids.machine], { id: ids.machine }, 'POST', `/machine-models/${ids.machine}/deactivate`, { baseURL: '/api/dolores/v1' }, undefined],
    ['telemetry', 'getLatestHeartbeat', [ids.machine, signal], { machineId: ids.machine }, 'GET', `/telemetry-query/machines/${ids.machine}/heartbeats/latest`, { baseURL: '/api/dolores/v1', signal }],
    ['telemetry', 'listMachinePoints', [ids.machine, { from: '2026-10-01T00:00:00Z', to: '2026-10-02T00:00:00Z' }, 25, signal], [{ machineId: ids.machine }], 'GET', `/telemetry-query/machines/${ids.machine}/points`, { baseURL: '/api/dolores/v1', params: { from: '2026-10-01T00:00:00Z', to: '2026-10-02T00:00:00Z', limit: 100, offset: 25 }, signal }],
    ['notifications', 'list', [signal], [], 'GET', '/notifications', { baseURL: '/api/dolores/v1', signal }],
    ['notifications', 'unreadCount', [signal], { unreadCount: 0 }, 'GET', '/notifications/unread-count', { baseURL: '/api/dolores/v1', signal }],
    ['notifications', 'listAlerts', [signal], [], 'GET', '/alerts', { baseURL: '/api/dolores/v1', signal }],
    ['notifications', 'acknowledgeAlert', [ids.notification], undefined, 'POST', `/alerts/${ids.notification}/ack`, { baseURL: '/api/dolores/v1' }, undefined],
    ['notifications', 'markAsRead', [ids.notification], notification, 'POST', `/notifications/${ids.notification}/read`, { baseURL: '/api/dolores/v1' }, undefined],
    ['recipes', 'listGlobal', [signal], [recipe], 'GET', '/recipes/global', { baseURL: '/api/dolores/v1', signal }],
    ['recipes', 'getGlobalById', [ids.recipe, signal], recipe, 'GET', `/recipes/global/${ids.recipe}`, { baseURL: '/api/dolores/v1', signal }],
    ['recipes', 'publishGlobal', [recipeInput], recipe, 'POST', '/recipes/global', { baseURL: '/api/dolores/v1' }, recipeInput],
    ['recipes', 'updateGlobal', [ids.recipe, recipeInput], recipe, 'PUT', `/recipes/global/${ids.recipe}`, { baseURL: '/api/dolores/v1' }, recipeInput],
    ['recipes', 'deleteGlobal', [ids.recipe], undefined, 'DELETE', `/recipes/global/${ids.recipe}`, { baseURL: '/api/dolores/v1' }],
    ['billing', 'listInvoices', [signal], [], 'GET', '/billing/invoices', { baseURL: '/api/dolores/v1', signal }],
    ['billing', 'listModeratorInvoices', [signal], [invoice], 'GET', '/billing/invoices', { baseURL: '/api/dolores/v1', signal }],
    ['billing', 'getModeratorInvoice', [ids.invoice, signal], invoice, 'GET', `/billing/invoices/${ids.invoice}`, { baseURL: '/api/dolores/v1', signal }],
    ['billing', 'listPaymentProofs', [ids.invoice, signal], [], 'GET', `/billing/invoices/${ids.invoice}/payment-proofs`, { baseURL: '/api/dolores/v1', signal }],
    ['billing', 'downloadPaymentProofContent', [ids.proof, signal], blob, 'GET', `/billing/payment-proofs/${ids.proof}/content`, { baseURL: '/api/dolores/v1', headers: { Accept: '*/*' }, responseType: 'blob', signal }],
    ['buybacks', 'getById', [ids.buyback, signal], { id: ids.buyback }, 'GET', `/buybacks/${ids.buyback}`, { baseURL: '/api/dolores/v1', signal }],
    ['tenants', 'list', [signal], [tenant], 'GET', '/tenants', { baseURL: '/api/dolores/v1', signal }],
    ['tenants', 'getById', [ids.tenant, signal], tenant, 'GET', `/tenants/${ids.tenant}`, { baseURL: '/api/dolores/v1', signal }],
    ['workOrders', 'listByTenant', [ids.tenant, signal], [workOrder], 'GET', '/installation-work-orders', { baseURL: '/api/dolores/v1', params: { tenantId: ids.tenant }, signal }],
    ['workOrders', 'getById', [ids.workOrder, signal], workOrderDetails, 'GET', `/installation-work-orders/${ids.workOrder}`, { baseURL: '/api/dolores/v1', signal }],
    ['dashboard', 'getOverview', [signal, '2026-10-01', '2026-10-07'], {}, 'GET', '/dashboard/overview', { baseURL: '/api/dolores/v1', signal, params: { fromDate: '2026-10-01', toDate: '2026-10-07' } }],
    ['dashboard', 'getDailyMachineCupUsage', ['2026-10-29', signal], [], 'GET', '/dashboard/daily-cups/machines', { baseURL: '/api/dolores/v1', signal, params: { date: '2026-10-29' } }],
  ];

  for (const [apiName, methodName, args, expectedResponse, method, url, config, data] of operations) {
    responseData = expectedResponse;
    const result = await apis[apiName][methodName](...args);
    assert.deepEqual(result, expectedResponse, `${apiName}.${methodName} returns parsed response data`);
    const actual = calls.at(-1);
    assert.equal(actual.method, method, `${apiName}.${methodName} uses the expected HTTP method`);
    assert.equal(actual.url, url, `${apiName}.${methodName} uses the expected relative route`);
    assert.deepEqual(actual.config, config, `${apiName}.${methodName} preserves query, signal, and response config`);
    if (method === 'POST' || method === 'PUT') assert.deepEqual(actual.data, data, `${apiName}.${methodName} preserves its body`);
  }

  assert.equal(calls.length, operations.length);
  assert.ok(calls.every((call) => !/^https?:\/\//i.test(call.url)), 'Dolores requests must use relative paths');
});
