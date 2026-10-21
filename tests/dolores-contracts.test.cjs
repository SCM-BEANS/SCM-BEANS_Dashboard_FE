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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  const mockedRequire = (id) => Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : require(id);
  new Function('require', 'exports', 'module', outputText)(mockedRequire, module.exports, module);
  return module.exports;
}

const {
  ContractSchema,
  ContractListSchema,
  ContractExpiryStatusSchema,
  ContractDocumentListSchema,
} = loadTypescript('src/schemas/dolores/contracts.ts');

const tenantId = '00000000-0000-4000-8000-000000000001';
const contractId = '00000000-0000-4000-8000-000000000002';
const machineId = '00000000-0000-4000-8000-000000000003';
const documentId = '00000000-0000-4000-8000-000000000004';

const contract = {
  id: contractId,
  tenantId,
  machineId,
  endDate: '2026-12-31',
  startDate: '2026-01-01',
  monthlyRentalFee: 750000,
  machineTypeSnapshot: 'SMART_IOT',
  depositAmount: '10000000.00',
  installationFee: null,
  paygUnitPrice: 1000,
  offlineLimitMinutes: 7200,
  status: 'ACTIVE',
  legacyUnmapped: false,
};

test('contract schemas accept supported entity, expiry, and document response fields', () => {
  assert.equal(ContractSchema.parse(contract).id, contractId);
  assert.equal(ContractListSchema.parse([contract]).length, 1);
  assert.equal(ContractListSchema.safeParse({ content: [contract], last: true }).success, false);
  assert.equal(ContractSchema.safeParse({ ...contract, status: 'RENEWED' }).success, false);

  const expiry = ContractExpiryStatusSchema.parse({ contractId, expiryDate: '2026-12-31', decision: 'CONTINUE' });
  assert.equal(expiry.contractId, contractId);

  const document = ContractDocumentListSchema.parse([{
    id: documentId,
    contractId,
    documentType: 'MAIN_CONTRACT',
    originalFilename: 'signed.pdf',
    contentType: 'application/pdf',
    sizeBytes: 1024,
    sha256: 'abc123',
    version: 1,
    uploadedAt: '2026-10-20T10:00:00',
    archivedAt: null,
  }]);
  assert.equal(document[0].originalFilename, 'signed.pdf');
});

test('contract API constructs only tenant-scoped and documented read routes', async () => {
  const calls = [];
  const otherId = '00000000-0000-4000-8000-000000000005';
  const responseQueue = [
    [],
    contract,
    [],
    { contractId, expiryDate: '2026-12-31' },
    [],
  ];
  const passSchema = { parse: (value) => value };
  const validateUuid = (value) => {
    if (value !== tenantId && value !== contractId && value !== machineId && value !== documentId) {
      throw new Error('Invalid UUID');
    }
    return value;
  };
  const mocks = {
    './client': {
      DoloresApiError: class DoloresApiError extends Error {
        constructor(kind, status, message) { super(message); this.kind = kind; this.status = status; }
      },
      requestDolores: (config, schema) => { calls.push({ config, schema }); return Promise.resolve(responseQueue.shift()); },
      requestDoloresBlob: (config) => { calls.push({ config, blob: true }); return Promise.resolve(new Blob()); },
    },
    '@/schemas/dolores/contracts': {
      ContractIdSchema: { parse: validateUuid },
      ContractListSchema: passSchema,
      ContractDocumentListSchema: passSchema,
      ContractExpiryStatusSchema: passSchema,
      ContractSchema: passSchema,
    },
    '@/schemas/dolores/machines': { MachineIdSchema: { parse: validateUuid } },
    '@/schemas/dolores/tenants': { TenantSchema: { shape: { id: { parse: validateUuid } } } },
  };
  const { contractsApi } = loadTypescript('src/apis/dolores/contracts.api.ts', mocks);

  await contractsApi.listByTenant(tenantId);
  await contractsApi.getById(contractId);
  await contractsApi.listByMachine(machineId);
  await contractsApi.getExpiryStatus(contractId);
  await contractsApi.listDocuments(contractId);
  await contractsApi.downloadDocument(contractId, documentId);

  assert.deepEqual(calls.map(({ config }) => `${config.method} ${config.url}`), [
    `GET /contracts/tenant/${tenantId}`,
    `GET /contracts/${contractId}`,
    `GET /contracts/machine/${machineId}/history`,
    `GET /contracts/${contractId}/expiry-status`,
    `GET /contracts/${contractId}/documents`,
    `GET /contracts/${contractId}/documents/${documentId}`,
  ]);
  assert.deepEqual(Object.keys(contractsApi), [
    'listByTenant', 'getById', 'listByMachine', 'getExpiryStatus', 'listDocuments', 'downloadDocument',
  ]);
  await assert.rejects(contractsApi.listByTenant('not-a-tenant-uuid'), /Invalid UUID/);

  responseQueue.push([{ ...contract, tenantId: otherId }]);
  await assert.rejects(contractsApi.listByTenant(tenantId), { kind: 'invalid_response' });
  responseQueue.push({ ...contract, id: otherId });
  await assert.rejects(contractsApi.getById(contractId), { kind: 'invalid_response' });
  responseQueue.push([{ ...contract, machineId: otherId }]);
  await assert.rejects(contractsApi.listByMachine(machineId), { kind: 'invalid_response' });
  responseQueue.push({ contractId: otherId, expiryDate: '2026-12-31' });
  await assert.rejects(contractsApi.getExpiryStatus(contractId), { kind: 'invalid_response' });
  responseQueue.push([{ id: documentId, contractId: otherId }]);
  await assert.rejects(contractsApi.listDocuments(contractId), { kind: 'invalid_response' });
});
