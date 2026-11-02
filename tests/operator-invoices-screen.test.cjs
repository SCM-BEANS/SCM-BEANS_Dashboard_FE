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
    '@tanstack/react-query': {
      useQuery,
      useMutation: () => ({ mutate: () => {}, isPending: false, isError: false, isSuccess: false }),
      useQueryClient: () => ({ invalidateQueries: async () => {} }),
    },
    '@/apis/billing.api': { billingApi: {} },
    '@/lib/api-errors': { getApiErrorMessage: (error) => String(error?.message ?? ''), isUncertainApiMutation: () => false },
    '@/schema/billing.schema': loadTypescript('src/schema/billing.schema.ts'),
    '@/components/features/repair-workflow/repair-workflow-query-identity': {
      querySubject: (role) => `${role}:test-subject`,
    },
    '@/routes/path': loadTypescript('src/routes/path.ts'),
    '@/text/billing/billing-messages': loadTypescript('src/text/billing/billing-messages.ts'),
    '@/components/table/data-table': { DataTable },
    '@/components/notification-dialog/notification-dialog': {
      NotificationDialog: ({ title, children }) => React.createElement('dialog', null, title, children),
    },
    './operator-invoices-screen.module.css': styles,
    'next/link': ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children),
  });

  return {
    queryOptions,
    render: (props) => renderToStaticMarkup(React.createElement(module.OperatorInvoicesScreen, props)),
  };
}

test('operator invoice list is paged, uses the Admin route, and does not fan out proof reads', () => {
  const filters = { ownerId: '', period: '', status: '', type: '' };
  const key = JSON.stringify(['billing', 'operator', 'invoices', 'admin:test-subject', filters, 0]);
  const screen = makeScreen(new Map([[key, {
    data: { items: [invoice], page: 0, size: 50, hasNext: true },
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
  assert.match(html, /Tải chứng từ/);
  assert.match(html, /aria-label="Phân trang dòng phí"/);
  assert.match(html, /aria-label="Phân trang chứng từ thanh toán"/);
  assert.match(html, new RegExp(`/moderator/invoices`));
  assert.doesNotMatch(html, /private\/payment-proofs\/should-not-render/);
});
