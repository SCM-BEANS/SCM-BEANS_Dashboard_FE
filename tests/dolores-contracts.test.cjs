const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join, dirname, relative, resolve } = require('node:path');
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
  const mockedRequire = (id) => Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id]
    : id.startsWith('@/schema/') ? loadTypescript(`src/${id.slice(2)}.ts`, mocks)
      : id.startsWith('.') ? loadTypescript(relative(join(__dirname, '..'), resolve(dirname(fileName), `${id}.ts`)), mocks)
        : require(id);
  new Function('require', 'exports', 'module', outputText)(mockedRequire, module.exports, module);
  return module.exports;
}

const tenantId = '00000000-0000-4000-8000-000000000101';
const contractId = '00000000-0000-4000-8000-000000000201';
const documentId = '00000000-0000-4000-8000-000000000301';
const ownerContract = { id: contractId, ownerId: tenantId, status: 'ACTIVE' };
test('contract reads accept nullable policy fields while create requests retain validation', async () => {
  const schema = loadTypescript('src/schema/contracts.schema.ts');
  const snapshot = {
    policyVersion: 1, maintenanceIntervalMonths: 3, maintenanceWindowDays: 10,
    allowedReplacementMachineTypes: ['SMART_IOT'], repairCostResponsibility: 'UNKNOWN',
    paymentDueEligibleDays: 10, paymentDestinationReference: null,
    offlineViolationAction: 'WARN_ONLY', buybackEnabled: true,
    buybackMinimumMonths: 0, buybackValuationMethod: 'MANUAL_APPRAISAL',
    offlineLimitMinutes: null, heartbeatToleranceSeconds: null,
  };
  const response = { ...ownerContract, ownerName: null, offlineLimitMinutes: null, contractTermsSnapshot: snapshot };
  const { contractsApi } = loadTypescript('src/apis/contracts.api.ts', {
    '@/lib/http': { DOLORES_API_BASE_URL: '/api/dolores/v1', axiosClient: { get: async () => ({ data: response }) } },
  });
  assert.deepEqual(await contractsApi.getById(contractId), response);
  assert.equal(schema.ModeratorContractSchema.safeParse(response).success, true);
  assert.equal(schema.ContractTermsSnapshotSchema.safeParse(snapshot).success, false);
  const requestSnapshot = { ...snapshot, paymentDestinationReference: undefined, offlineLimitMinutes: undefined };
  assert.equal(schema.ActivateContractRequestSchema.safeParse({ terms: 'Signed terms', contractTermsSnapshot: requestSnapshot }).success, true);
  assert.equal(schema.ContractContinuationRequestSchema.safeParse({ startDate: '2026-11-12', endDate: '2027-11-12', terms: 'Signed terms', monthlyRentalFee: 1000, contractTermsSnapshot: requestSnapshot }).success, true);
  assert.equal(schema.ContractSchema.safeParse({ ...response, id: 'invalid' }).success, false);
  assert.equal(schema.ContractSchema.safeParse({ ...response, contractTermsSnapshot: { ...snapshot, offlineLimitMinutes: -1 } }).success, false);
});
test('heartbeat policy validates seconds without changing legacy snapshots and survives create/amend requests', async () => {
  const schema = loadTypescript('src/schema/contracts.schema.ts');
  const snapshot = {
    policyVersion: 1, maintenanceIntervalMonths: 3, maintenanceWindowDays: 10,
    allowedReplacementMachineTypes: ['SMART_IOT'], repairCostResponsibility: 'COMPANY',
    paymentDueEligibleDays: 10, offlineViolationAction: 'WARN_ONLY', buybackEnabled: true,
    buybackMinimumMonths: 0, buybackValuationMethod: 'MANUAL_APPRAISAL', offlineLimitMinutes: 2880,
  };
  assert.deepEqual(schema.ContractTermsSnapshotSchema.parse(snapshot), snapshot);
  assert.equal(schema.ContractTermsSnapshotSchema.safeParse({ ...snapshot, heartbeatToleranceSeconds: null }).success, true);
  for (const seconds of [5, 45, 86400]) {
    const policy = { ...snapshot, heartbeatToleranceSeconds: seconds };
    const create = schema.CreateContractRequestSchema.parse({
      ownerId: tenantId, machineId: contractId, startDate: '2026-11-01', endDate: '2027-11-01',
      terms: 'Test', monthlyRentalFee: 1000, contractTermsSnapshot: policy,
    });
    assert.equal(create.contractTermsSnapshot.heartbeatToleranceSeconds, seconds);
    const calls = [];
    const { contractsApi } = loadTypescript('src/apis/contracts.api.ts', {
      '@/lib/http': { DOLORES_API_BASE_URL: '/api/dolores/v1', axiosClient: { post: async (url, body) => {
        calls.push({ url, body }); return { data: { ...ownerContract, contractTermsSnapshot: body.snapshot } };
      } } },
      '@/schema/contracts.schema': schema,
    });
    await contractsApi.amendPolicy(contractId, { snapshot: policy, reason: 'Adjust connectivity window', effectiveDate: '2026-11-10' });
    assert.equal(calls[0].body.snapshot.heartbeatToleranceSeconds, seconds);
    assert.equal(calls[0].url, `/contracts/${contractId}/policy-amendments`);
  }
  for (const seconds of [0, 4, 86401, 45.5, '45', NaN, Infinity]) {
    assert.equal(schema.ContractTermsSnapshotSchema.safeParse({ ...snapshot, heartbeatToleranceSeconds: seconds }).success, false);
  }
});
const moderatorContract = {
  id: contractId,
  ownerId: tenantId,
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

function loadContractsApi(responses, contractSchemas) {
  const { axiosClient, calls } = createAxiosClient(responses);
  const module = loadTypescript('src/apis/contracts.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/contracts.schema': contractSchemas,
  });
  return { api: module.contractsApi, calls };
}

test('Admin and Moderator contract reads require Owner identity and preserve role-specific amount validation', () => {
  const contractSchemas = loadTypescript('src/schema/contracts.schema.ts');
  assert.equal(contractSchemas.ContractSchema.parse(ownerContract).ownerId, tenantId);
  assert.equal(contractSchemas.ContractSchema.safeParse(moderatorContract).success, false);
  assert.equal(contractSchemas.ModeratorContractSchema.parse(moderatorContract).ownerId, tenantId);
  assert.equal(contractSchemas.ModeratorContractSchema.safeParse({ ...moderatorContract, ownerId: undefined, tenantId }).success, false);
  assert.equal(contractSchemas.ContractListSchema.safeParse({ content: [ownerContract], last: true }).success, false);
  assert.equal(contractSchemas.ModeratorContractSchema.safeParse({ ...moderatorContract, id: 'legacy-C-204' }).success, false);
  assert.equal(contractSchemas.ContractDocumentsSchema.parse([document])[0].originalFilename, 'signed.pdf');
});

test('Moderator contract detail reads use canonical GET endpoints', async () => {
  const contractSchemas = loadTypescript('src/schema/contracts.schema.ts');
  const { api, calls } = loadContractsApi([
    moderatorContract,
    [document],
  ], contractSchemas);

  assert.equal((await api.getModeratorById(contractId)).ownerId, tenantId);
  assert.equal((await api.getDocuments(contractId))[0].contractId, contractId);
  await assert.rejects(api.getModeratorById('C-204'));

  assert.deepEqual(calls.map(({ method, url }) => method + ' ' + url), [
    'GET /contracts/' + contractId,
    'GET /contracts/' + contractId + '/documents',
  ]);
  assert.ok(calls.every(({ config }) => config.baseURL === '/api/dolores/v1'));
});

test('existing Admin contract list and detail methods retain the ownerId contract', async () => {
  const contractSchemas = loadTypescript('src/schema/contracts.schema.ts');
  const { api, calls } = loadContractsApi([[ownerContract], ownerContract], contractSchemas);

  assert.equal((await api.list())[0].ownerId, tenantId);
  assert.equal((await api.getById(contractId)).ownerId, tenantId);
  assert.deepEqual(calls.map(({ method, url }) => method + ' ' + url), [
    'GET /contracts',
    'GET /contracts/' + contractId,
  ]);
});
