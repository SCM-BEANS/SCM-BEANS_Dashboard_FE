const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { File } = require('node:buffer');
const test = require('node:test');
const ts = require('typescript');
const axios = require('axios');

const uuid = (suffix) => `00000000-0000-4000-8000-${String(suffix).padStart(12, '0')}`;
const ids = { owner: uuid(1), invoice: uuid(2), proof: uuid(3), payment: uuid(4), contract: uuid(5), line: uuid(6) };
const invoice = {
  id: ids.invoice,
  ownerId: ids.owner,
  contractId: ids.contract,
  type: 'RENTAL',
  amount: 500000,
  currency: 'VND',
  status: 'UNPAID',
  period: '2026-10',
  billingPeriodStart: '2026-10-01',
  billingPeriodEnd: '2026-10-31',
  dueDate: '2026-11-10',
  createdAt: '2026-10-31T10:00:00',
  paidAt: null,
};
const proof = {
  id: ids.proof,
  ownerId: ids.owner,
  invoiceId: ids.invoice,
  paymentId: ids.payment,
  originalFilename: 'transfer.pdf',
  contentType: 'application/pdf',
  sizeBytes: 128,
  sha256: 'a'.repeat(64),
  status: 'SUBMITTED',
  submittedBy: ids.owner,
  submittedAt: '2026-10-31T10:00:00',
  reviewedBy: null,
  reviewedAt: null,
  reviewReason: null,
};

function loadTypescript(relativePath, mocks = {}) {
  const fileName = join(__dirname, '..', relativePath);
  const source = readFileSync(fileName, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const mockedRequire = (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  const loaded = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(mockedRequire, loaded.exports, loaded);
  return loaded.exports;
}

const billingSchemas = loadTypescript('src/schema/billing.schema.ts');

function loadBillingApi(axiosClient) {
  return loadTypescript('src/apis/billing.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/billing.schema': billingSchemas,
  }).billingApi;
}

test('billing reads pass filters and pagination and validate the returned invoice scope', async () => {
  const calls = [];
  const responses = [
    { data: [invoice], headers: { 'x-page': '2', 'x-page-size': '10', 'x-has-next': 'true' } },
    { data: [{ id: ids.line, invoiceId: ids.invoice, description: 'Rental fee', amount: 500000 }], headers: { 'x-page': '0', 'x-page-size': '50', 'x-has-next': 'false' } },
    { data: [proof], headers: { 'x-page': '1', 'x-page-size': '25', 'x-has-next': 'false' } },
  ];
  const axiosClient = {
    get: async (url, config) => { calls.push({ url, config }); return responses.shift(); },
  };
  const api = loadBillingApi(axiosClient);

  assert.equal(billingSchemas.InvoiceListParamsSchema.safeParse({ type: 'REPAIR' }).success, true);
  assert.equal(billingSchemas.ModeratorInvoiceSchema.safeParse({ ...invoice, type: 'REPAIR' }).success, true);

  const invoicePage = await api.listOperatorInvoicesPage({ ownerId: ids.owner, period: '2026-10', status: 'UNPAID', type: 'RENTAL', page: 2, size: 10 });
  assert.deepEqual(invoicePage, { items: [invoice], page: 2, size: 10, hasNext: true });
  const linePage = await api.listInvoiceLineItemsPage(ids.invoice, { page: 0, size: 50 });
  assert.equal(linePage.items[0].invoiceId, ids.invoice);
  const proofPage = await api.listPaymentProofsPage(ids.invoice, { status: 'SUBMITTED', page: 1, size: 25 });
  assert.deepEqual(proofPage, { items: [proof], page: 1, size: 25, hasNext: false });
  assert.deepEqual(calls.map(({ url, config }) => [url, config.params]), [
    ['/billing/invoices', { ownerId: ids.owner, status: 'UNPAID', type: 'RENTAL', period: '2026-10', page: 2, size: 10 }],
    [`/billing/invoices/${ids.invoice}/line-items`, { page: 0, size: 50 }],
    [`/billing/invoices/${ids.invoice}/payment-proofs`, { status: 'SUBMITTED', page: 1, size: 25 }],
  ]);

  const mismatchedApi = loadBillingApi({
    get: async () => ({ data: [{ ...proof, invoiceId: ids.contract }], headers: {} }),
  });
  await assert.rejects(mismatchedApi.listPaymentProofsPage(ids.invoice), /different invoice/i);
});

test('payment proof upload validates MIME, file signature and size and forwards the same idempotency key for a retry', async () => {
  const calls = [];
  const axiosClient = {
    post: async (url, body, config) => { calls.push({ url, body, config }); return { data: proof }; },
  };
  const api = loadBillingApi(axiosClient);
  const file = new File([Buffer.from('%PDF-1.7\nprivate proof')], 'transfer.pdf', { type: 'application/pdf' });
  const result = await api.submitPaymentProof({ invoiceId: ids.invoice, amount: 500000, file, idempotencyKey: 'stable-proof-key' });
  assert.equal(result.id, ids.proof);
  const retryResult = await api.submitPaymentProof({ invoiceId: ids.invoice, amount: 500000, file, idempotencyKey: 'stable-proof-key' });
  assert.equal(retryResult.id, ids.proof);
  assert.equal(calls[0].url, `/billing/invoices/${ids.invoice}/payment-proofs`);
  assert.deepEqual(calls[0].config.params, { amount: 500000 });
  assert.deepEqual(calls[0].config.headers, {
    'Idempotency-Key': 'stable-proof-key',
    'Content-Type': 'multipart/form-data',
  });
  assert.deepEqual(calls[1].config.headers, calls[0].config.headers);
  assert.equal(calls[0].body.get('file').name, 'transfer.pdf');

  let transformedRequest;
  const axiosClientWithJsonDefault = axios.create({
    headers: { 'Content-Type': 'application/json' },
    adapter: async (config) => {
      transformedRequest = config;
      return { data: proof, status: 200, statusText: 'OK', headers: {}, config };
    },
  });
  const transformedApi = loadBillingApi(axiosClientWithJsonDefault);
  await transformedApi.submitPaymentProof({ invoiceId: ids.invoice, amount: 500000, file, idempotencyKey: 'browser-boundary-check' });
  assert.ok(transformedRequest.data instanceof FormData, 'Axios must preserve the multipart body instead of serializing it as JSON');
  assert.match(transformedRequest.headers.getContentType(), /^multipart\/form-data/i);
  assert.equal(transformedRequest.data.get('file').name, 'transfer.pdf');

  const badFile = new File(['not a pdf'], 'fake.pdf', { type: 'application/pdf' });
  await assert.rejects(api.submitPaymentProof({ invoiceId: ids.invoice, amount: 500000, file: badFile, idempotencyKey: 'another-key' }), /không khớp/i);
  const oversizedFile = new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' });
  await assert.rejects(api.submitPaymentProof({ invoiceId: ids.invoice, amount: 500000, file: oversizedFile, idempotencyKey: 'large-key' }), /20 MB/i);
  await assert.rejects(api.submitPaymentProof({ invoiceId: ids.invoice, amount: 500000, file, idempotencyKey: 'x'.repeat(129) }), /128 characters/i);
  assert.equal(calls.length, 2, 'invalid local proof input must not reach the API');
});

test('payment proof review sends the required decision and reason and checks the proof identity', async () => {
  const calls = [];
  const approvedProof = { ...proof, status: 'APPROVED', reviewedBy: 'admin-user', reviewedAt: '2026-10-31T12:00:00', reviewReason: 'Verified with bank transfer' };
  const api = loadBillingApi({
    post: async (url, body, config) => { calls.push({ url, body, config }); return { data: approvedProof }; },
  });

  const reviewed = await api.reviewPaymentProof({ proofId: ids.proof, approve: true, reason: '  Verified with bank transfer  ' });
  assert.equal(reviewed.status, 'APPROVED');
  assert.deepEqual(calls[0], {
    url: `/billing/payment-proofs/${ids.proof}/review`,
    body: { approve: true, reason: 'Verified with bank transfer' },
    config: { baseURL: '/api/dolores/v1' },
  });
  await assert.rejects(api.reviewPaymentProof({ proofId: ids.proof, approve: false, reason: '   ' }), /too_small|invalid/i);
});
