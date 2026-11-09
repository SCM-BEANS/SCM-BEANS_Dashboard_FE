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
  const loaded = { exports: {} };
  const mockedRequire = (id) => Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : (id === "@/lib/evidence-multipart" ? require("./evidence-multipart-helper.cjs") : require(id));
  new Function('require', 'exports', 'module', outputText)(mockedRequire, loaded.exports, loaded);
  return loaded.exports;
}

const technicianId = '00000000-0000-4000-8000-000000000001';
const machineId = '00000000-0000-4000-8000-000000000002';
const machinesSchema = loadTypescript('src/schema/machines.schema.ts');
const profilesSchema = loadTypescript('src/schema/profiles.schema.ts');

function loadMachinesApi(axiosClient) {
  return loadTypescript('src/apis/machines.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/machines.schema': machinesSchema,
    '@/schema/profiles.schema': profilesSchema,
    '@/schema/owner-analytics.schema': loadTypescript('src/schema/owner-analytics.schema.ts'),
  }).machinesApi;
}

test('machine technician assignment uses the shared Machines API route and validates UUIDs', async () => {
  const calls = [];
  const machinesApi = loadMachinesApi({
    post: async (...args) => { calls.push(['POST', ...args]); return { data: undefined }; },
  });

  assert.equal(await machinesApi.assignTechnician(technicianId, machineId), undefined);
  assert.deepEqual(calls, [[
    'POST',
    `/technician-assignments/${technicianId}/machines/${machineId}`,
    undefined,
    { baseURL: '/api/dolores/v1' },
  ]]);
  await assert.rejects(machinesApi.assignTechnician('invalid-profile', machineId));
  await assert.rejects(machinesApi.assignTechnician(technicianId, 'invalid-machine'));
  assert.equal(calls.length, 1);
});

test('machine technician unassignment uses DELETE and validates UUIDs', async () => {
  const calls = [];
  const machinesApi = loadMachinesApi({
    delete: async (...args) => { calls.push(['DELETE', ...args]); },
  });

  assert.equal(await machinesApi.unassignTechnician(technicianId, machineId), undefined);
  assert.deepEqual(calls, [[
    'DELETE',
    `/technician-assignments/${technicianId}/machines/${machineId}`,
    { baseURL: '/api/dolores/v1' },
  ]]);
  await assert.rejects(machinesApi.unassignTechnician('invalid-profile', machineId));
  await assert.rejects(machinesApi.unassignTechnician(technicianId, 'invalid-machine'));
  assert.equal(calls.length, 1);
});
