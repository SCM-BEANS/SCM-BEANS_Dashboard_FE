const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { join, dirname, resolve } = require('node:path');
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
  steps: ['DOSE:18', 'TAMP:100', 'HOLDTAMP:50', 'EXTRACT:36', 'DRYTAMP:100'],
  revision: 2,
  menuId: '00000000-0000-0000-0000-000000000090',
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

function loadTypescript(relativePath, mocks = {}, resolveAliases = false, cache = new Map()) {
  const fileName = resolve(__dirname, '..', relativePath);
  if (cache.has(fileName)) return cache.get(fileName).exports;
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
  const mockedRequire = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (resolveAliases && (id.startsWith('@/') || id.startsWith('.'))) {
      const base = id.startsWith('@/') ? join(__dirname, '..', 'src', id.slice(2)) : resolve(dirname(fileName), id);
      const dependency = [base + '.ts', base + '.tsx'].find(existsSync);
      if (!dependency) throw new Error('Unresolved test import: ' + id);
      return loadTypescript(dependency, mocks, true, cache);
    }
    return require(id);
  };
  const loaded = { exports: {} };
  cache.set(fileName, loaded);
  new Function('require', 'exports', 'module', outputText)(mockedRequire, loaded.exports, loaded);
  return loaded.exports;
}

const recipeSchemas = loadTypescript('src/schema/recipes.schema.ts');
const billingSchemas = loadTypescript('src/schema/billing.schema.ts');
const dashboardSchemas = loadTypescript('src/schema/dashboard.schema.ts');

test('global recipe schemas validate the current five-field DTO and native procedure requests', () => {
  assert.deepEqual(recipeSchemas.GlobalRecipesSchema.parse([recipe]), [recipe]);
  const { steps, ...summary } = recipe;
  assert.deepEqual(recipeSchemas.GlobalRecipeSummariesSchema.parse([summary]), [summary]);
  assert.equal(recipeSchemas.GlobalRecipeSchema.safeParse({ ...recipe, id: 'not-a-uuid' }).success, false);
  for (const field of ['revision', 'menuId', 'steps']) {
    const missing = { ...recipe }; delete missing[field];
    assert.equal(recipeSchemas.GlobalRecipeSchema.safeParse(missing).success, false, field + ' is required');
  }
  assert.equal(recipeSchemas.GlobalRecipeSchema.safeParse({ ...recipe, dosageBounds: [] }).success, false);
  assert.equal(recipeSchemas.RecipePublishRequestSchema.safeParse({ name: 'Empty recipe', procedure: [] }).success, false);
  assert.equal(recipeSchemas.RecipePublishRequestSchema.safeParse({ name: 'Missing extraction', procedure: ['DOSE:18'] }).success, false);
  assert.equal(recipeSchemas.RecipePublishRequestSchema.safeParse({ name: recipe.name, procedure: steps }).success, true);
  assert.equal(recipeSchemas.RecipePublishRequestSchema.safeParse({ name: recipe.name, steps, dosageBounds: [] }).success, false);
});

test('recipe API separates paginated summaries, five-field details and native DSL publish', async () => {
  const calls = [];
  let responseData;
  const axiosClient = {
    get: async (url, config) => { calls.push({ method: 'GET', url, config }); return { data: responseData }; },
    post: async (url, data, config) => { calls.push({ method: 'POST', url, data, config }); return { data: responseData }; },
  };
  const { recipesApi } = loadTypescript('src/apis/recipes.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/recipes.schema': recipeSchemas,
  }, true);
  const signal = new AbortController().signal;
  const publishRequest = { name: recipe.name, procedure: recipe.steps };
  const { steps, ...summary } = recipe;

  responseData = [summary];
  assert.deepEqual(await recipesApi.listGlobal(signal), [summary]);
  responseData = recipe;
  assert.deepEqual(await recipesApi.getGlobalById(recipeId, signal), recipe);
  assert.deepEqual(await recipesApi.publishGlobal(publishRequest), recipe);

  assert.deepEqual(calls.map(({ method, url, config, data }) => [method, url, config, data]), [
    ['GET', '/recipes/global', { baseURL: '/api/dolores/v1', params: { page: 0, size: 50 }, signal }, undefined],
    ['GET', `/recipes/global/${recipeId}`, { baseURL: '/api/dolores/v1', signal }, undefined],
    ['POST', '/recipes/global', { baseURL: '/api/dolores/v1' }, publishRequest],
  ]);
  await assert.rejects(recipesApi.getGlobalById('not-a-uuid'));
  assert.equal(calls.length, 3, 'invalid IDs must not issue an HTTP request');
  responseData = { ...recipe, id: tenantId };
  await assert.rejects(recipesApi.getGlobalById(recipeId), /different global recipe/i);
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
      '@/components/action-bar/action-bar': { ActionBar: ({ children }) => React.createElement('div', null, children) },
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

test('Moderator menu route delegates valid IDs to shared management with Moderator permissions', () => {
  const delegated = [];
  const { ModeratorRecipesScreen } = loadTypescript('src/pages/moderator/menu/recipes-screen.tsx', {
    '@/components/features/recipe-menus/recipe-menus-screen': {
      RecipeManagementScreen: (props) => { delegated.push(props); return React.createElement('div', null, 'shared recipe management'); },
    },
    '@/schema/recipes.schema': recipeSchemas,
    '@/text/moderator/moderator-messages': { MODERATOR_MESSAGES: { READ_SCREENS: { INVALID_RECIPE_ID: 'Invalid recipe UUID' } } },
    '../moderator-shell': { moderatorStyles: {} },
    '../moderator-page-heading': { ModeratorPageHeading: ({ title }) => React.createElement('h1', null, title) },
  });
  const render = (sectionPath) => renderToStaticMarkup(React.createElement(ModeratorRecipesScreen, { sectionPath }));
  assert.match(render('menu'), /shared recipe management/);
  assert.deepEqual(delegated.pop(), { role: 'operator', operatorRole: 'MODERATOR', showHeading: false, initialGlobalRecipeId: undefined });
  assert.match(render('menu/' + recipeId), /shared recipe management/);
  assert.equal(delegated.pop().initialGlobalRecipeId, recipeId);
  for (const path of ['menu/add', 'menu/not-a-uuid']) {
    assert.match(render(path), /Invalid recipe UUID/);
    assert.equal(delegated.length, 0, 'invalid routes must not mount management or start recipe queries');
  }
});
