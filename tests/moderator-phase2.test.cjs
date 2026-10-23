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

const root = '/moderator';
const paths = {
  root,
  contracts: `${root}/contracts`,
  contractsList: `${root}/contracts/list`,
  newContract: `${root}/contracts/new`,
  contractExpiry: `${root}/contracts/expiry`,
  contractDetail: (id) => `${root}/contracts/${encodeURIComponent(id)}`,
  customers: `${root}/customers`,
  customersList: `${root}/customers/list`,
  newCustomer: `${root}/customers/new`,
  customerDetail: (id) => `${root}/customers/${encodeURIComponent(id)}`,
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

function renderModerator(sections, queryResults = {}) {
  const calls = { useTenants: 0, useTenant: [], usePlatformContracts: [], useContractById: [], useContractDocuments: [] };
  const results = {
    tenants: query([tenant]),
    tenantDetail: query(tenant),
    platformContracts: {
      contracts: [{ tenant, contract }],
      completedTenantCount: 1,
      failedTenants: [],
      isLoading: false,
      retryFailed: () => {},
      refetchAll: () => {},
    },
    contractDetail: query(contract),
    documents: query([document]),
    ...queryResults,
  };
  const MockPage = ({ title, description, actions, children }) => React.createElement(
    'main', null,
    React.createElement('h1', null, title),
    description && React.createElement('p', null, description),
    actions,
    children
  );
  const MockTable = ({ headers, rows }) => React.createElement(
    'table', null,
    React.createElement('thead', null, React.createElement('tr', null, headers.map((header) => React.createElement('th', { key: header }, header)))),
    React.createElement('tbody', null, rows.map((row, rowIndex) => React.createElement('tr', { key: rowIndex }, row.map((cell, cellIndex) => React.createElement('td', { key: cellIndex }, cell)))))
  );
  const ui = {
    DoloresButton: ({ href, children, onClick }) => href
      ? React.createElement('a', { href }, children)
      : React.createElement('button', { onClick }, children),
    DoloresField: ({ label, value }) => React.createElement('div', null, React.createElement('span', null, `${label}: `), value),
    DoloresFieldGrid: ({ children }) => React.createElement('div', null, children),
    DoloresMetric: ({ label, value }) => React.createElement('p', null, `${label}: ${value}`),
    DoloresNotice: ({ title, children }) => React.createElement('section', null, React.createElement('strong', null, title), children),
    DoloresPanel: ({ children }) => React.createElement('section', null, children),
    DoloresPanelTitle: ({ children }) => React.createElement('h2', null, children),
    DoloresTable: MockTable,
  };
  const hooks = {
    '@/hooks/dolores/useTenants': {
      useTenants: () => { calls.useTenants += 1; return results.tenants; },
      useTenant: (id) => { calls.useTenant.push(id); return results.tenantDetail; },
    },
    '@/hooks/dolores/useContracts': {
      usePlatformContracts: (tenants, enabled) => { calls.usePlatformContracts.push({ tenants, enabled }); return results.platformContracts; },
      useContractById: (id) => { calls.useContractById.push(id); return results.contractDetail; },
      useContractDocuments: (tenantValue, contractValue, enabled) => {
        calls.useContractDocuments.push({ tenantId: tenantValue, contractId: contractValue, enabled });
        return results.documents;
      },
    },
  };
  const { ModeratorSectionPage } = loadTypescript(
    'src/app/(moderator)/moderator/_components/ModeratorDashboardScreens.tsx',
    {
      'next/link': ({ href, children }) => React.createElement('a', { href }, children),
      '@/app/_features/dashboard/DashboardOverview': { DashboardOverview: MockPage },
      '@/app/_features/machines/MachinePresentation': {},
      './ModeratorOperationalScreens': { ModeratorMachinesScreen: () => null, ModeratorIoTScreen: () => null, ModeratorTechnicalScreen: () => null },
      './ModeratorBillingRecipeScreens': { ModeratorBuybackScreen: () => null, ModeratorInvoicesScreen: () => null, ModeratorRecipesScreen: () => null },
      '@/app/_shell/dolores/DoloresShell': { DoloresPage: MockPage },
      '@/app/_ui/dolores/DoloresUI': ui,
      '@/app/_features/demo-flow/demoFlowStore': {
        isRetrievalAssessment: () => false,
        readDemoFields: () => [],
        readDemoRecord: () => null,
        useDemoRecord: () => null,
        writeDemoRecord: () => false,
        writeDemoFlow: () => false,
      },
      '@/routes/path': { PATH_MODERATOR: paths, PATH_TECHNICIAN: { taskRefurbishment: `${root}/technician/refurbishment` } },
      '@/hooks/dolores/useDashboardOverview': { useDashboardOverview: () => query(undefined) },
      '@/hooks/dolores/useAlerts': { useAlerts: () => query([]) },
      '@/hooks/dolores/useNotifications': { useNotifications: () => query([]), useUnreadNotificationCount: () => query({ unreadCount: 0 }), useMarkNotificationRead: () => ({ mutate: () => {}, isPending: false, isError: false, error: null }) },
      '@/app/_shell/dolores/DoloresShell.module.css': {},
      ...hooks,
    }
  );
  const html = renderToStaticMarkup(React.createElement(ModeratorSectionPage, { sections }));
  return { html, calls };
}

test('Moderator tenant list and detail use canonical tenant API data only', () => {
  const { html, calls } = renderModerator(['customers'], {
    tenants: query([tenant, { id: otherTenantId, name: 'Cửa hàng mẫu API', type: 'store_owner', billingExempt: true }]),
  });
  assert.match(html, /Cà phê kiểm thử/);
  assert.match(html, /contract_owner/);
  assert.match(html, /Miễn trừ hóa đơn/);
  assert.match(html, new RegExp(paths.customerDetail(tenantId)));
  assert.doesNotMatch(html, /Nguyễn Minh Anh|minhanh@example\.com/);
  assert.doesNotMatch(html, /href="\/moderator\/customers\/new"/);
  assert.equal(calls.useTenants, 1);

  const detail = renderModerator(['customers', tenantId]);
  assert.match(detail.html, /Cà phê kiểm thử/);
  assert.match(detail.html, /00000000-0000-4000-8000-000000000101/);
  assert.doesNotMatch(detail.html, /Email|Số điện thoại|Đang hoạt động/);
  assert.deepEqual(detail.calls.useTenant, [tenantId]);
});

test('Moderator tenant list preserves loading, empty, and API error states', () => {
  const loading = renderModerator(['customers'], { tenants: query(undefined, { data: undefined, isPending: true }) });
  assert.match(loading.html, /Đang tải tổ chức/);
  assert.doesNotMatch(loading.html, /Không có tổ chức/);

  const empty = renderModerator(['customers'], { tenants: query([]) });
  assert.match(empty.html, /Không có tổ chức/);

  const failed = renderModerator(['customers'], {
    tenants: query(undefined, { data: undefined, isError: true, error: { status: 403 } }),
  });
  assert.match(failed.html, /403/);
  assert.doesNotMatch(failed.html, /Không có tổ chức/);
});

test('Moderator contract list uses tenant-scoped API records and does not offer writes', () => {
  const { html, calls } = renderModerator(['contracts']);
  assert.match(html, /Cà phê kiểm thử/);
  assert.match(html, /ACTIVE/);
  assert.match(html, new RegExp(paths.contractDetail(contractId)));
  assert.doesNotMatch(html, /C-204|C-205|Tạo hồ sơ hợp đồng|Nhắc hợp đồng sắp hết hạn/);
  assert.match(html, /Tạo hợp đồng chưa khả dụng/);
  assert.equal(calls.useTenants, 1);
  assert.deepEqual(calls.usePlatformContracts, [{ tenants: [tenant], enabled: true }]);
});

test('Moderator contract list does not turn failed tenant reads into an empty result', () => {
  const empty = renderModerator(['contracts'], {
    platformContracts: {
      contracts: [],
      completedTenantCount: 1,
      failedTenants: [],
      isLoading: false,
      retryFailed: () => {},
      refetchAll: () => {},
    },
  });
  assert.match(empty.html, /Dolores không trả về hợp đồng/);

  const partial = renderModerator(['contracts'], {
    platformContracts: {
      contracts: [],
      completedTenantCount: 0,
      failedTenants: [{ tenant, error: { status: 503 }, retry: () => {} }],
      isLoading: false,
      retryFailed: () => {},
      refetchAll: () => {},
    },
  });
  assert.match(partial.html, /Một số tenant chưa tải được hợp đồng/);
  assert.doesNotMatch(partial.html, /Dolores không trả về hợp đồng/);
});

test('Moderator contract detail loads the canonical record and read-only document metadata', () => {
  const { html, calls } = renderModerator(['contracts', contractId]);
  assert.match(html, /API terms/);
  assert.match(html, /01\/03\/2027/);
  assert.match(html, /signed-contract\.pdf/);
  assert.match(html, /MAIN_CONTRACT/);
  assert.doesNotMatch(html, /C-204|C-205|Tải xuống|Gửi|Lưu thông tin/);
  assert.deepEqual(calls.useContractById, [contractId]);
  assert.deepEqual(calls.useContractDocuments, [{ tenantId, contractId, enabled: true }]);
});

test('Moderator contract detail exposes empty and failed document metadata reads', () => {
  const empty = renderModerator(['contracts', contractId], { documents: query([]) });
  assert.match(empty.html, /Chưa có metadata tài liệu/);

  const failed = renderModerator(['contracts', contractId], {
    documents: query(undefined, { data: undefined, isError: true, error: { status: 403 } }),
  });
  assert.match(failed.html, /403: tài khoản hiện tại không có quyền/);
});

test('stale fixture IDs and contract write routes remain unavailable without API reads', () => {
  const staleContract = renderModerator(['contracts', 'C-204']);
  assert.match(staleContract.html, /ID mẫu cũ/);
  assert.deepEqual(staleContract.calls.useContractById, []);

  const staleTenant = renderModerator(['customers', 'nguyen-minh-anh']);
  assert.match(staleTenant.html, /ID mẫu cũ/);
  assert.deepEqual(staleTenant.calls.useTenant, []);

  const missingApiRecord = renderModerator(['contracts', '00000000-0000-4000-8000-000000000299'], {
    contractDetail: query(undefined, { data: undefined, isError: true, error: { status: 404 } }),
  });
  assert.match(missingApiRecord.html, /404: không tìm thấy hợp đồng/i);

  for (const section of [['contracts', 'new'], ['contracts', 'expiry'], ['customers', 'new']]) {
    const unavailable = renderModerator(section);
    assert.match(unavailable.html, /chưa khả dụng/i);
    assert.doesNotMatch(unavailable.html, /<button/);
    assert.doesNotMatch(unavailable.html, /href="\/moderator\/(?:contracts\/(?:new|expiry)|customers\/new)"/);
  }
});

test('Moderator API read routes accept UUID identifiers while keeping fixture route shells', () => {
  const pathModule = loadTypescript('src/routes/path.ts');
  const routeModule = loadTypescript('src/routes/routes.ts', { './path': pathModule });
  assert.equal(routeModule.isSupportedModeratorSection(`contracts/${contractId}`), true);
  assert.equal(routeModule.isSupportedModeratorSection(`customers/${tenantId}`), true);
  assert.equal(routeModule.isSupportedModeratorSection('contracts/C-204'), true);
  assert.equal(routeModule.isSupportedModeratorSection('customers/nguyen-minh-anh'), true);
  assert.equal(routeModule.isSupportedModeratorSection('contracts/not-a-record'), false);
});

test('contract-by-ID hook accepts only UUIDs so stale fixture IDs cannot trigger requests', () => {
  const queryOptions = [];
  const { useContractById } = loadTypescript('src/hooks/dolores/useContracts.ts', {
    '@tanstack/react-query': {
      useQuery: (options) => { queryOptions.push(options); return options; },
      useQueries: () => [],
      useMutation: () => ({}),
    },
    '@/apis/dolores/contracts.api': { contractsApi: { getById: async (id) => ({ id }) } },
    '@/schemas/dolores/contracts': {
      ContractIdSchema: { safeParse: (value) => ({ success: /^[0-9a-f-]{36}$/i.test(value) }) },
    },
    '@/schemas/dolores/machines': { MachineIdSchema: { safeParse: () => ({ success: true }) } },
    '@/schemas/dolores/tenants': {},
    './queryPolicy': { retryDoloresRead: () => false },
    './tenantRequestLimiter': { withTenantRequestSlot: (_signal, task) => task() },
  });

  useContractById('C-204');
  assert.equal(queryOptions[0].enabled, false);
  useContractById(contractId);
  assert.equal(queryOptions[1].enabled, true);
  assert.deepEqual(queryOptions[1].queryKey, ['dolores', 'contracts', 'id', contractId]);
});
