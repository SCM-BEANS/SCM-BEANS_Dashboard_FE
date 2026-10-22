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
  const loadedModule = { exports: {} };
  const mockedRequire = (id) => Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : require(id);
  new Function('require', 'exports', 'module', outputText)(mockedRequire, loadedModule.exports, loadedModule);
  return loadedModule.exports;
}

const invoiceId = '00000000-0000-4000-8000-000000000104';
const proofId = '00000000-0000-4000-8000-000000000105';
const recipeId = '00000000-0000-4000-8000-000000000106';
const buybackId = '00000000-0000-4000-8000-000000000107';
const tenantId = '00000000-0000-4000-8000-000000000102';
const contractId = '00000000-0000-4000-8000-000000000103';
const machineId = '00000000-0000-4000-8000-000000000108';

const invoice = {
  id: invoiceId,
  tenantId,
  contractId,
  amount: 1250000,
  period: '2026-10',
  type: 'RENTAL',
  status: 'PAID',
  currency: 'VND',
  dueDate: '2026-10-31',
  lineItems: '[{"description":"Monthly rental","amount":1250000}]',
  paidAt: '2026-10-20T10:00:00',
};
const proof = {
  id: proofId,
  tenantId,
  invoiceId,
  paymentId: '00000000-0000-4000-8000-000000000109',
  objectKey: 'private/path/should-not-render.jpg',
  originalFilename: 'transfer-proof.jpg',
  contentType: 'image/jpeg',
  sizeBytes: 4096,
  sha256: 'abc123',
  status: 'SUBMITTED',
  submittedBy: 'tenant@example.test',
  submittedAt: '2026-10-20T10:00:00',
  reviewedBy: null,
  reviewedAt: null,
  reviewReason: null,
};
const recipe = {
  id: recipeId,
  name: 'API Espresso',
  steps: ['GRIND:8s', 'BREW:25s'],
  dosageBounds: ['bean:6:12', 'water:30:50'],
};
const buybackCase = {
  id: buybackId,
  tenantId,
  contractId,
  machineId,
  status: 'REQUESTED',
  requestedPrice: 4000000,
  approvedPrice: null,
  currency: 'VND',
  externalAgreementReference: null,
  reason: 'Máy cần đổi mới',
  requestedBy: 'tenant@example.test',
  requestedAt: '2026-10-20T10:00:00',
  approvedBy: null,
  approvedAt: null,
  rejectedBy: null,
  rejectedAt: null,
  rejectionReason: null,
  cancelledBy: null,
  cancelledAt: null,
  cancellationReason: null,
  collectionEvidence: null,
  collectedBy: null,
  collectedAt: null,
  idempotencyKey: 'private-idempotency-key',
  correlationId: 'private-correlation-id',
  createdAt: '2026-10-20T10:00:00',
  updatedAt: '2026-10-20T10:00:00',
  version: 0,
};

test('Phase 4 schemas accept backend invoice, payment proof, recipe, and buyback read records', () => {
  const billingSchemas = loadTypescript('src/schemas/dolores/billing.ts');
  const recipeSchemas = loadTypescript('src/schemas/dolores/recipes.ts');
  const buybackSchemas = loadTypescript('src/schemas/dolores/buybacks.ts');

  assert.equal(billingSchemas.InvoiceSchema.parse(invoice).amount, 1250000);
  assert.equal(billingSchemas.PaymentProofSchema.parse(proof).originalFilename, 'transfer-proof.jpg');
  assert.equal(Object.hasOwn(billingSchemas.PaymentProofSchema.parse(proof), 'objectKey'), false);
  assert.equal(recipeSchemas.GlobalRecipeSchema.parse(recipe).id, recipeId);
  assert.equal(buybackSchemas.BuybackCaseSchema.parse(buybackCase).requestedPrice, 4000000);
  assert.equal(buybackSchemas.BuybackCaseSchema.safeParse({ ...buybackCase, id: 'MB-2026-017' }).success, false);
  assert.equal(billingSchemas.PaymentProofSchema.safeParse({ ...proof, status: 'APPROVED_BY_ADMIN' }).success, false);
});

test('billing read API uses only the documented invoice and private proof GET routes', async () => {
  const schemas = loadTypescript('src/schemas/dolores/billing.ts');
  const axiosMock = createDoloresAxiosMock([[invoice], invoice, [proof], new Blob(['proof'])]);
  const { calls } = axiosMock;
  const { billingApi } = loadTypescript('src/apis/dolores/billing.api.ts', {
    './client': axiosMock.module,
    '@/schemas/dolores/billing': schemas,
  });
  const signal = new AbortController().signal;

  assert.deepEqual(await billingApi.listInvoices(signal), [invoice]);
  assert.deepEqual(await billingApi.getInvoice(invoiceId, signal), invoice);
  assert.deepEqual(await billingApi.listPaymentProofs(invoiceId, signal), [schemas.PaymentProofSchema.parse(proof)]);
  assert.equal(await billingApi.downloadPaymentProofContent(proofId).then((blob) => blob.text()), 'proof');
  assert.deepEqual(calls.map(({ config }) => [config.responseType === 'blob' ? 'blob' : 'json', config.method, config.url, config.signal, config.responseType]), [
    ['json', 'GET', '/billing/invoices', signal, undefined],
    ['json', 'GET', `/billing/invoices/${invoiceId}`, signal, undefined],
    ['json', 'GET', `/billing/invoices/${invoiceId}/payment-proofs`, signal, undefined],
    ['blob', 'GET', `/billing/payment-proofs/${proofId}/content`, undefined, 'blob'],
  ]);
  const callCountBeforeInvalidIds = calls.length;
  await assert.rejects(billingApi.getInvoice('not-a-uuid'), /uuid/i);
  await assert.rejects(billingApi.downloadPaymentProofContent('not-a-uuid'), /uuid/i);
  assert.equal(calls.length, callCountBeforeInvalidIds);
});

test('buyback detail API requires a canonical UUID and has no invented collection method', async () => {
  const schemas = loadTypescript('src/schemas/dolores/buybacks.ts');
  const axiosMock = createDoloresAxiosMock([buybackCase]);
  const { calls } = axiosMock;
  const { buybacksApi } = loadTypescript('src/apis/dolores/buybacks.api.ts', {
    './client': axiosMock.module,
    '@/schemas/dolores/buybacks': schemas,
  });
  const signal = new AbortController().signal;

  assert.equal((await buybacksApi.getById(buybackId, signal)).id, buybackId);
  assert.deepEqual(calls.map(({ config }) => config), [
    { method: 'GET', url: `/buybacks/${buybackId}`, signal },
  ]);
  assert.equal(Object.hasOwn(buybacksApi, 'list'), false);
  const callCountBeforeInvalidId = calls.length;
  await assert.rejects(buybacksApi.getById('MB-2026-017'), /uuid/i);
  assert.equal(calls.length, callCountBeforeInvalidId);
});

test('billing and buyback detail hooks pass cancellation signals and disable invalid IDs', async () => {
  const billingOptions = [];
  const billingCalls = [];
  const billingReactQuery = {
    useQuery: (options) => { billingOptions.push(options); return options; },
    useMutation: (options) => options,
  };
  const billingApiMock = {
    listInvoices: async (signal) => { billingCalls.push(['list', signal]); return [invoice]; },
    getInvoice: async (id, signal) => { billingCalls.push(['invoice', id, signal]); return invoice; },
    listPaymentProofs: async (id, signal) => { billingCalls.push(['proofs', id, signal]); return [proof]; },
    downloadPaymentProofContent: async (id) => { billingCalls.push(['content', id]); return new Blob(); },
  };
  const billingSchemas = loadTypescript('src/schemas/dolores/billing.ts');
  const billingHooks = loadTypescript('src/hooks/dolores/useBillingInvoices.ts', {
    '@tanstack/react-query': billingReactQuery,
    '@/apis/dolores/billing.api': { billingApi: billingApiMock },
    '@/schemas/dolores/billing': billingSchemas,
    './queryPolicy': { retryDoloresRead: () => false },
  });
  const signal = new AbortController().signal;
  const invoiceQuery = billingHooks.useBillingInvoice(invoiceId);
  const proofsQuery = billingHooks.useInvoicePaymentProofs(invoiceId);
  const invalidInvoiceQuery = billingHooks.useBillingInvoice('HD-09-204');

  assert.equal(invoiceQuery.enabled, true);
  assert.equal(proofsQuery.enabled, true);
  assert.equal(invalidInvoiceQuery.enabled, false);
  assert.equal(await invoiceQuery.queryFn({ signal }), invoice);
  assert.deepEqual(await proofsQuery.queryFn({ signal }), [proof]);
  assert.deepEqual(billingCalls, [['invoice', invoiceId, signal], ['proofs', invoiceId, signal]]);
  assert.throws(() => invalidInvoiceQuery.queryFn({ signal }));

  const buybackOptions = [];
  const buybacksApiMock = { getById: async (id, querySignal) => { buybackCalls.push([id, querySignal]); return buybackCase; } };
  const buybackCalls = [];
  const buybackHooks = loadTypescript('src/hooks/dolores/useBuybacks.ts', {
    '@tanstack/react-query': { useQuery: (options) => { buybackOptions.push(options); return options; } },
    '@/apis/dolores/buybacks.api': { buybacksApi: buybacksApiMock },
    '@/schemas/dolores/buybacks': loadTypescript('src/schemas/dolores/buybacks.ts'),
    './queryPolicy': { retryDoloresRead: () => false },
  });
  const buybackQuery = buybackHooks.useBuybackCase(buybackId);
  assert.equal(buybackQuery.enabled, true);
  assert.equal(await buybackQuery.queryFn({ signal }), buybackCase);
  assert.deepEqual(buybackCalls, [[buybackId, signal]]);
});

function query(data, overrides = {}) {
  return { data, isPending: false, isError: false, isFetching: false, error: null, refetch: async () => {}, ...overrides };
}

function screenMocks(overrides = {}) {
  const calls = { invoiceIds: [], proofInvoiceIds: [], recipeIds: [], buybackIds: [] };
  const results = {
    invoices: query([invoice]),
    invoice: query(invoice),
    proofs: query([proof]),
    recipes: query([recipe]),
    recipe: query(recipe),
    buyback: query(buybackCase),
    download: { mutate: () => {}, isPending: false, isError: false, error: null },
    ...overrides,
  };
  const paths = {
    root: '/moderator',
    invoices: '/moderator/invoices',
    invoicesList: '/moderator/invoices/list',
    invoiceReconcile: '/moderator/invoices/reconcile',
    invoiceDetail: (id) => `/moderator/invoices/${encodeURIComponent(id)}`,
    menu: '/moderator/menu',
    menuItems: '/moderator/menu/items',
    menuIngredients: '/moderator/menu/ingredients',
    menuRecipeDetail: (id) => `/moderator/menu/${encodeURIComponent(id)}`,
    buyback: '/moderator/buyback',
    buybackList: '/moderator/buyback/list',
    buybackDetail: (id) => `/moderator/buyback/${encodeURIComponent(id)}`,
  };
  const ui = {
    DoloresPage: ({ title, description, actions, children }) => React.createElement('main', null,
      React.createElement('h1', null, title), description && React.createElement('p', null, description), actions, children),
    DoloresButton: ({ href, children, onClick, disabled }) => href
      ? React.createElement('a', { href, 'aria-disabled': disabled }, children)
      : React.createElement('button', { onClick, disabled }, children),
    DoloresField: ({ label, value, children }) => React.createElement('div', null, `${label}: `, children ?? value),
    DoloresFieldGrid: ({ children }) => React.createElement('div', null, children),
    DoloresNotice: ({ title, children }) => React.createElement('aside', null, React.createElement('strong', null, title), children),
    DoloresPanel: ({ children }) => React.createElement('section', null, children),
    DoloresPanelTitle: ({ children }) => React.createElement('h2', null, children),
    DoloresTable: ({ headers, rows }) => React.createElement('table', null,
      React.createElement('thead', null, React.createElement('tr', null, headers.map((header) => React.createElement('th', { key: header }, header)))),
      React.createElement('tbody', null, rows.map((row, rowIndex) => React.createElement('tr', { key: rowIndex }, row.map((cell, cellIndex) => React.createElement('td', { key: cellIndex }, cell))))))
  };
  const mocks = {
    'next/link': ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children),
    '@/routes/path': { PATH_MODERATOR: paths },
    '@/app/_shell/dolores/DoloresShell': { DoloresPage: ui.DoloresPage },
    '@/app/_ui/dolores/DoloresUI': ui,
    '@/ui/dolores/DoloresUI': ui,
    '@/hooks/dolores/useBillingInvoices': {
      useBillingInvoices: () => results.invoices,
      useBillingInvoice: (id) => { calls.invoiceIds.push(id); return results.invoice; },
      useInvoicePaymentProofs: (id) => { calls.proofInvoiceIds.push(id); return results.proofs; },
      useDownloadPaymentProof: () => results.download,
    },
    '@/hooks/dolores/useGlobalRecipes': {
      useGlobalRecipes: () => results.recipes,
      useGlobalRecipe: (id) => { calls.recipeIds.push(id); return results.recipe; },
    },
    '@/hooks/dolores/useBuybacks': {
      useBuybackCase: (id) => { calls.buybackIds.push(id); return results.buyback; },
    },
    '@/schemas/dolores/billing': loadTypescript('src/schemas/dolores/billing.ts'),
    '@/schemas/dolores/recipes': loadTypescript('src/schemas/dolores/recipes.ts'),
    '@/schemas/dolores/buybacks': loadTypescript('src/schemas/dolores/buybacks.ts'),
  };
  return { mocks, calls };
}

function renderScreen(exportName, path, overrides) {
  const { mocks, calls } = screenMocks(overrides);
  const screens = loadTypescript('src/app/(moderator)/moderator/_components/ModeratorBillingRecipeScreens.tsx', mocks);
  const html = renderToStaticMarkup(React.createElement(screens[exportName], { path }));
  return { html, calls };
}

test('Moderator invoice list renders API amounts/statuses, UUID details, and truthful empty/error states', () => {
  const populated = renderScreen('ModeratorInvoicesScreen', 'invoices');
  assert.match(populated.html, /2026-10/);
  assert.match(populated.html, /1\.250\.000/);
  assert.match(populated.html, /PAID/);
  assert.match(populated.html, new RegExp(`/moderator/invoices/${invoiceId}`));
  assert.doesNotMatch(populated.html, /Cà phê Mộc|HD-09-204|2\.750\.000/);

  const empty = renderScreen('ModeratorInvoicesScreen', 'invoices', { invoices: query([]) });
  assert.match(empty.html, /Không có hóa đơn/);
  const failure = renderScreen('ModeratorInvoicesScreen', 'invoices', {
    invoices: query(undefined, { isError: true, error: { status: 403 } }),
  });
  assert.match(failure.html, /403/);
  assert.doesNotMatch(failure.html, /Không có hóa đơn/);
});

test('Moderator invoice detail reads invoice and payment proof metadata by UUID without financial actions', () => {
  const { html, calls } = renderScreen('ModeratorInvoicesScreen', `invoices/${invoiceId}`);
  assert.deepEqual(calls.invoiceIds, [invoiceId]);
  assert.deepEqual(calls.proofInvoiceIds, [invoiceId]);
  assert.match(html, /1\.250\.000/);
  assert.match(html, /PAID/);
  assert.match(html, /transfer-proof\.jpg/);
  assert.match(html, /SUBMITTED/);
  assert.doesNotMatch(html, /private\/path|idempotency|Xác nhận khoản đã nhận|Duyệt chứng từ/);
});

test('Moderator global recipe list and detail render only backend values and contain no publish/sync actions', () => {
  const list = renderScreen('ModeratorRecipesScreen', 'menu');
  assert.match(list.html, /API Espresso/);
  assert.match(list.html, /GRIND:8s/);
  assert.match(list.html, /bean:6:12/);
  assert.match(list.html, new RegExp(`/moderator/menu/${recipeId}`));
  assert.doesNotMatch(list.html, /Cà phê sữa tươi|Thêm món|Gửi menu xuống máy/);

  const detail = renderScreen('ModeratorRecipesScreen', `menu/${recipeId}`);
  assert.deepEqual(detail.calls.recipeIds, [recipeId]);
  assert.match(detail.html, /BREW:25s/);
  assert.match(detail.html, /water:30:50/);
  assert.doesNotMatch(detail.html, /Lưu món|Gửi menu/);
});

test('buyback list is explicitly unavailable; only canonical UUID details make a read request', () => {
  const list = renderScreen('ModeratorBuybackScreen', 'buyback');
  assert.match(list.html, /chưa có API danh sách/i);
  assert.doesNotMatch(list.html, /MB-2026-017|MB-017|Nguyễn Minh Anh/);
  assert.deepEqual(list.calls.buybackIds, []);

  const legacy = renderScreen('ModeratorBuybackScreen', 'buyback/MB-2026-017');
  assert.deepEqual(legacy.calls.buybackIds, []);
  assert.match(legacy.html, /UUID/i);

  const detail = renderScreen('ModeratorBuybackScreen', `buyback/${buybackId}`);
  assert.deepEqual(detail.calls.buybackIds, [buybackId]);
  assert.match(detail.html, /Máy cần đổi mới/);
  assert.match(detail.html, /REQUESTED/);
  assert.doesNotMatch(detail.html, /idempotency-key|correlation-id|Ghi nhận|Tạo hồ sơ/);
});

test('Moderator dynamic read detail paths are accepted only for canonical UUIDs', () => {
  const paths = loadTypescript('src/routes/path.ts');
  const { isSupportedModeratorSection } = loadTypescript('src/routes/routes.ts', { './path': paths });

  assert.equal(isSupportedModeratorSection(`invoices/${invoiceId}`), true);
  assert.equal(isSupportedModeratorSection(`menu/${recipeId}`), true);
  assert.equal(isSupportedModeratorSection(`buyback/${buybackId}`), true);
  assert.equal(isSupportedModeratorSection('invoices/HD-09-204'), false);
  assert.equal(isSupportedModeratorSection('menu/espresso'), true);
  assert.equal(isSupportedModeratorSection('buyback/MB-2026-017'), true);
});
