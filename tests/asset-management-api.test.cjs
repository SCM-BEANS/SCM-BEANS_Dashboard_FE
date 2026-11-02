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

const ownerId = '00000000-0000-4000-8000-000000000001';
const machineId = '00000000-0000-4000-8000-000000000002';
const otherId = '00000000-0000-4000-8000-000000000003';

test('machine registration supports an explicit Owner only for operator-created machines', async () => {
  const machineSchemas = loadTypescript('src/schema/machines.schema.ts');
  const calls = [];
  const axiosClient = {
    post: async (url, body, config) => {
      calls.push({ url, body, config });
      return { data: { id: machineId }, status: 201 };
    },
  };
  const { machinesApi } = loadTypescript('src/apis/machines.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/machines.schema': machineSchemas,
  });

  await machinesApi.create({
    serialNumber: 'M-1',
    machineType: 'SMART_IOT',
    status: 'IN_WAREHOUSE',
    cupsServedSinceLastDescale: 0,
    ownerId,
  });
  assert.deepEqual(calls, [{
    url: '/machines',
    body: { serialNumber: 'M-1', machineType: 'SMART_IOT', status: 'IN_WAREHOUSE', cupsServedSinceLastDescale: 0, ownerId },
    config: { baseURL: '/api/dolores/v1' },
  }]);
  assert.equal(machineSchemas.CreateMachineRequestSchema.safeParse({
    serialNumber: 'M-2', machineType: 'CONVENTIONAL', status: 'IN_WAREHOUSE', cupsServedSinceLastDescale: 0,
  }).success, true);
  assert.equal(machineSchemas.CreateMachineRequestSchema.safeParse({
    serialNumber: 'M-3', machineType: 'CONVENTIONAL', status: 'IN_WAREHOUSE', cupsServedSinceLastDescale: 0, ownerId: 'not-a-uuid',
  }).success, false);
});

test('Owner profile verification rejects a response for a different IDaaS UUID', async () => {
  const profileSchemas = loadTypescript('src/schema/profiles.schema.ts');
  const axiosClient = { get: async () => ({ data: {
    idaasUserId: otherId,
    email: 'owner@example.test',
    fullName: 'Owner Example',
    phone: null,
    emailVerified: true,
    roles: ['OWNER'],
    status: 'ACTIVE',
    createdAt: null,
    updatedAt: null,
    contractsUrl: null,
  } }) };
  const { profilesApi } = loadTypescript('src/apis/profiles.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/profiles.schema': profileSchemas,
  });

  await assert.rejects(profilesApi.getById(ownerId), /different profile than the requested IDaaS UUID/);
});
