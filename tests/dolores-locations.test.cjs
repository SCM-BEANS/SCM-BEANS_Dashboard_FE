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
const tenantId = '00000000-0000-4000-8000-000000000002';
const locationId = '00000000-0000-4000-8000-000000000003';
const location = { id: locationId, ownerId, tenantId, name: 'Store A', active: true, machineCount: 2 };

test('location response accepts complete list shapes and rejects incomplete pages', () => {
  const { LocationListSchema, unwrapLocations } = loadTypescript('src/schema/locations.schema.ts');
  for (const response of [[location], { data: [location] }, { locations: [location] }, { content: [location], last: true }]) {
    const parsed = LocationListSchema.parse(response);
    assert.equal(unwrapLocations(parsed)[0].name, 'Store A');
  }
  assert.equal(LocationListSchema.safeParse({ content: [location], last: false }).success, false);
  assert.equal(LocationListSchema.safeParse({ data: [location], hasNext: true }).success, false);
  assert.equal(LocationListSchema.safeParse({ message: 'unknown response' }).success, false);
});

test('tenant list uses Dolores tenantId filter, validates returned scope, and keeps Owner list params', async () => {
  const schema = loadTypescript('src/schema/locations.schema.ts');
  const calls = [];
  const responses = [[location], [location]];
  const axiosClient = {
    get: async (url, config) => {
      calls.push({ url, config });
      return { data: responses.shift() };
    },
  };
  const { locationsApi } = loadTypescript('src/apis/locations.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/locations.schema': schema,
  });

  assert.deepEqual(await locationsApi.listByTenant(tenantId), [location]);
  assert.deepEqual(await locationsApi.list({ ownerId, activeOnly: true }), [location]);
  assert.deepEqual(calls, [
    { url: '/locations', config: { baseURL: '/api/dolores/v1', params: { tenantId, activeOnly: false }, signal: undefined } },
    { url: '/locations', config: { baseURL: '/api/dolores/v1', params: { ownerId, activeOnly: true }, signal: undefined } },
  ]);
});

test('tenant list rejects cross-tenant data and invalid IDs before an API request', async () => {
  const schema = loadTypescript('src/schema/locations.schema.ts');
  let calls = 0;
  let response = [{ ...location, tenantId: '00000000-0000-4000-8000-000000000099' }];
  const axiosClient = { get: async () => { calls += 1; return { data: response }; } };
  const { locationsApi } = loadTypescript('src/apis/locations.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/locations.schema': schema,
  });
  await assert.rejects(locationsApi.listByTenant(tenantId), /outside the requested tenant scope/);
  await assert.rejects(locationsApi.listByTenant('tenant-fixture'));
  assert.equal(calls, 1);

  response = [{ ...location, tenantId: null }];
  assert.deepEqual(await locationsApi.listByTenant(tenantId), [response[0]]);
});

test('location detail uses UUID endpoint and rejects an identity mismatch', async () => {
  const schema = loadTypescript('src/schema/locations.schema.ts');
  const responses = [{ ...location }, { ...location, id: '00000000-0000-4000-8000-000000000004' }];
  const calls = [];
  const axiosClient = { get: async (url, config) => { calls.push({ url, config }); return { data: responses.shift() }; } };
  const { locationsApi } = loadTypescript('src/apis/locations.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/locations.schema': schema,
  });
  assert.deepEqual(await locationsApi.getById(locationId), location);
  await assert.rejects(locationsApi.getById(locationId), /different location/);
  await assert.rejects(locationsApi.getById('S-018'));
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, `/locations/${locationId}`);
});
