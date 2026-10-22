const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const { createDoloresAxiosMock } = require('./helpers/doloresAxiosMock.cjs');

function loadTypescript(relativePath, mocks = {}) {
  const fileName = join(__dirname, '..', relativePath);
  const source = readFileSync(fileName, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const loadedModule = { exports: {} };
  const mockedRequire = (id) => Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : require(id);
  new Function('require', 'exports', 'module', outputText)(mockedRequire, loadedModule.exports, loadedModule);
  return loadedModule.exports;
}

const recipeId = '00000000-0000-4000-8000-000000000101';
const tenantId = '00000000-0000-4000-8000-000000000102';
const contractId = '00000000-0000-4000-8000-000000000103';
const recipe = {
  id: recipeId,
  name: 'Standard Espresso',
  steps: ['GRIND:8s', 'TAMP:12kg', 'BREW:25s'],
  dosageBounds: ['bean:6:12', 'water:30:50'],
};
const invoice = {
  id: '00000000-0000-4000-8000-000000000104',
  tenantId,
  contractId,
  amount: 1250000,
  period: '2026-10',
  type: 'RENTAL',
  status: 'PAID',
  currency: 'VND',
  createdAt: '2026-10-01T00:00:00',
  paidAt: '2026-10-03T09:30:00',
};

test('global recipe schemas accept live DTOs and reject malformed identity or missing steps', () => {
  const schemas = loadTypescript('src/schemas/dolores/recipes.ts');

  assert.deepEqual(schemas.GlobalRecipesSchema.parse([recipe]), [recipe]);
  assert.equal(schemas.GlobalRecipeSchema.safeParse({ ...recipe, id: 'not-a-uuid' }).success, false);
  assert.equal(schemas.RecipePublishRequestSchema.safeParse({
    name: 'Empty recipe',
    steps: [],
    dosageBounds: [],
  }).success, false);
  assert.equal(schemas.RecipePublishRequestSchema.safeParse({
    name: 'Recipe with an unconstrained bound',
    steps: ['BREW:25s'],
    dosageBounds: [''],
  }).success, true);
});

test('recipe API uses only documented global list, detail, and publish operations', async () => {
  const schemas = loadTypescript('src/schemas/dolores/recipes.ts');
  const responses = [[recipe], recipe, recipe];
  const axiosMock = createDoloresAxiosMock(responses);
  const { calls } = axiosMock;
  const { recipesApi } = loadTypescript('src/apis/dolores/recipes.api.ts', {
    './client': axiosMock.module,
    '@/schemas/dolores/recipes': schemas,
  });
  const signal = new AbortController().signal;
  const publishRequest = { name: recipe.name, steps: recipe.steps, dosageBounds: recipe.dosageBounds };

  await recipesApi.listGlobal(signal);
  await recipesApi.getGlobalById(recipeId, signal);
  await recipesApi.publishGlobal(publishRequest);

  assert.deepEqual(calls.map(({ config }) => [config.method, config.url, config.signal, config.data]), [
    ['GET', '/recipes/global', signal, undefined],
    ['GET', '/recipes/global/' + recipeId, signal, undefined],
    ['POST', '/recipes/global', undefined, publishRequest],
  ]);
  assert.equal(Object.hasOwn(recipesApi, 'deleteGlobal'), false);
  await assert.rejects(async () => recipesApi.getGlobalById('not-a-uuid'));
});

test('invoice schema and API preserve complete unpaged rental invoice DTOs', async () => {
  const schemas = loadTypescript('src/schemas/dolores/billing.ts');
  assert.deepEqual(schemas.InvoicesSchema.parse([invoice]), [invoice]);
  assert.equal(schemas.InvoiceSchema.safeParse({ ...invoice, amount: '1250000' }).success, false);
  assert.equal(schemas.InvoiceSchema.safeParse({ ...invoice, currency: 'USDT' }).success, true);
  assert.equal(schemas.InvoiceSchema.safeParse({ ...invoice, period: '' }).success, true);

  const axiosMock = createDoloresAxiosMock([[invoice]]);
  const { calls } = axiosMock;
  const { billingApi } = loadTypescript('src/apis/dolores/billing.api.ts', {
    './client': axiosMock.module,
    '@/schemas/dolores/billing': schemas,
  });
  const signal = new AbortController().signal;

  assert.deepEqual(await billingApi.listInvoices(signal), [invoice]);
  assert.deepEqual(calls.map(({ config }) => config), [
    { method: 'GET', url: '/billing/invoices', signal },
  ]);
});

test('dashboard date-range requests serialize both dates', async () => {
  const dashboardSchema = loadTypescript('src/schemas/dolores/dashboard.ts');
  const axiosMock = createDoloresAxiosMock([{ scope: 'SYSTEM' }]);
  const { calls } = axiosMock;
  const { dashboardApi } = loadTypescript('src/apis/dolores/dashboard.api.ts', {
    './client': axiosMock.module,
    '@/schemas/dolores/dashboard': dashboardSchema,
  });
  const signal = new AbortController().signal;

  await dashboardApi.getOverview(signal, '2026-10-01', '2026-10-07');

  assert.deepEqual(calls.map(({ config }) => config), [{
    method: 'GET',
    url: '/dashboard/overview',
    signal,
    params: { fromDate: '2026-10-01', toDate: '2026-10-07' },
  }]);
});

test('dashboard overview query keys isolate each explicit date range', () => {
  const queries = [];
  class DoloresApiError extends Error {}
  const { useDashboardOverview } = loadTypescript('src/hooks/dolores/useDashboardOverview.ts', {
    '@tanstack/react-query': { useQuery: (options) => { queries.push(options); return options; } },
    '@/apis/dolores/dashboard.api': { dashboardApi: { getOverview: async () => ({ scope: 'SYSTEM' }) } },
    '@/apis/dolores/client': { DoloresApiError },
  });

  useDashboardOverview();
  useDashboardOverview('2026-10-01', '2026-10-07');
  useDashboardOverview('2026-10-08', '2026-10-14');

  assert.deepEqual(queries.map(({ queryKey }) => queryKey), [
    ['dolores', 'dashboard', 'overview'],
    ['dolores', 'dashboard', 'overview', { fromDate: '2026-10-01', toDate: '2026-10-07' }],
    ['dolores', 'dashboard', 'overview', { fromDate: '2026-10-08', toDate: '2026-10-14' }],
  ]);
});

test('recipe publish invalidates only the global recipe query family after server success', async () => {
  const invalidations = [];
  const recipesApi = { publishGlobal: async (request) => ({ ...recipe, ...request }) };
  const queryClient = { invalidateQueries: async (input) => { invalidations.push(input); } };
  const reactQuery = {
    useMutation: (options) => options,
    useQueryClient: () => queryClient,
  };
  const { usePublishGlobalRecipe } = loadTypescript('src/hooks/dolores/useGlobalRecipes.ts', {
    '@tanstack/react-query': reactQuery,
    '@/apis/dolores/recipes.api': { recipesApi },
    './queryPolicy': { retryDoloresRead: () => false },
  });

  const mutation = usePublishGlobalRecipe();
  assert.equal(mutation.retry, false);
  await mutation.onSuccess(recipe);

  assert.deepEqual(invalidations, [{ queryKey: ['dolores', 'recipes', 'global'] }]);
});
