const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const recipeId = '00000000-0000-4000-8000-000000000101';
const tenantId = '00000000-0000-4000-8000-000000000102';
const contractId = '00000000-0000-4000-8000-000000000103';
const recipe = {
  id: recipeId,
  name: 'Standard Espresso',
  steps: ['GRIND:8s', 'TAMP:12kg', 'BREW:25s'],
  dosageBounds: ['bean:6:12', 'water:30:50'],
};
const moderatorInvoice = {
  id: '00000000-0000-4000-8000-000000000104',
  tenantId,
  contractId,
  amount: 1250000,
  period: '2026-10',
  type: 'RENTAL',
  status: 'PAID',
  currency: 'VND',
};

function loadTypescript(relativePath, mocks = {}) {
  const fileName = join(__dirname, '..', relativePath);
  const source = readFileSync(fileName, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const mockedRequire = (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  const loaded = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(mockedRequire, loaded.exports, loaded);
  return loaded.exports;
}

const recipeSchemas = loadTypescript('src/schema/recipes.schema.ts');
const billingSchemas = loadTypescript('src/schema/billing.schema.ts');
const dashboardSchemas = loadTypescript('src/schema/dashboard.schema.ts');

test('global recipe schemas validate canonical IDs and non-empty publish instructions', () => {
  assert.deepEqual(recipeSchemas.GlobalRecipesSchema.parse([recipe]), [recipe]);
  assert.equal(recipeSchemas.GlobalRecipeSchema.safeParse({ ...recipe, id: 'not-a-uuid' }).success, false);
  assert.equal(recipeSchemas.RecipePublishRequestSchema.safeParse({
    name: 'Empty recipe', steps: [], dosageBounds: ['water:30:50'],
  }).success, false);
  assert.equal(recipeSchemas.RecipePublishRequestSchema.safeParse({
    name: 'Valid recipe', steps: ['BREW:25s'], dosageBounds: ['water:30:50'],
  }).success, true);
});

test('recipe API uses only the global list, detail, and publish routes', async () => {
  const calls = [];
  let responseData;
  const axiosClient = {
    get: async (url, config) => { calls.push({ method: 'GET', url, config }); return { data: responseData }; },
    post: async (url, data, config) => { calls.push({ method: 'POST', url, data, config }); return { data: responseData }; },
  };
  const { recipesApi } = loadTypescript('src/apis/recipes.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/recipes.schema': recipeSchemas,
  });
  const signal = new AbortController().signal;
  const publishRequest = { name: recipe.name, steps: recipe.steps, dosageBounds: recipe.dosageBounds };

  responseData = [recipe];
  assert.deepEqual(await recipesApi.listGlobal(signal), [recipe]);
  responseData = recipe;
  assert.deepEqual(await recipesApi.getGlobalById(recipeId, signal), recipe);
  assert.deepEqual(await recipesApi.publishGlobal(publishRequest), recipe);

  assert.deepEqual(calls.map(({ method, url, config, data }) => [method, url, config, data]), [
    ['GET', '/recipes/global', { baseURL: '/api/dolores/v1', signal }, undefined],
    ['GET', `/recipes/global/${recipeId}`, { baseURL: '/api/dolores/v1', signal }, undefined],
    ['POST', '/recipes/global', { baseURL: '/api/dolores/v1' }, publishRequest],
  ]);
  await assert.rejects(recipesApi.getGlobalById('not-a-uuid'));
});

test('billing schemas distinguish Admin owner invoices from Moderator tenant invoices', () => {
  assert.deepEqual(billingSchemas.ModeratorInvoicesSchema.parse([moderatorInvoice]), [moderatorInvoice]);
  assert.equal(billingSchemas.ModeratorInvoiceSchema.safeParse({ ...moderatorInvoice, amount: '1250000' }).success, false);
  assert.equal(billingSchemas.ModeratorInvoiceSchema.safeParse({ ...moderatorInvoice, type: 'OTHER' }).success, false);
  assert.equal(billingSchemas.InvoiceSchema.safeParse({
    ...moderatorInvoice,
    tenantId: undefined,
    ownerId: tenantId,
  }).success, true);
});

test('Moderator invoice API reads invoices and validates canonical response identity', async () => {
  const calls = [];
  let responseData;
  const axiosClient = { get: async (url, config) => { calls.push({ url, config }); return { data: responseData }; } };
  const { billingApi } = loadTypescript('src/apis/billing.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/billing.schema': billingSchemas,
  });
  const signal = new AbortController().signal;
  responseData = [moderatorInvoice];
  assert.deepEqual(await billingApi.listModeratorInvoices(signal), [moderatorInvoice]);
  responseData = moderatorInvoice;
  assert.deepEqual(await billingApi.getModeratorInvoice(moderatorInvoice.id, signal), moderatorInvoice);
  assert.deepEqual(calls, [
    { url: '/billing/invoices', config: { baseURL: '/api/dolores/v1', signal } },
    { url: `/billing/invoices/${moderatorInvoice.id}`, config: { baseURL: '/api/dolores/v1', signal } },
  ]);
  await assert.rejects(billingApi.getModeratorInvoice('not-a-uuid'));
});

test('dashboard date range requests require and serialize both selected dates', async () => {
  const calls = [];
  const axiosClient = { get: async (url, config) => { calls.push({ url, config }); return { data: { scope: 'SYSTEM' } }; } };
  const { dashboardApi } = loadTypescript('src/apis/dashboard.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/dashboard.schema': dashboardSchemas,
  });
  const signal = new AbortController().signal;

  await dashboardApi.getOverview(signal, '2026-10-01', '2026-10-07');
  assert.deepEqual(calls, [{
    url: '/dashboard/overview',
    config: { baseURL: '/api/dolores/v1', signal, params: { fromDate: '2026-10-01', toDate: '2026-10-07' } },
  }]);
  await assert.rejects(dashboardApi.getOverview(signal, '2026-10-01'));
});

test('reports page isolates query keys by URL date range and passes the range to Dolores', async () => {
  const queryKeys = [];
  const apiCalls = [];
  const ranges = [
    {},
    { fromDate: '2026-10-01', toDate: '2026-10-07' },
    { fromDate: '2026-10-08', toDate: '2026-10-14' },
  ];

  for (const query of ranges) {
    const queryOptions = [];
    const reportModule = loadTypescript('src/pages/admin/reports.page.tsx', {
      'next/router': { useRouter: () => ({ isReady: true, query, push: async () => true }) },
      '@tanstack/react-query': { useQuery: (options) => {
        queryOptions.push(options);
        return { data: options.queryKey[1] === 'dashboard'
          ? { financialMetrics: [], operationalMetrics: { dailyAcceptedCupUsage: [] } }
          : [], isPending: false, isFetching: false, isError: false, refetch: async () => {} };
      } },
      '@/apis/dashboard.api': { dashboardApi: { getOverview: async (...args) => { apiCalls.push(args); return {}; } } },
      '@/apis/billing.api': { billingApi: { listInvoices: async () => [] } },
      '@/schema/dashboard.schema': dashboardSchemas,
      '@/routes/path': { PATH_ADMIN: { REPORTS: '/admin/reports' } },
      '@/text/admin/admin-messages': { ADMIN_MESSAGES: new Proxy({}, { get: () => new Proxy({}, { get: (_t, key) => String(key) }) }) },
      '@/components/button/button-bar': { ButtonBar: ({ children, ...props }) => React.createElement('button', props, children) },
      '@/components/action-bar/admin-action-bar': { AdminActionBar: ({ children }) => React.createElement('div', null, children) },
      './admin-shell': { AdminShell: ({ children }) => children, adminStyles: new Proxy({}, { get: (_t, key) => String(key) }) },
    });
    renderToStaticMarkup(React.createElement(reportModule.default));
    const dashboard = queryOptions.find((options) => options.queryKey[1] === 'dashboard');
    queryKeys.push(dashboard.queryKey);
    await dashboard.queryFn({ signal: new AbortController().signal });
  }

  assert.deepEqual(queryKeys, [
    ['dolores', 'dashboard', 'overview', 'default'],
    ['dolores', 'dashboard', 'overview', { fromDate: '2026-10-01', toDate: '2026-10-07' }],
    ['dolores', 'dashboard', 'overview', { fromDate: '2026-10-08', toDate: '2026-10-14' }],
  ]);
  assert.deepEqual(apiCalls.map(([, ...range]) => range), [
    [undefined, undefined],
    ['2026-10-01', '2026-10-07'],
    ['2026-10-08', '2026-10-14'],
  ]);
});

test('Moderator recipe catalog remains read-only and does not expose the Admin publish mutation', () => {
  let publishCalls = 0;
  const readOnlyText = new Proxy({}, { get: (_target, key) => String(key) });
  const { ModeratorRecipesScreen } = loadTypescript('src/pages/moderator/moderator-finance-catalog-screens.tsx', {
    '@tanstack/react-query': { useQuery: () => ({ data: [recipe], isPending: false, isError: false, isFetching: false, refetch: async () => {} }) },
    '@/apis/recipes.api': { recipesApi: {
      listGlobal: async () => [recipe], getGlobalById: async () => recipe,
      publishGlobal: async () => { publishCalls += 1; return recipe; },
    } },
    '@/apis/billing.api': { billingApi: {} },
    '@/apis/buybacks.api': { buybacksApi: {} },
    '@/routes/path': { PATH_MODERATOR: {
      MENU: '/moderator/menu',
      MENU_RECIPE_DETAIL: (id) => `/moderator/menu/${encodeURIComponent(id)}`,
    } },
    '@/schema/recipes.schema': recipeSchemas,
    '@/schema/billing.schema': billingSchemas,
    '@/schema/buybacks.schema': { BuybackIdSchema: { safeParse: () => ({ success: false }) } },
    '@/text/moderator/moderator-messages': { MODERATOR_MESSAGES: { READ_SCREENS: readOnlyText } },
    './moderator-shell': { moderatorStyles: new Proxy({}, { get: (_target, key) => String(key) }) },
  });
  const html = renderToStaticMarkup(React.createElement(ModeratorRecipesScreen, { sectionPath: 'menu' }));
  assert.match(html, /RECIPE_READ_ONLY/);
  assert.match(html, /Standard Espresso/);
  assert.doesNotMatch(html, /publish|phát hành|xóa/i);
  assert.equal(publishCalls, 0);
});
