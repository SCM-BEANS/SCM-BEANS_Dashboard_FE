const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const uuid = (suffix) => `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`;
const ids = {
  tenant: uuid('1'), invoice: uuid('2'), proof: uuid('3'), buyback: uuid('4'),
  contract: uuid('5'), machine: uuid('6'), document: uuid('7'), workOrder: uuid('8'),
  location: uuid('9'), notification: uuid('10'), recipe: uuid('11'),
};
const passSchema = { parse: (value) => value };
const tenantSchema = { ...passSchema, shape: { id: passSchema } };
const schemas = new Proxy({}, {
  get(_target, name) {
    if (name === 'TenantSchema') return tenantSchema;
    if (name === 'unwrapLocations') return (value) => value;
    if (name === 'InvoicesSchema') return { ...passSchema, element: passSchema };
    return passSchema;
  },
});

function loadApi(relativePath, client) {
  const fileName = join(__dirname, '..', relativePath);
  const source = readFileSync(fileName, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  const mocks = {
    './client': {
      doloresAxiosClient: client,
      DoloresApiError: class DoloresApiError extends Error {},
      parseDoloresResponse: (data, schema) => schema.parse(data),
    },
  };
  const mockedRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id];
    if (id.startsWith('@/schemas/dolores/')) return schemas;
    return require(id);
  };
  new Function('require', 'exports', 'module', outputText)(mockedRequire, module.exports, module);
  return module.exports;
}

test('all Dolores API methods preserve their Axios method, route, payload, query, signal, and Blob config', async () => {
  const signal = new AbortController().signal;
  const recipeInput = { name: 'API test recipe', steps: ['BREW:25s'], dosageBounds: ['water:30:50'] };
  const blob = new Blob(['document']);
  const calls = [];
  let responseData;
  const client = {
    get(url, config) {
      calls.push({ method: 'GET', args: [...arguments] });
      return Promise.resolve({ data: responseData });
    },
    post(url, data, config) {
      calls.push({ method: 'POST', args: [...arguments] });
      return Promise.resolve({ data: responseData });
    },
  };

  const apis = {
    alerts: loadApi('src/apis/dolores/alerts.api.ts', client).alertsApi,
    billing: loadApi('src/apis/dolores/billing.api.ts', client).billingApi,
    buybacks: loadApi('src/apis/dolores/buybacks.api.ts', client).buybacksApi,
    contracts: loadApi('src/apis/dolores/contracts.api.ts', client).contractsApi,
    dashboard: loadApi('src/apis/dolores/dashboard.api.ts', client).dashboardApi,
    installation: loadApi('src/apis/dolores/installationWorkOrders.api.ts', client).installationWorkOrdersApi,
    locations: loadApi('src/apis/dolores/locations.api.ts', client).locationsApi,
    machines: loadApi('src/apis/dolores/machines.api.ts', client).machinesApi,
    notifications: loadApi('src/apis/dolores/notifications.api.ts', client).notificationsApi,
    recipes: loadApi('src/apis/dolores/recipes.api.ts', client).recipesApi,
    telemetry: loadApi('src/apis/dolores/telemetry.api.ts', client).telemetryApi,
    tenants: loadApi('src/apis/dolores/tenants.api.ts', client).tenantsApi,
  };

  const operations = [
    ['alerts', 'list', [signal], [], ['GET', '/alerts', { signal }]],
    ['billing', 'listInvoices', [signal], [], ['GET', '/billing/invoices', { signal }]],
    ['billing', 'getInvoice', [ids.invoice, signal], {}, ['GET', `/billing/invoices/${ids.invoice}`, { signal }]],
    ['billing', 'listPaymentProofs', [ids.invoice, signal], [], ['GET', `/billing/invoices/${ids.invoice}/payment-proofs`, { signal }]],
    ['billing', 'downloadPaymentProofContent', [ids.proof], blob, ['GET', `/billing/payment-proofs/${ids.proof}/content`, { headers: { Accept: '*/*' }, responseType: 'blob' }]],
    ['buybacks', 'getById', [ids.buyback, signal], {}, ['GET', `/buybacks/${ids.buyback}`, { signal }]],
    ['contracts', 'listByTenant', [ids.tenant, signal], [], ['GET', `/contracts/tenant/${ids.tenant}`, { signal }]],
    ['contracts', 'getById', [ids.contract, signal], { id: ids.contract }, ['GET', `/contracts/${ids.contract}`, { signal }]],
    ['contracts', 'listByMachine', [ids.machine, signal], [], ['GET', `/contracts/machine/${ids.machine}/history`, { signal }]],
    ['contracts', 'getExpiryStatus', [ids.contract, signal], { contractId: ids.contract }, ['GET', `/contracts/${ids.contract}/expiry-status`, { signal }]],
    ['contracts', 'listDocuments', [ids.contract, signal], [], ['GET', `/contracts/${ids.contract}/documents`, { signal }]],
    ['contracts', 'downloadDocument', [ids.contract, ids.document], blob, ['GET', `/contracts/${ids.contract}/documents/${ids.document}`, { headers: { Accept: '*/*' }, responseType: 'blob' }]],
    ['dashboard', 'getOverview', [signal, '2026-10-01', '2026-10-07'], {}, ['GET', '/dashboard/overview', { signal, params: { fromDate: '2026-10-01', toDate: '2026-10-07' } }]],
    ['installation', 'listByTenant', [ids.tenant, signal], [], ['GET', '/installation-work-orders', { params: { tenantId: ids.tenant }, signal }]],
    ['installation', 'getById', [ids.workOrder, signal], {}, ['GET', `/installation-work-orders/${ids.workOrder}`, { signal }]],
    ['locations', 'listByTenant', [ids.tenant, signal], [], ['GET', '/locations', { params: { tenantId: ids.tenant, activeOnly: false }, signal }]],
    ['locations', 'getById', [ids.location, signal], {}, ['GET', `/locations/${ids.location}`, { signal }]],
    ['machines', 'list', [signal], [], ['GET', '/machines', { signal }]],
    ['machines', 'getById', [ids.machine, signal], {}, ['GET', `/machines/${ids.machine}`, { signal }]],
    ['machines', 'getInventorySummary', [signal], {}, ['GET', '/inventory/summary', { signal }]],
    ['machines', 'listMaintenanceTickets', [signal], [], ['GET', '/maintenance-tickets', { signal }]],
    ['machines', 'getMaintenanceSchedule', [ids.machine, signal], {}, ['GET', `/machines/${ids.machine}/maintenance-schedule`, { signal }]],
    ['machines', 'getLatestHeartbeat', [ids.machine, signal], {}, ['GET', `/telemetry-query/machines/${ids.machine}/heartbeats/latest`, { signal }]],
    ['notifications', 'list', [signal], [], ['GET', '/notifications', { signal }]],
    ['notifications', 'unreadCount', [signal], {}, ['GET', '/notifications/unread-count', { signal }]],
    ['notifications', 'markAsRead', [ids.notification], {}, ['POST', `/notifications/${ids.notification}/read`]],
    ['recipes', 'listGlobal', [signal], [], ['GET', '/recipes/global', { signal }]],
    ['recipes', 'getGlobalById', [ids.recipe, signal], {}, ['GET', `/recipes/global/${ids.recipe}`, { signal }]],
    ['recipes', 'publishGlobal', [recipeInput], recipeInput, ['POST', '/recipes/global', recipeInput]],
    ['telemetry', 'listMachinePoints', [ids.machine, '2026-10-01T00:00:00', '2026-10-02T00:00:00', 25, signal], [], ['GET', `/telemetry-query/machines/${ids.machine}/points`, { params: { from: '2026-10-01T00:00:00', to: '2026-10-02T00:00:00', limit: 100, offset: 25 }, signal }]],
    ['tenants', 'list', [signal], [], ['GET', '/tenants', { signal }]],
    ['tenants', 'get', [ids.tenant, signal], {}, ['GET', `/tenants/${ids.tenant}`, { signal }]],
  ];

  for (const [apiName, methodName, args, expectedResponse, expectedCall] of operations) {
    responseData = expectedResponse;
    assert.deepEqual(
      await apis[apiName][methodName](...args),
      expectedResponse,
      `${apiName}.${methodName} returns parsed response data`
    );
    assert.deepEqual(calls.at(-1), {
      method: expectedCall[0],
      args: expectedCall.slice(1),
    }, `${apiName}.${methodName} preserves its Axios call contract`);
  }

  assert.equal(calls.length, 32);
});
