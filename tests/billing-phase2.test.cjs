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

function loadTypescript(relativePath, mocks = {}, extraSource = '') {
  const fileName = join(__dirname, '..', relativePath);
  const source = readFileSync(fileName, 'utf8') + extraSource;
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  });
  const mockedRequire = (id) => Object.hasOwn(mocks, id) ? mocks[id] : (id === "@/lib/evidence-multipart" ? require("./evidence-multipart-helper.cjs") : require(id));
  const loaded = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(mockedRequire, loaded.exports, loaded);
  return loaded.exports;
}

const billingSchemas = loadTypescript('src/schema/billing.schema.ts');

test('deposit collection conflicts explain the prerequisite without suggesting blind retries', () => {
  const { getBillingWorkflowErrorMessage } = loadTypescript('src/lib/api-errors.ts', {
    '@/constants/messages': loadTypescript('src/constants/messages.ts'),
  });
  for (const message of [
    'A verified DEPOSIT collection is required before reserving the Contract deposit',
    'A verified DEPOSIT collection is required for this Refund',
  ]) {
    const error = { isAxiosError: true, response: { status: 409, data: { message, correlationId: 'deposit-trace' } } };
    const text = getBillingWorkflowErrorMessage(error, 'mutation');
    assert.match(text, /Chưa xác minh được khoản tiền cọc/);
    assert.match(text, /đối soát đủ số dư hóa đơn/);
    assert.match(text, /deposit-trace/);
    assert.doesNotMatch(text, /Hãy tải lại rồi thử lại|A verified DEPOSIT/);
  }
  assert.match(getBillingWorkflowErrorMessage({ isAxiosError: true, response: { status: 409, data: { message: 'Other conflict' } } }, 'mutation'), /Other conflict/);
});

test('termination deposit lookup supports aggregated invoices and keeps reads and invoice links in each role scope', async () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const paths = loadTypescript('src/routes/path.ts');
  for (const role of ['OWNER', 'ADMIN', 'MODERATOR']) {
    let stateIndex = 0;
    const state = [true, '2026-10', '2026-10', 0, ids.invoice, 1];
    const queries = [];
    const calls = [];
    const aggregatedInvoice = { ...invoice, contractId: null, status: 'PAID' };
    const line = { id: ids.line, invoiceId: ids.invoice, ownerId: ids.owner, contractId: ids.contract, serviceCode: 'DEPOSIT', amount: 500000, description: 'Correct contract deposit' };
    let invoiceResponse = { items: [aggregatedInvoice], page: 0, hasNext: true };
    const api = {
      listInvoicesPage: async (params) => { calls.push(['invoices', params]); return invoiceResponse; },
      listInvoiceLineItemsPage: async (id, params) => { calls.push(['lines', id, params]); return { items: [line], page: 1, hasNext: false }; },
    };
    const mocks = {
      react: { ...React, useState: () => [state[stateIndex++], () => {}] },
      'next/router': {},
      'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children), __esModule: true },
      '@tanstack/react-query': { useQuery: (config) => {
        queries.push(config);
        return { isSuccess: true, data: config.queryKey[1] === 'deposit-collection' ? invoiceResponse : { items: [line, { ...line, id: uuid(60), contractId: uuid(61), description: 'Other contract deposit' }, { ...line, id: uuid(62), ownerId: uuid(63), description: 'Other owner deposit' }], hasNext: false } };
      } },
      '@/apis/contracts.api': {}, '@/apis/billing.api': { billingApi: api }, '@/apis/recall-work-orders.api': {},
      '@/components/button/button-bar': { ButtonBar: ({ children, ...props }) => React.createElement('button', props, children) },
      '@/components/contracts/termination-workflow-panel': {}, '@/components/navigation/back-button-heading': {}, '@/components/notification-dialog/notification-dialog': {},
      '@/components/table/data-table': { DataTable: ({ children }) => React.createElement('table', null, React.createElement('tbody', null, children)) },
      '@/components/features/repair-workflow/repair-workflow-query-identity': { querySubject: (role) => `${role}:test-user` },
      '@/lib/api-errors': {}, '@/schema/termination-cases.schema': {}, '@/schema/contracts.schema': {},
      '@/routes/path': paths, '@/text/admin/admin-operations-messages': {},
      './contract-termination-screen.module.css': {},
    };
    const { DepositCollectionSection } = loadTypescript('src/pages/contracts/termination/contract-termination-screen.tsx', mocks, '\nexport { DepositCollectionSection };');
    const markup = renderToStaticMarkup(React.createElement(DepositCollectionSection, { contractId: ids.contract, ownerId: ids.owner, depositAmount: 500000, startDate: '2026-10-01', role }));
    assert.match(markup, /Correct contract deposit/);
    assert.doesNotMatch(markup, /Other contract deposit|Other owner deposit/);
    assert.match(markup, /đây chưa phải xác nhận cọc đủ điều kiện hoàn/);
    const detail = role === 'OWNER' ? paths.PATH_CUSTOMER.INVOICE_DETAIL(ids.invoice) : role === 'ADMIN' ? paths.PATH_ADMIN.INVOICE_DETAIL(ids.invoice) : paths.PATH_MODERATOR.INVOICE_DETAIL(ids.invoice);
    assert.ok(markup.includes(`href="${detail}"`));
    await queries[0].queryFn({}); await queries[1].queryFn({});
    assert.deepEqual(calls[0][1], { ...(role === 'OWNER' ? {} : { ownerId: ids.owner }), type: 'RENTAL', period: '2026-10', page: 0, size: 50 });
    assert.deepEqual(calls[1], ['lines', ids.invoice, { page: 1, size: 100 }]);
    invoiceResponse = { ...invoiceResponse, items: [{ ...aggregatedInvoice, ownerId: uuid(99) }] };
    await assert.rejects(queries[0].queryFn({}), /không khớp khách hàng/);
  }
});

const refund = {
  id: uuid(20), terminationCaseId: null, ownerId: ids.owner, ownerName: null,
  contractId: ids.contract, invoiceId: ids.invoice, depositLedgerEntryId: null,
  refundKind: 'OVERPAYMENT', amount: 150000, currency: 'VND', status: 'REQUESTED',
  approvalRequiredRole: 'MODERATOR', reason: 'Excess payment', requestedBy: ids.owner,
  requestedAt: '2026-11-06T10:30:00', createdAt: '2026-11-06T10:30:00', updatedAt: '2026-11-06T10:30:00',
};

test('refund schemas accept all lifecycle states and reject unsupported financial requests', () => {
  for (const status of ['REQUESTED', 'TENANT_CONFIRMED', 'APPROVED', 'SUBMITTED', 'COMPLETED', 'REJECTED', 'FAILED', 'DISPUTED']) {
    assert.equal(billingSchemas.RefundDetailSchema.parse({ ...refund, status }).status, status);
  }
  const input = { ownerId: ids.owner, invoiceId: ids.invoice, refundKind: 'OVERPAYMENT', amount: 150000, currency: 'VND', reason: 'Excess payment', idempotencyKey: 'stable-key' };
  assert.equal(billingSchemas.RefundCreateRequestSchema.safeParse(input).success, true);
  for (const change of [{ amount: 0 }, { amount: -1 }, { currency: 'USD' }, { reason: ' ' }, { invoiceId: undefined }, { refundKind: 'ORDINARY' }, { refundKind: 'DEPOSIT' }, { correlationId: 'not-in-create-dto' }]) {
    assert.equal(billingSchemas.RefundCreateRequestSchema.safeParse({ ...input, ...change }).success, false);
  }
  assert.equal(billingSchemas.RefundReceiptRequestSchema.safeParse({ received: false, receivedAmount: 0 }).success, true);
  assert.equal(billingSchemas.RefundReceiptRequestSchema.safeParse({ received: true, receivedAmount: -1 }).success, false);
});

test('refund create and read validate financial identity and keep caller idempotency on retry', async () => {
  const calls = [];
  let response = refund;
  const api = loadBillingApi({
    post: async (...args) => { calls.push(args); return { data: response }; },
    get: async (...args) => { calls.push(args); return { data: response }; },
  });
  const input = { ownerId: ids.owner, contractId: ids.contract, invoiceId: ids.invoice, refundKind: 'OVERPAYMENT', amount: 150000, currency: 'VND', reason: 'Excess payment', idempotencyKey: 'stable-key' };
  await api.createRefund(input); await api.createRefund(input);
  assert.equal(calls[0][0], '/billing/refunds');
  assert.equal(calls[0][1].idempotencyKey, calls[1][1].idempotencyKey);
  assert.equal(Object.hasOwn(calls[0][1], 'correlationId'), false);
  await api.getRefund(refund.id);
  assert.equal(calls[2][0], `/billing/refunds/${refund.id}`);
  assert.equal(calls[2][1].headers['Cache-Control'], 'no-store');
  response = { ...refund, id: uuid(21) };
  await assert.rejects(api.getRefund(refund.id), /different Refund/);
  response = { ...refund, ownerId: uuid(99) };
  await assert.rejects(api.createRefund(input), /different payment source/);
});

test('refund actions use receipt instead of retired complete and reopen sends the stable header', async () => {
  const calls = [];
  const api = loadBillingApi({ post: async (...args) => { calls.push(args); return { data: refund }; } });
  await api.confirmRefund(refund.id);
  await api.approveRefund(refund.id);
  await api.rejectRefund(refund.id, 'Incorrect source');
  await api.failRefund(refund.id, 'Transfer failed');
  await api.reopenRefund(refund.id, 'Recheck account', 'reopen-stable');
  await api.recordRefundReceipt(refund.id, { received: false, receivedAmount: 100000, note: 'Not enough' });
  assert.deepEqual(calls.map(([url]) => url), ['confirm', 'approve', 'reject', 'fail', 'reopen', 'receipt'].map((action) => `/billing/refunds/${refund.id}/${action}`));
  assert.equal(calls[0][1], undefined);
  assert.equal(calls[1][1], undefined);
  assert.equal(calls[4][2].headers['Idempotency-Key'], 'reopen-stable');
  assert.deepEqual(calls[5][1], { received: false, receivedAmount: 100000, note: 'Not enough' });
});

test('refund evidence is private multipart and overdue results honor scope and pagination', async () => {
  const calls = [];
  const evidence = { id: uuid(22), originalFilename: 'payout.pdf', contentType: 'application/pdf', sizeBytes: 6, sha256: 'a'.repeat(64), uploadedBy: uuid(23), uploadedAt: '2026-11-06T10:30:00' };
  const api = loadBillingApi({
    post: async (...args) => { calls.push(args); return { data: evidence }; },
    get: async (...args) => { calls.push(args); return args[0].endsWith('/overdue') ? { data: [refund], headers: { 'x-page': '2', 'x-page-size': '50', 'x-has-next': 'true' } } : { data: new Blob(['private']) }; },
  });
  const file = new File([Buffer.from('%PDF-1')], 'payout.pdf', { type: 'application/pdf' });
  assert.equal((await api.submitRefundTransferEvidence(refund.id, file)).id, evidence.id);
  assert.equal(calls[0][1] instanceof FormData, true);
  assert.equal(calls[0][1].get('file').name, 'payout.pdf');
  assert.equal(await api.downloadRefundEvidence(refund.id, evidence.id) instanceof Blob, true);
  assert.equal(calls[1][0], `/billing/refunds/${refund.id}/evidence/${evidence.id}`);
  assert.equal(calls[1][1].responseType, 'blob');
  const page = await api.listOverdueRefunds({ ownerId: ids.owner, page: 2, size: 50 });
  assert.deepEqual([page.page, page.size, page.hasNext], [2, 50, true]);
  await assert.rejects(api.listOverdueRefunds({ ownerId: uuid(99) }), /outside.*scope/);
});

function loadBillingApi(axiosClient) {
  return loadTypescript('src/apis/billing.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/billing.schema': billingSchemas,
    '@/schema/contracts.schema': { ContractIdSchema: require('zod').z.string().uuid() },
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
