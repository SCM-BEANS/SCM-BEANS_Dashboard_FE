const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function loadTypescript(relativePath, mocks = {}) {
  const fileName = join(__dirname, '..', relativePath);
  const source = readFileSync(fileName, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  const module = { exports: {} };
  const mockedRequire = (id) => Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : require(id);
  new Function('require', 'exports', 'module', outputText)(mockedRequire, module.exports, module);
  return module.exports;
}

const tenantId = '00000000-0000-4000-8000-000000000101';
const contractId = '00000000-0000-4000-8000-000000000201';
const documentId = '00000000-0000-4000-8000-000000000301';
const ownerContract = { id: contractId, ownerId: tenantId, status: 'ACTIVE' };
const moderatorContract = {
  id: contractId,
  tenantId,
  machineId: null,
  startDate: '2026-03-01',
  endDate: '2027-03-01',
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
  originalFilename: 'signed.pdf',
  contentType: 'application/pdf',
  sizeBytes: 1024,
  version: 1,
  uploadedAt: '2026-10-20T10:00:00Z',
  uploadedBy: null,
  archivedAt: null,
};
const tenant = { id: tenantId, name: 'Khách kiểm thử', type: 'contract_owner', billingExempt: false };

function createAxiosClient(responseQueue) {
  const calls = [];
  const axiosClient = {
    async get(url, config = {}) {
      calls.push({ method: 'GET', url, config });
      return { data: responseQueue.shift() };
    },
  };
  return { axiosClient, calls };
}

function loadContractsApi(responses, contractSchemas, tenantSchemas) {
  const { axiosClient, calls } = createAxiosClient(responses);
  const module = loadTypescript('src/apis/contracts.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/contracts.schema': contractSchemas,
    '@/schema/tenants.schema': tenantSchemas,
  });
  return { api: module.contractsApi, calls };
}

test('Admin owner contract schema and Moderator tenant contract schema remain separate', () => {
  const contractSchemas = loadTypescript('src/schema/contracts.schema.ts');
  assert.equal(contractSchemas.ContractSchema.parse(ownerContract).ownerId, tenantId);
  assert.equal(contractSchemas.ContractSchema.safeParse(moderatorContract).success, false);
  assert.equal(contractSchemas.ModeratorContractSchema.parse(moderatorContract).tenantId, tenantId);
  assert.equal(contractSchemas.ContractListSchema.safeParse({ content: [ownerContract], last: true }).success, false);
  assert.equal(contractSchemas.ModeratorContractSchema.safeParse({ ...moderatorContract, id: 'legacy-C-204' }).success, false);
  assert.equal(contractSchemas.ContractDocumentsSchema.parse([document])[0].originalFilename, 'signed.pdf');
});

test('Moderator contract reads use only tenant-scoped, canonical GET endpoints', async () => {
  const contractSchemas = loadTypescript('src/schema/contracts.schema.ts');
  const tenantSchemas = loadTypescript('src/schema/tenants.schema.ts');
  const { api, calls } = loadContractsApi([
    [moderatorContract],
    moderatorContract,
    [document],
    [{ ...moderatorContract, tenantId: '00000000-0000-4000-8000-000000000102' }],
  ], contractSchemas, tenantSchemas);

  assert.equal((await api.listByTenant(tenantId))[0].id, contractId);
  assert.equal((await api.getModeratorById(contractId)).tenantId, tenantId);
  assert.equal((await api.getDocuments(contractId))[0].contractId, contractId);
  await assert.rejects(api.listByTenant(tenantId), /outside the requested tenant scope/);
  await assert.rejects(api.listByTenant('not-a-uuid'));
  await assert.rejects(api.getModeratorById('C-204'));

  assert.deepEqual(calls.map(({ method, url }) => method + ' ' + url), [
    'GET /contracts/tenant/' + tenantId,
    'GET /contracts/' + contractId,
    'GET /contracts/' + contractId + '/documents',
    'GET /contracts/tenant/' + tenantId,
  ]);
  assert.ok(calls.every(({ config }) => config.baseURL === '/api/dolores/v1'));
});

test('existing Admin contract list and detail methods retain the ownerId contract', async () => {
  const contractSchemas = loadTypescript('src/schema/contracts.schema.ts');
  const tenantSchemas = loadTypescript('src/schema/tenants.schema.ts');
  const { api, calls } = loadContractsApi([[ownerContract], ownerContract], contractSchemas, tenantSchemas);

  assert.equal((await api.list())[0].ownerId, tenantId);
  assert.equal((await api.getById(contractId)).ownerId, tenantId);
  assert.deepEqual(calls.map(({ method, url }) => method + ' ' + url), [
    'GET /contracts',
    'GET /contracts/' + contractId,
  ]);
});

test('tenant API validates UUID detail and confirms response identity', async () => {
  const tenantSchemas = loadTypescript('src/schema/tenants.schema.ts');
  const { axiosClient, calls } = createAxiosClient([[tenant], tenant, { ...tenant, id: '00000000-0000-4000-8000-000000000102' }]);
  const { tenantsApi } = loadTypescript('src/apis/tenants.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/tenants.schema': tenantSchemas,
  });

  assert.equal((await tenantsApi.list())[0].id, tenantId);
  assert.equal((await tenantsApi.getById(tenantId)).name, 'Khách kiểm thử');
  await assert.rejects(tenantsApi.getById('nguyen-minh-anh'));
  await assert.rejects(tenantsApi.getById(tenantId), /does not match the requested ID/);
  assert.deepEqual(calls.map(({ method, url }) => method + ' ' + url), [
    'GET /tenants',
    'GET /tenants/' + tenantId,
    'GET /tenants/' + tenantId,
  ]);
  assert.ok(calls.every(({ config }) => config.baseURL === '/api/dolores/v1'));
});
