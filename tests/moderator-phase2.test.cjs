const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');
const { ZodError } = require('zod');

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
  const module = { exports: {} };
  const mockedRequire = (id) => Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : require(id);
  new Function('require', 'exports', 'module', outputText)(mockedRequire, module.exports, module);
  return module.exports;
}

const tenantId = '00000000-0000-4000-8000-000000000101';
const otherTenantId = '00000000-0000-4000-8000-000000000102';
const contractId = '00000000-0000-4000-8000-000000000201';
const documentId = '00000000-0000-4000-8000-000000000301';
const tenant = { id: tenantId, name: 'Cà phê kiểm thử', type: 'contract_owner', billingExempt: false };
const contract = {
  id: contractId,
  tenantId,
  machineId: null,
  endDate: '2027-03-01',
  startDate: '2026-03-01',
  terms: 'API terms',
  monthlyRentalFee: 750000,
  machineTypeSnapshot: 'CONVENTIONAL',
  depositAmount: '10000000.00',
  installationFee: null,
  paygUnitPrice: null,
  offlineLimitMinutes: null,
  termsSnapshot: null,
  status: 'ACTIVE',
  legacyUnmapped: false,
};
const document = {
  id: documentId,
  contractId,
  documentType: 'MAIN_CONTRACT',
  originalFilename: 'signed-contract.pdf',
  contentType: 'application/pdf',
  sizeBytes: 1024,
  sha256: 'sha256-test',
  version: 1,
  uploadedBy: null,
  uploadedByRole: 'ADMIN',
  uploadedAt: '2026-10-20T10:00:00Z',
  archivedAt: null,
};

function query(data, overrides = {}) {
  return {
    data,
    isPending: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch: async () => {},
    ...overrides,
  };
}

function loadModeratorReadScreen(queryResults, apiOverrides = {}) {
  const queryOptions = [];
  const useQuery = (options) => {
    queryOptions.push(options);
    return queryResults[queryOptions.length - 1] ?? query(undefined, { isPending: true });
  };
  const styles = new Proxy({}, { get: (_target, property) => String(property) });
  const path = loadTypescript('src/routes/path.ts');
  const messages = loadTypescript('src/text/moderator/moderator-messages.ts');
  const tenantSchemas = loadTypescript('src/schema/tenants.schema.ts');
  const contractSchemas = loadTypescript('src/schema/contracts.schema.ts');
  const module = loadTypescript('src/pages/moderator/moderator-read-screens.tsx', {
    '@tanstack/react-query': { useQuery },
    axios: {
      isAxiosError: (error) => Boolean(error && typeof error === 'object' && 'response' in error),
    },
    'next/link': ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children),
    '@/apis/dashboard.api': { dashboardApi: { getOverview: async () => undefined } },
    '@/apis/contracts.api': {
      contractsApi: {
        listByTenant: async () => [],
        getModeratorById: async () => contract,
        getDocuments: async () => [],
        ...apiOverrides.contractsApi,
      },
    },
    '@/apis/notifications.api': {
      notificationsApi: { list: async () => [], unreadCount: async () => ({ unreadCount: 0 }), listAlerts: async () => [] },
    },
    '@/apis/tenants.api': {
      tenantsApi: { list: async () => [], getById: async () => tenant, ...apiOverrides.tenantsApi },
    },
    '@/routes/path': path,
    '@/schema/contracts.schema': contractSchemas,
    '@/schema/tenants.schema': tenantSchemas,
    './moderator-shell': { moderatorStyles: styles },
    '@/text/moderator/moderator-messages': messages,
    zod: { ZodError },
  });
  return { screen: module.ModeratorReadScreen, queryOptions };
}

function renderModerator(sectionPath, queryResults, apiOverrides) {
  const { screen, queryOptions } = loadModeratorReadScreen(queryResults, apiOverrides);
  const html = renderToStaticMarkup(React.createElement(screen, { sectionPath }));
  return { html, queryOptions };
}

test('tenant list renders API fields and links by canonical UUID without create controls', () => {
  const { html, queryOptions } = renderModerator('customers', [query([tenant])]);
  assert.match(html, /Cà phê kiểm thử/);
  assert.match(html, /contract_owner/);
  assert.match(html, /00000000-0000-4000-8000-000000000101/);
  assert.match(html, /href="\/moderator\/customers\/00000000-0000-4000-8000-000000000101"/);
  assert.doesNotMatch(html, /Tạo khách hàng|nguyen-minh-anh|minhanh@example\.com/);
  assert.deepEqual(queryOptions[0].queryKey, ['dolores', 'tenants']);
});

test('tenant list distinguishes loading, empty, forbidden, and API-not-found states', () => {
  const loading = renderModerator('customers', [query(undefined, { data: undefined, isPending: true })]);
  assert.match(loading.html, /Đang tải danh sách tenant/);
  assert.doesNotMatch(loading.html, /Dolores hiện không trả về tenant nào/);

  const empty = renderModerator('customers', [query([])]);
  assert.match(empty.html, /Dolores hiện không trả về tenant nào/);

  const forbidden = renderModerator('customers', [
    query(undefined, { data: undefined, isError: true, error: { response: { status: 403 } } }),
  ]);
  assert.match(forbidden.html, /không có quyền đọc dữ liệu/);
  assert.doesNotMatch(forbidden.html, /Dolores hiện không trả về tenant nào/);

  const missing = renderModerator('customers/' + tenantId, [
    query(undefined, { data: undefined, isError: true, error: { response: { status: 404 } } }),
  ]);
  assert.match(missing.html, /Không tìm thấy bản ghi/);
});

test('tenant detail uses UUID GET and legacy display IDs never enable an API request', () => {
  const detail = renderModerator('customers/' + tenantId, [query(tenant)]);
  assert.match(detail.html, /Chi tiết khách hàng/);
  assert.match(detail.html, /Cà phê kiểm thử/);
  assert.equal(detail.queryOptions[0].enabled, true);
  assert.deepEqual(detail.queryOptions[0].queryKey, ['dolores', 'tenants', 'id', tenantId]);

  const legacy = renderModerator('customers/nguyen-minh-anh', []);
  assert.match(legacy.html, /dữ liệu mẫu cũ/);
  assert.equal(legacy.queryOptions[0].enabled, false);
});

test('contract list renders tenant-scoped API records and partial errors are not empty results', () => {
  const success = renderModerator('contracts', [
    query([tenant]),
    query({ contracts: [{ tenant, contract }], failedTenants: [] }),
  ]);
  assert.match(success.html, /ACTIVE/);
  assert.match(success.html, /Cà phê kiểm thử/);
  assert.match(success.html, new RegExp('/moderator/contracts/' + contractId));
  assert.doesNotMatch(success.html, /C-204|Tạo hợp đồng/);
  assert.deepEqual(success.queryOptions[1].queryKey, ['dolores', 'moderator', 'contracts-by-tenant', [tenantId]]);

  const partial = renderModerator('contracts', [
    query([tenant, { ...tenant, id: otherTenantId, name: 'Tenant lỗi' }]),
    query({
      contracts: [],
      failedTenants: [{ tenant: { ...tenant, id: otherTenantId, name: 'Tenant lỗi' }, error: { response: { status: 503 } } }],
    }),
  ]);
  assert.match(partial.html, /Một số tenant chưa tải được hợp đồng/);
  assert.match(partial.html, /Tenant lỗi/);
  assert.doesNotMatch(partial.html, /Dolores không trả về hợp đồng nào/);

  const empty = renderModerator('contracts', [query([tenant]), query({ contracts: [], failedTenants: [] })]);
  assert.match(empty.html, /Dolores không trả về hợp đồng nào/);
});

test('contract fan-out is bounded to five requests and retains failed tenant identity', async () => {
  const tenants = Array.from({ length: 8 }, (_value, index) => ({
    id: '00000000-0000-4000-8000-' + String(index + 100).padStart(12, '0'),
    name: 'Tenant ' + index,
    type: 'contract_owner',
    billingExempt: false,
  }));
  let active = 0;
  let maxActive = 0;
  const { queryOptions } = renderModerator('contracts', [
    query(tenants),
    query(undefined, { data: undefined, isPending: true }),
  ], {
    contractsApi: {
      listByTenant: async (id) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 2));
        active -= 1;
        if (id === tenants[3].id) throw { response: { status: 503 } };
        return [{ ...contract, id: contractId, tenantId: id }];
      },
    },
  });
  const result = await queryOptions[1].queryFn({ signal: new AbortController().signal });
  assert.equal(maxActive, 5);
  assert.equal(result.contracts.length, 7);
  assert.deepEqual(result.failedTenants.map(({ tenant: failedTenant }) => failedTenant.id), [tenants[3].id]);
});

test('contract detail renders read-only metadata and handles empty, forbidden, and stale IDs', () => {
  const detail = renderModerator('contracts/' + contractId, [query(contract), query([document])]);
  assert.match(detail.html, /API terms/);
  assert.match(detail.html, /signed-contract\.pdf/);
  assert.match(detail.html, /MAIN_CONTRACT/);
  assert.match(detail.html, /1024 bytes/);
  assert.doesNotMatch(detail.html, /Tải xuống|Lưu thông tin|Gửi hợp đồng/);
  assert.deepEqual(detail.queryOptions[0].queryKey, ['dolores', 'moderator', 'contracts', 'id', contractId]);
  assert.deepEqual(detail.queryOptions[1].queryKey, ['dolores', 'contract-documents', contractId]);

  const emptyDocuments = renderModerator('contracts/' + contractId, [query(contract), query([])]);
  assert.match(emptyDocuments.html, /Chưa có metadata tài liệu/);

  const forbidden = renderModerator('contracts/' + contractId, [
    query(undefined, { data: undefined, isError: true, error: { response: { status: 403 } } }),
    query(undefined, { data: undefined, isPending: true }),
  ]);
  assert.match(forbidden.html, /không có quyền đọc dữ liệu/);

  const stale = renderModerator('contracts/C-204', []);
  assert.match(stale.html, /dữ liệu mẫu cũ/);
  assert.equal(stale.queryOptions[0].enabled, false);
});

test('new and expiry contract routes remain unavailable without write controls', () => {
  for (const sectionPath of ['contracts/new', 'contracts/expiry', 'customers/new']) {
    const { html, queryOptions } = renderModerator(sectionPath, []);
    assert.match(html, /chưa khả dụng/);
    assert.doesNotMatch(html, /<button|<form/);
    assert.equal(queryOptions.length, 0);
  }
});

test('Pages Router detail routes pass only the URL segment into shared screen modules', async () => {
  const messages = { NAVIGATION: { CUSTOMERS: 'Khách hàng', CONTRACTS: 'Hợp đồng' } };
  const mocks = {
    '../moderator-read-screens': {
      ModeratorReadScreen: ({ sectionPath }) => React.createElement('p', null, sectionPath),
    },
    '../moderator-shell': { ModeratorShell: ({ children }) => React.createElement('main', null, children) },
    '@/text/moderator/moderator-messages': { MODERATOR_MESSAGES: messages },
  };
  const customerPage = loadTypescript('src/pages/moderator/customers/[tenantId].page.tsx', mocks);
  const customerProps = await customerPage.getServerSideProps({ params: { tenantId } });
  assert.deepEqual(customerProps, { props: { tenantId } });
  assert.match(renderToStaticMarkup(React.createElement(customerPage.default, { tenantId })), /customers\/00000000-0000-4000-8000-000000000101/);

  const contractPage = loadTypescript('src/pages/moderator/contracts/[contractId].page.tsx', mocks);
  const contractProps = await contractPage.getServerSideProps({ params: { contractId } });
  assert.deepEqual(contractProps, { props: { contractId } });
  assert.match(renderToStaticMarkup(React.createElement(contractPage.default, { contractId })), /contracts\/00000000-0000-4000-8000-000000000201/);
});
