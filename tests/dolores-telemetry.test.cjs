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

const machineId = '00000000-0000-4000-8000-000000000002';
const otherMachineId = '00000000-0000-4000-8000-000000000003';
const tenantId = '00000000-0000-4000-8000-000000000001';
const range = { from: '2026-10-20T00:00:00+07:00', to: '2026-10-21T23:59:59+07:00' };

function loadTelemetrySchema() {
  return loadTypescript('src/schema/telemetry.schema.ts', {
    '@/schema/machines.schema': loadTypescript('src/schema/machines.schema.ts'),
  });
}

test('telemetry schemas validate explicit increasing ranges and preserve flexible values', () => {
  const schema = loadTelemetrySchema();
  const point = {
    timestamp: '2026-10-20T08:15:00Z',
    field: 'temperature',
    value: 92.5,
    tenantId,
    machineId,
    subState: 'BREWING',
  };
  assert.deepEqual(schema.TelemetryPointListSchema.parse([point]), [point]);
  assert.deepEqual(schema.TelemetryPointListSchema.parse([]), []);
  assert.equal(schema.TelemetryPointListSchema.safeParse(null).success, false);
  assert.equal(schema.TelemetryPointsParamsSchema.safeParse({ ...range, limit: 100, offset: 0 }).success, true);
  assert.equal(schema.TelemetryPointsParamsSchema.safeParse({ from: range.to, to: range.from, limit: 100, offset: 0 }).success, false);
});

test('telemetry API sends a bounded page request with the selected machine UUID and range', async () => {
  const calls = [];
  const point = { timestamp: '2026-10-20T08:15:00Z', field: 'temperature', value: 92.5, tenantId, machineId };
  const axiosClient = {
    get: async (url, config) => { calls.push({ url, config }); return { data: url.endsWith('/points') ? [point] : { machineId, status: 'ONLINE' } }; },
  };
  const schemas = {
    '@/schema/machines.schema': loadTypescript('src/schema/machines.schema.ts'),
    '@/schema/telemetry.schema': loadTelemetrySchema(),
  };
  const { telemetryApi } = loadTypescript('src/apis/telemetry.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    ...schemas,
  });
  const signal = new AbortController().signal;
  assert.deepEqual(await telemetryApi.listMachinePoints(machineId, range, 100, signal), [point]);
  assert.deepEqual(await telemetryApi.getLatestHeartbeat(machineId, signal), { machineId, status: 'ONLINE' });
  assert.deepEqual(calls, [
    { url: `/telemetry-query/machines/${machineId}/points`, config: { baseURL: '/api/dolores/v1', params: { ...range, limit: 100, offset: 100 }, signal } },
    { url: `/telemetry-query/machines/${machineId}/heartbeats/latest`, config: { baseURL: '/api/dolores/v1', signal } },
  ]);
});

test('telemetry API rejects invalid machine IDs, reversed ranges, and mismatched response identity', async () => {
  let calls = 0;
  let response = [{ timestamp: '2026-10-20T08:15:00Z', field: 'temperature', value: 92.5, machineId: otherMachineId }];
  const axiosClient = { get: async () => { calls += 1; return { data: response }; } };
  const { telemetryApi } = loadTypescript('src/apis/telemetry.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/machines.schema': loadTypescript('src/schema/machines.schema.ts'),
    '@/schema/telemetry.schema': loadTelemetrySchema(),
  });
  await assert.rejects(telemetryApi.listMachinePoints('S-018', range, 0));
  await assert.rejects(telemetryApi.listMachinePoints(machineId, { from: range.to, to: range.from }, 0));
  await assert.rejects(telemetryApi.listMachinePoints(machineId, range, 0), /different machine UUID/);
  assert.equal(calls, 1);

  response = { machineId: otherMachineId, status: 'ONLINE' };
  await assert.rejects(telemetryApi.getLatestHeartbeat(machineId), /different machine UUID/);
  assert.equal(calls, 2);
});
