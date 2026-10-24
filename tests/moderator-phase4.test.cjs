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
  paidAt: '2026-10-20T10:00:00Z',
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
  submittedAt: '2026-10-20T10:00:00Z',
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
  reason: 'Machine replacement requested',
  requestedBy: 'tenant@example.test',
  requestedAt: '2026-10-20T10:00:00Z',
  approvedBy: null,
  approvedAt: null,
  rejectedBy: null,
  rejectedAt: null,
  rejectionReason: null,
  cancelledBy: null,
  cancelledAt: null,
  cancellationReason: null,
  collectionEvidence: 'private/evidence/path.pdf',
  collectedBy: null,
  collectedAt: null,
  idempotencyKey: 'private-idempotency-key',
  correlationId: 'private-correlation-id',
  createdAt: '2026-10-20T10:00:00Z',
  updatedAt: '2026-10-20T10:00:00Z',
  version: 0,
};

function query(data, overrides = {}) {
  return {
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: async () => {},
    ...overrides,
  };
}

function loadScreen(exportName, queryResults = {}) {
  const options = [];
  const styles = new Proxy({}, { get: (_target, key) => String(key) });
  const useQuery = (queryOptions) => {
    options.push(queryOptions);
    return queryResults[JSON.stringify(queryOptions.queryKey)] ??
      query(undefined, { isPending: queryOptions.enabled !== false });
  };
  const screenModule = loadTypescript('src/pages/moderator/moderator-finance-catalog-screens.tsx', {
    '@tanstack/react-query': { useQuery },
    'next/link': ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children),
    '@/apis/billing.api': { billingApi: {
      listModeratorInvoices: async () => [invoice],
      getModeratorInvoice: async () => invoice,
      listPaymentProofs: async () => [proof],
      downloadPaymentProofContent: async () => new Blob(['proof']),
    } },
    '@/apis/buybacks.api': { buybacksApi: { getById: async () => buybackCase } },
    '@/apis/recipes.api': { recipesApi: {
      listGlobal: async () => [recipe],
      getGlobalById: async () => recipe,
    } },
    '@/schema/buybacks.schema': loadTypescript('src/schema/buybacks.schema.ts'),
    '@/schema/billing.schema': loadTypescript('src/schema/billing.schema.ts'),
    '@/schema/recipes.schema': loadTypescript('src/schema/recipes.schema.ts'),
    '@/text/moderator/moderator-messages': loadTypescript('src/text/moderator/moderator-messages.ts'),
    '@/routes/path': loadTypescript('src/routes/path.ts'),
    './moderator-shell': { moderatorStyles: styles },
  });
  return {
    options,
    html: (props) => renderToStaticMarkup(React.createElement(screenModule[exportName], props)),
  };
}

test('Phase 4 schemas validate read records and strip private storage/correlation fields', () => {
  const billing = loadTypescript('src/schema/billing.schema.ts');
  const recipes = loadTypescript('src/schema/recipes.schema.ts');
  const buybacks = loadTypescript('src/schema/buybacks.schema.ts');

  assert.equal(billing.ModeratorInvoiceSchema.parse(invoice).amount, 1250000);
  assert.equal(billing.ModeratorInvoiceSchema.safeParse({ ...invoice, amount: '1250000' }).success, false);
  assert.equal(billing.ModeratorInvoiceSchema.safeParse({ ...invoice, status: 'SETTLED_BY_ADMIN' }).success, false);
  const parsedProof = billing.PaymentProofSchema.parse(proof);
  assert.equal(parsedProof.originalFilename, 'transfer-proof.jpg');
  assert.equal(Object.hasOwn(parsedProof, 'objectKey'), false);
  assert.equal(billing.PaymentProofSchema.safeParse({ ...proof, status: 'APPROVED_BY_ADMIN' }).success, false);
  assert.equal(recipes.GlobalRecipeSchema.parse(recipe).id, recipeId);
  const parsedBuyback = buybacks.BuybackCaseSchema.parse(buybackCase);
  assert.equal(parsedBuyback.requestedPrice, 4000000);
  assert.equal(Object.hasOwn(parsedBuyback, 'idempotencyKey'), false);
  assert.equal(Object.hasOwn(parsedBuyback, 'correlationId'), false);
  assert.equal(buybacks.BuybackCaseSchema.safeParse({ ...buybackCase, id: 'MB-2026-017' }).success, false);
});

test('billing API uses only documented GET routes, checks UUID identity and invoice proof scope', async () => {
  const schemas = loadTypescript('src/schema/billing.schema.ts');
  const calls = [];
  const responses = [[invoice], invoice, [proof], new Blob(['proof'])];
  const axiosClient = {
    async get(url, config) {
      calls.push({ method: 'GET', url, config });
      return { data: responses.shift() };
    },
  };
  const { billingApi } = loadTypescript('src/apis/billing.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/billing.schema': schemas,
  });
  const signal = new AbortController().signal;

  assert.deepEqual(await billingApi.listModeratorInvoices(signal), [invoice]);
  assert.deepEqual(await billingApi.getModeratorInvoice(invoiceId, signal), schemas.ModeratorInvoiceSchema.parse(invoice));
  assert.deepEqual(await billingApi.listPaymentProofs(invoiceId, signal), [schemas.PaymentProofSchema.parse(proof)]);
  assert.equal(await billingApi.downloadPaymentProofContent(proofId, signal).then((blob) => blob.text()), 'proof');
  assert.deepEqual(calls.map(({ method, url, config }) => [
    method, url, config.baseURL, config.signal, config.responseType, config.headers,
  ]), [
    ['GET', '/billing/invoices', '/api/dolores/v1', signal, undefined, undefined],
    ['GET', '/billing/invoices/' + invoiceId, '/api/dolores/v1', signal, undefined, undefined],
    ['GET', '/billing/invoices/' + invoiceId + '/payment-proofs', '/api/dolores/v1', signal, undefined, undefined],
    ['GET', '/billing/payment-proofs/' + proofId + '/content', '/api/dolores/v1', signal, 'blob', { Accept: '*/*' }],
  ]);

  const callCount = calls.length;
  await assert.rejects(billingApi.getModeratorInvoice('not-a-uuid'), /uuid/i);
  await assert.rejects(billingApi.listPaymentProofs('not-a-uuid'), /uuid/i);
  await assert.rejects(billingApi.downloadPaymentProofContent('not-a-uuid'), /uuid/i);
  assert.equal(calls.length, callCount);

  const mismatchCalls = [];
  const mismatchApi = loadTypescript('src/apis/billing.api.ts', {
    '@/lib/http': {
      DOLORES_API_BASE_URL: '/api/dolores/v1',
      axiosClient: { get: async (url) => { mismatchCalls.push(url); return { data: { ...invoice, id: proofId } }; } },
    },
    '@/schema/billing.schema': schemas,
  }).billingApi;
  await assert.rejects(mismatchApi.getModeratorInvoice(invoiceId), /does not match/i);
  assert.deepEqual(mismatchCalls, ['/billing/invoices/' + invoiceId]);

  const wrongProofScopeApi = loadTypescript('src/apis/billing.api.ts', {
    '@/lib/http': {
      DOLORES_API_BASE_URL: '/api/dolores/v1',
      axiosClient: { get: async () => ({ data: [{ ...proof, invoiceId: contractId }] }) },
    },
    '@/schema/billing.schema': schemas,
  }).billingApi;
  await assert.rejects(wrongProofScopeApi.listPaymentProofs(invoiceId), /different invoice/i);
});

test('buyback client has UUID detail only and never invents a collection request', async () => {
  const schemas = loadTypescript('src/schema/buybacks.schema.ts');
  const calls = [];
  const { buybacksApi } = loadTypescript('src/apis/buybacks.api.ts', {
    '@/lib/http': {
      DOLORES_API_BASE_URL: '/api/dolores/v1',
      axiosClient: { get: async (url, config) => { calls.push({ url, config }); return { data: buybackCase }; } },
    },
    '@/schema/buybacks.schema': schemas,
  });
  const signal = new AbortController().signal;

  assert.equal((await buybacksApi.getById(buybackId, signal)).id, buybackId);
  assert.deepEqual(calls.map(({ url, config }) => [url, config.baseURL, config.signal]), [
    ['/buybacks/' + buybackId, '/api/dolores/v1', signal],
  ]);
  assert.deepEqual(Object.keys(buybacksApi), ['getById']);
  await assert.rejects(buybacksApi.getById('MB-2026-017'), /uuid/i);
  assert.equal(calls.length, 1);
});

test('Moderator invoice list renders backend values and keeps a 403 distinct from empty', () => {
  const listKey = JSON.stringify(['dolores', 'moderator', 'billing', 'invoices']);
  const screen = loadScreen('ModeratorInvoicesScreen', {
    [listKey]: query([invoice]),
  });
  const html = screen.html({ sectionPath: 'invoices' });

  assert.match(html, /1\.250\.000 VND/);
  assert.match(html, /PAID/);
  assert.match(html, /2026-10/);
  assert.match(html, new RegExp('/moderator/invoices/' + invoiceId));
  assert.equal(screen.options[0].enabled, true);
  assert.equal(screen.options[1].enabled, false);

  const forbidden = Object.assign(new Error('forbidden'), {
    isAxiosError: true,
    response: { status: 403 },
  });
  const forbiddenScreen = loadScreen('ModeratorInvoicesScreen', {
    [listKey]: query(undefined, { isError: true, error: forbidden }),
  });
  const forbiddenHtml = forbiddenScreen.html({ sectionPath: 'invoices' });
  assert.match(forbiddenHtml, /không có quyền đọc/i);
  assert.doesNotMatch(forbiddenHtml, /không trả về hóa đơn nào/i);
});

test('invoice detail renders proof metadata and never exposes private object keys', () => {
  const invoiceKey = JSON.stringify(['dolores', 'moderator', 'billing', 'invoice', invoiceId]);
  const proofsKey = JSON.stringify(['dolores', 'moderator', 'billing', 'invoice', invoiceId, 'proofs']);
  const screen = loadScreen('ModeratorInvoicesScreen', {
    [invoiceKey]: query(invoice),
    [proofsKey]: query([proof]),
  });
  const html = screen.html({ sectionPath: 'invoices/' + invoiceId });

  assert.match(html, /PAID/);
  assert.match(html, /transfer-proof\.jpg/);
  assert.match(html, /Tải chứng từ/);
  assert.doesNotMatch(html, /private\/path\/should-not-render\.jpg/);
  assert.equal(screen.options[0].enabled, false);
  assert.equal(screen.options[1].enabled, true);
  assert.equal(screen.options[2].enabled, true);

  const invalid = loadScreen('ModeratorInvoicesScreen');
  assert.match(invalid.html({ sectionPath: 'invoices/HD-09-204' }), /không phải UUID hợp lệ/i);
  assert.equal(invalid.options[1].enabled, false);
  assert.equal(invalid.options[2].enabled, false);
});

test('global recipes are read-only; list and detail show Dolores values', () => {
  const listKey = JSON.stringify(['dolores', 'moderator', 'recipes', 'global']);
  const detailKey = JSON.stringify(['dolores', 'moderator', 'recipes', 'global', recipeId]);
  const list = loadScreen('ModeratorRecipesScreen', { [listKey]: query([recipe]) });
  const listHtml = list.html({ sectionPath: 'menu' });
  assert.match(listHtml, /API Espresso/);
  assert.match(listHtml, new RegExp('/moderator/menu/' + recipeId));
  assert.doesNotMatch(listHtml, /<button/);

  const detail = loadScreen('ModeratorRecipesScreen', { [detailKey]: query(recipe) });
  const detailHtml = detail.html({ sectionPath: 'menu/' + recipeId });
  assert.match(detailHtml, /GRIND:8s/);
  assert.match(detailHtml, /bean:6:12/);
  assert.equal(detail.options[1].enabled, true);

  const invalid = loadScreen('ModeratorRecipesScreen');
  assert.match(invalid.html({ sectionPath: 'menu/add' }), /không phải UUID hợp lệ/i);
  assert.equal(invalid.options[1].enabled, false);
});

test('buyback list is unavailable and only a valid UUID detail can query Dolores', () => {
  const list = loadScreen('ModeratorBuybackScreen');
  const listHtml = list.html({ sectionPath: 'buyback' });
  assert.match(listHtml, /chưa có API danh sách/i);
  assert.equal(list.options[0].enabled, false);

  const detailKey = JSON.stringify(['dolores', 'moderator', 'buybacks', buybackId]);
  const detail = loadScreen('ModeratorBuybackScreen', { [detailKey]: query(buybackCase) });
  const detailHtml = detail.html({ sectionPath: 'buyback/' + buybackId });
  assert.match(detailHtml, /4\.000\.000 VND/);
  assert.match(detailHtml, /Đã có chứng cứ/);
  assert.doesNotMatch(detailHtml, /private\/evidence\/path\.pdf/);
  assert.doesNotMatch(detailHtml, /private-idempotency-key|private-correlation-id/);
  assert.equal(detail.options[0].enabled, true);

  const legacy = loadScreen('ModeratorBuybackScreen');
  assert.match(legacy.html({ sectionPath: 'buyback/MB-2026-017' }), /dữ liệu mẫu cũ/i);
  assert.equal(legacy.options[0].enabled, false);
});

test('route read allowlist includes only Phase 4 read paths and leaves write sections pending', () => {
  const route = loadTypescript('src/pages/moderator/[[...sections]].page.tsx', {
    '@/routes/routes': { isSupportedModeratorSection: () => true, MODERATOR_NAVIGATION_LINKS: [] },
    '@/routes/path': loadTypescript('src/routes/path.ts'),
    '@/text/moderator/moderator-messages': loadTypescript('src/text/moderator/moderator-messages.ts'),
    './moderator-shell': {
      ModeratorShell: ({ children }) => React.createElement(React.Fragment, null, children),
      moderatorStyles: new Proxy({}, { get: (_target, key) => String(key) }),
    },
  });

  assert.equal(route.isModeratorReadRoute('invoices'), true);
  assert.equal(route.isModeratorReadRoute('invoices/' + invoiceId), true);
  assert.equal(route.isModeratorReadRoute('invoices/reconcile'), false);
  assert.equal(route.isModeratorReadRoute('menu'), true);
  assert.equal(route.isModeratorReadRoute('menu/' + recipeId), true);
  assert.equal(route.isModeratorReadRoute('menu/add'), false);
  assert.equal(route.isModeratorReadRoute('buyback'), true);
  assert.equal(route.isModeratorReadRoute('buyback/MB-2026-017'), true);
  assert.equal(route.isModeratorReadRoute('buyback/documents'), false);
});
