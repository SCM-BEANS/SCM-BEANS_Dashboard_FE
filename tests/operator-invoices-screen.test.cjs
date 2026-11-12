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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const loaded = { exports: {} };
  const mockedRequire = (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  new Function('require', 'exports', 'module', outputText)(mockedRequire, loaded.exports, loaded);
  return loaded.exports;
}

const invoiceId = '00000000-0000-4000-8000-000000000002';
const proofId = '00000000-0000-4000-8000-000000000003';
const ownerId = '00000000-0000-4000-8000-000000000001';
const invoice = {
  id: invoiceId,
  ownerId,
  contractId: '00000000-0000-4000-8000-000000000004',
  type: 'REPAIR',
  amount: 1250000,
  currency: 'VND',
  status: 'UNPAID',
  period: '2026-10',
  dueDate: '2026-11-10',
  paidAt: null,
};

test('hold-to-confirm fills in 1.2 seconds and backs off faster when released', () => {
  const { ButtonBar, advanceHoldProgress } = loadTypescript('src/components/button/button-bar.tsx', {
    'next/link': {},
    './button-bar.module.css': new Proxy({}, { get: (_target, key) => String(key) }),
  });

  assert.equal(advanceHoldProgress(0, 600, true), 0.5);
  assert.equal(advanceHoldProgress(0, 1200, true), 1);
  assert.equal(advanceHoldProgress(0.5, 125, false), 0.25);
  assert.equal(advanceHoldProgress(0.1, 1000, false), 0);

  const html = renderToStaticMarkup(React.createElement(ButtonBar, { type: 'button', holdToConfirm: true, children: 'Xác nhận xóa' }));
  assert.match(html, /aria-describedby=/);
  assert.match(html, /Nhấn giữ 1,2 giây để xác nhận/);
  assert.doesNotMatch(html, /aria-description=/);
});
const proof = {
  id: proofId,
  invoiceId,
  ownerId,
  paymentId: '00000000-0000-4000-8000-000000000005',
  originalFilename: 'transfer.pdf',
  contentType: 'application/pdf',
  sizeBytes: 4096,
  sha256: 'a'.repeat(64),
  status: 'SUBMITTED',
  submittedBy: ownerId,
  submittedAt: '2026-10-31T10:00:00',
  reviewedBy: null,
  reviewedAt: null,
  reviewReason: null,
  objectKey: 'private/payment-proofs/should-not-render',
};

function makeScreen(queryResults) {
  const queryOptions = [];
  const invoiceRequests = [];
  const customerOptions = [];
  const ownerLookups = [];
  const styles = new Proxy({}, { get: (_target, key) => String(key) });
  const useQuery = (options) => {
    queryOptions.push(options);
    return queryResults.get(JSON.stringify(options.queryKey)) ?? {
      data: undefined,
      isPending: options.enabled !== false,
      isError: false,
      error: null,
      isFetching: false,
      isSuccess: false,
      refetch: async () => {},
    };
  };
  const DataTable = ({ columns, rows, variant }) => React.createElement('table', { 'data-variant': variant },
    React.createElement('thead', null, React.createElement('tr', null, columns.map((column) => React.createElement('th', { key: column.key }, column.header)))),
    React.createElement('tbody', null, rows.map((row, rowIndex) => React.createElement('tr', { key: String(rowIndex) },
      columns.map((column) => React.createElement('td', { key: column.key }, column.render(row, rowIndex)))))));
  const module = loadTypescript('src/components/features/billing/operator-invoices-screen.tsx', {
    'next/router': { useRouter: () => ({ push: async () => {} }) },
    '@/components/action-bar/page-actions': { PageActions: () => null },
    '@/components/action-bar/entity-page-actions': loadTypescript('src/components/action-bar/entity-page-actions.ts'),
    '@/components/action-bar/page-actions-renderer': { PageActionsRenderer: ({ actions }) => React.createElement('div', null, actions.map((action) => React.createElement('button', { key: action.id, disabled: action.disabled, onClick: action.onClick }, action.label))) },
    '@tanstack/react-query': {
      useQuery,
      useInfiniteQuery: (options) => { customerOptions.push(options); return { data: { pages: [{ items: [{ idaasUserId: ownerId, fullName: 'Khách hàng kiểm thử', email: 'owner@example.com' }], page: 0, totalPages: 1 }] }, isPending: false, isError: false, hasNextPage: false }; },
      useMutation: () => ({ mutate: () => {}, isPending: false, isError: false, isSuccess: false }),
      useQueryClient: () => ({ invalidateQueries: async () => {} }),
    },
    '@/apis/billing.api': { billingApi: {
      listOperatorInvoicesPage: async (params) => { invoiceRequests.push({ ...params, scope: 'operator' }); return { items: [], page: params.page, size: params.size, hasNext: false }; },
      listInvoicesPage: async (params) => { invoiceRequests.push({ ...params, scope: 'owner' }); return { items: [], page: params.page, size: params.size, hasNext: false }; },
      getInvoice: async (id) => { invoiceRequests.push({ id, scope: 'owner-detail' }); return invoice; },
    } },
    '@/apis/profiles.api': { profilesApi: {} },
    '@/hooks/use-owner-names': { useOwnerNames: (ids) => { ownerLookups.push(ids); return { data: { [ownerId]: 'Khách hàng kiểm thử' } }; } },
    '@/components/button/button-bar': {
      ButtonBar: ({ children, href, rollingLabel, variant, ...props }) => React.createElement(href ? 'a' : 'button', { ...props, ...(href ? { href } : {}) }, children),
      ProgressDownloadButton: ({ children, filename }) => React.createElement('button', { 'aria-label': `${children} ${filename}`, 'data-download-effect': true }, children),
    },
    '@/lib/api-errors': { getApiErrorMessage: (error) => String(error?.message ?? ''), isUncertainApiMutation: () => false },
    '@/schema/billing.schema': loadTypescript('src/schema/billing.schema.ts'),
    '@/components/features/repair-workflow/repair-workflow-query-identity': {
      querySubject: (role) => `${role}:test-subject`,
    },
    '@/routes/path': loadTypescript('src/routes/path.ts'),
    '@/text/billing/billing-messages': loadTypescript('src/text/billing/billing-messages.ts'),
    '@/components/table/data-table': { DataTable },
    '@/components/table/table-filters': { TableFilters: ({ children }) => React.createElement('div', null, children) },
    '@/components/status-badge/status-badge': { StatusBadge: ({ children }) => React.createElement('span', null, children) },
    '@/components/truncated-id/truncated-id': { TruncatedId: ({ value }) => React.createElement('span', null, value ?? '—') },
    './invoice-refund-panel': { InvoiceRefundPanel: () => React.createElement('section', { 'aria-label': 'Hoàn khoản thanh toán dư' }) },
    '@/components/notification-dialog/notification-dialog': {
      NotificationDialog: ({ title, children }) => React.createElement('dialog', null, title, children),
    },
    './operator-invoices-screen.module.css': styles,
    'next/link': ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children),
  });

  return {
    queryOptions,
    invoiceRequests,
    customerOptions,
    ownerLookups,
    render: (props) => renderToStaticMarkup(React.createElement(module.OperatorInvoicesScreen, props)),
    renderExport: (props) => renderToStaticMarkup(React.createElement(module.InvoiceExportJobScreen, props)),
  };
}

test('operator invoice list is paged, uses the Admin route, and does not fan out proof reads', async () => {
  const filters = { ownerId: '', period: '', status: '', type: '' };
  const key = JSON.stringify(['billing', 'operator', 'invoices', 'admin:test-subject', filters, 0]);
  const screen = makeScreen(new Map([[key, {
    data: { items: [invoice], page: 0, size: 10, hasNext: true },
    isPending: false,
    isError: false,
    error: null,
    isFetching: false,
    refetch: async () => {},
  }]]));

  const html = screen.render({ role: 'admin' });
  assert.match(html, /1\.250\.000/);
  assert.match(html, /Sửa chữa/);
  assert.match(html, new RegExp(`/admin/invoices/${invoiceId}`));
  assert.match(html, /aria-label="Phân trang hóa đơn"/);
  assert.equal(screen.queryOptions.length, 1);
  assert.deepEqual(screen.queryOptions[0].queryKey, ['billing', 'operator', 'invoices', 'admin:test-subject', filters, 0]);
  await screen.queryOptions[0].queryFn({ signal: undefined });
  assert.equal(screen.invoiceRequests[0].size, 10);
  assert.match(html, /data-variant="accounts"/);
  assert.match(html, /Mở hồ sơ/);
  assert.equal(screen.customerOptions[0].getNextPageParam({ page: 0, totalPages: 3 }), 1);
  assert.equal(screen.customerOptions[0].getNextPageParam({ page: 2, totalPages: 3 }), undefined);
});

test('operator invoice detail displays private proof metadata and exposes review only while submitted', () => {
  const screen = makeScreen(new Map([
    [JSON.stringify(['billing', 'operator', 'invoices', 'moderator:test-subject', 'detail', invoiceId]), {
      data: invoice, isPending: false, isError: false, error: null, isSuccess: true, refetch: async () => {},
    }],
    [JSON.stringify(['billing', 'operator', 'invoices', 'moderator:test-subject', invoiceId, 'lines', 0]), {
      data: { items: [{ id: 'line-1', invoiceId, description: 'Repair', quantity: 1, amount: 1250000 }], page: 0, size: 50, hasNext: false },
      isPending: false, isError: false, error: null, isFetching: false, refetch: async () => {},
    }],
    [JSON.stringify(['billing', 'operator', 'invoices', 'moderator:test-subject', invoiceId, 'proofs', 0]), {
      data: { items: [proof], page: 0, size: 50, hasNext: false },
      isPending: false, isError: false, error: null, isFetching: false, refetch: async () => {},
    }],
  ]));

  const html = screen.render({ role: 'moderator', invoiceId });
  assert.match(html, /transfer\.pdf/);
  assert.match(html, /Duyệt chứng từ/);
  assert.match(html, /Từ chối chứng từ/);
  assert.match(html, /Tải xuống/);
  assert.match(html, /Xem chứng từ/);
  assert.match(html, /Thông tin tệp/);
  assert.match(html, /aria-label="Nội dung hồ sơ hóa đơn"/);
  assert.doesNotMatch(html, /aria-label="Phân trang dòng phí"/);
  assert.doesNotMatch(html, /aria-label="Phân trang chứng từ thanh toán"/);
  assert.match(html, /Xử lý hóa đơn/);
  assert.match(html, /Hủy hóa đơn/);
  assert.match(html, /data-download-effect="true"/);
  assert.match(html, new RegExp(`/moderator/invoices`));
  assert.doesNotMatch(html, /private\/payment-proofs\/should-not-render/);
  assert.equal(screen.queryOptions.find((query) => query.queryKey.includes('proof-preview')).enabled, false);
});

test('export stays visible while invoices are loading and ready exports use the shared download effect', () => {
  const pending = makeScreen(new Map());
  assert.match(pending.render({ role: 'admin' }), /Xuất danh sách/);
  const jobId = '00000000-0000-4000-8000-000000000010';
  for (const role of ['admin', 'moderator']) {
    const ready = makeScreen(new Map([[JSON.stringify(['billing', `${role}:test-subject`, 'export-job', jobId]), {
      data: { id: jobId, status: 'COMPLETED', format: 'PDF', invoiceCount: 3 }, isPending: false, isError: false,
    }]]));
    const html = ready.renderExport({ jobId, role, routerReady: true });
    assert.match(html, /dolores-invoices\.pdf/);
    assert.match(html, /Đã sẵn sàng/);
    assert.match(html, /data-download-effect="true"/);
    assert.match(html, new RegExp(`/${role}/invoices`));
  }
});

test('invoice amounts retain fractional VND used for reconciliation', () => {
  const screen = makeScreen(new Map([[JSON.stringify(['billing', 'operator', 'invoices', 'admin:test-subject', 'detail', invoiceId]), {
    data: { ...invoice, amount: 423000.5 }, isPending: false, isError: false, isSuccess: true,
  }]]));
  const html = screen.render({ role: 'admin', invoiceId });
  assert.match(html, /423\.000,5/);
  assert.doesNotMatch(html, /423\.001/);
});

test('owner list uses ten-row owner API and never loads customer options or names', async () => {
  const filters = { ownerId: '', period: '2026-11', status: '', type: '' };
  const screen = makeScreen(new Map([[JSON.stringify(['billing', 'operator', 'invoices', 'owner:test-subject', filters, 0]), {
    data: { items: [invoice], page: 0, size: 10, hasNext: true }, isPending: false, isError: false, isFetching: false,
  }]]));
  const html = screen.render({ role: 'owner', initialPeriod: '2026-11' });
  assert.match(html, new RegExp(`/dashboard/invoices/${invoiceId}`));
  assert.equal(screen.customerOptions[0].enabled, false);
  assert.deepEqual(screen.ownerLookups, [[]]);
  await screen.queryOptions[0].queryFn({ signal: undefined });
  assert.deepEqual(screen.invoiceRequests, [{ period: '2026-11', page: 0, size: 10, scope: 'owner' }]);
});

test('owner detail keeps payment and downloads but exposes no operator review or status controls', async () => {
  const screen = makeScreen(new Map([
    [JSON.stringify(['owner-invoice', invoiceId, 'owner:test-subject']), {
      data: { ...invoice, amount: 423000.5 }, isPending: false, isError: false, isSuccess: true,
    }],
    [JSON.stringify(['owner-invoice-proofs', invoiceId, 'owner:test-subject', 0]), {
      data: { items: [proof], page: 0, size: 10, hasNext: false }, isPending: false, isError: false,
    }],
  ]));
  const html = screen.render({ role: 'owner', invoiceId, paymentForm: React.createElement('form', { 'data-owner-upload': true }) });
  assert.match(html, /data-owner-upload="true"/);
  assert.match(html, /data-download-effect="true"/);
  assert.match(html, /423\.000,5/);
  assert.match(html, /title="transfer.pdf"/);
  assert.doesNotMatch(html, /Duyệt chứng từ|Từ chối chứng từ|Hủy hóa đơn|Xử lý hóa đơn/);
  assert.deepEqual(screen.ownerLookups, [[]]);
  await screen.queryOptions.find((query) => query.queryKey[0] === 'owner-invoice').queryFn({ signal: undefined });
  assert.deepEqual(screen.invoiceRequests, [{ id: invoiceId, scope: 'owner-detail' }]);
});
