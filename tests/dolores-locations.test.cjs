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
  const machineSchema = loadTypescript('src/schema/machines.schema.ts');
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
    '@/schema/machines.schema': machineSchema,
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
  const machineSchema = loadTypescript('src/schema/machines.schema.ts');
  let calls = 0;
  let response = [{ ...location, tenantId: '00000000-0000-4000-8000-000000000099' }];
  const axiosClient = { get: async () => { calls += 1; return { data: response }; } };
  const { locationsApi } = loadTypescript('src/apis/locations.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/locations.schema': schema,
    '@/schema/machines.schema': machineSchema,
  });
  await assert.rejects(locationsApi.listByTenant(tenantId), /outside the requested tenant scope/);
  await assert.rejects(locationsApi.listByTenant('tenant-fixture'));
  assert.equal(calls, 1);

  response = [{ ...location, tenantId: null }];
  assert.deepEqual(await locationsApi.listByTenant(tenantId), [response[0]]);
});

test('location detail uses UUID endpoint and rejects an identity mismatch', async () => {
  const schema = loadTypescript('src/schema/locations.schema.ts');
  const machineSchema = loadTypescript('src/schema/machines.schema.ts');
  const responses = [{ ...location }, { ...location, id: '00000000-0000-4000-8000-000000000004' }];
  const calls = [];
  const axiosClient = { get: async (url, config) => { calls.push({ url, config }); return { data: responses.shift() }; } };
  const { locationsApi } = loadTypescript('src/apis/locations.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/locations.schema': schema,
    '@/schema/machines.schema': machineSchema,
  });
  assert.deepEqual(await locationsApi.getById(locationId), location);
  await assert.rejects(locationsApi.getById(locationId), /different location/);
  await assert.rejects(locationsApi.getById('S-018'));
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, `/locations/${locationId}`);
});

test('location pages use owner scope and backend paging headers', async () => {
  const schemas = loadTypescript('src/schema/locations.schema.ts');
  const machineSchemas = loadTypescript('src/schema/machines.schema.ts');
  const calls = [];
  const axiosClient = {
    get: async (url, config) => {
      calls.push({ method: 'GET', url, config });
      return {
        data: [location],
        headers: { 'x-page': '1', 'x-page-size': '25', 'x-has-next': 'true' },
      };
    },
  };
  const { locationsApi } = loadTypescript('src/apis/locations.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/locations.schema': schemas,
    '@/schema/machines.schema': machineSchemas,
  });

  assert.deepEqual(await locationsApi.listPage({ ownerId, activeOnly: true, page: 1, size: 25 }), {
    items: [location], page: 1, size: 25, hasNext: true,
  });
  assert.deepEqual(calls[0], {
    method: 'GET', url: '/locations', config: {
      baseURL: '/api/dolores/v1',
      params: { ownerId, activeOnly: true, page: 1, size: 25 },
      signal: undefined,
    },
  });
});

test('location pages reject rows that omit or cross the requested Owner identity', async () => {
  const schemas = loadTypescript('src/schema/locations.schema.ts');
  const machineSchemas = loadTypescript('src/schema/machines.schema.ts');
  let response = [{ ...location, ownerId: null }];
  const axiosClient = { get: async () => ({ data: response, headers: {} }) };
  const { locationsApi } = loadTypescript('src/apis/locations.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/locations.schema': schemas,
    '@/schema/machines.schema': machineSchemas,
  });

  await assert.rejects(locationsApi.listPage({ ownerId }), /different Owner/);
  response = [{ ...location, ownerId: tenantId }];
  await assert.rejects(locationsApi.listPage({ ownerId }), /different Owner/);
});

test('machine-to-location assignment uses the documented path-only request and validates returned identity', async () => {
  const locationSchemas = loadTypescript('src/schema/locations.schema.ts');
  const machineSchemas = loadTypescript('src/schema/machines.schema.ts');
  const assignedMachine = { id: '00000000-0000-4000-8000-000000000004', ownerId, locationId };
  const calls = [];
  const axiosClient = {
    post: async (url, body, config) => {
      calls.push({ method: 'POST', url, body, config });
      return { data: assignedMachine };
    },
  };
  const { locationsApi } = loadTypescript('src/apis/locations.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/locations.schema': locationSchemas,
    '@/schema/machines.schema': machineSchemas,
  });

  assert.deepEqual(await locationsApi.assignMachine(locationId, assignedMachine.id), assignedMachine);
  assert.deepEqual(calls, [{
    method: 'POST',
    url: `/locations/${locationId}/machines/${assignedMachine.id}/assign`,
    body: undefined,
    config: { baseURL: '/api/dolores/v1' },
  }]);
  await assert.rejects(locationsApi.assignMachine('bad-location', assignedMachine.id));
  await assert.rejects(locationsApi.assignMachine(locationId, 'bad-machine'));
  assert.equal(calls.length, 1);
});

test('machine-to-location assignment rejects a response with the wrong machine or target location', async () => {
  const locationSchemas = loadTypescript('src/schema/locations.schema.ts');
  const machineSchemas = loadTypescript('src/schema/machines.schema.ts');
  const responses = [
    { id: '00000000-0000-4000-8000-000000000005', ownerId, locationId },
    { id: '00000000-0000-4000-8000-000000000004', ownerId, locationId: '00000000-0000-4000-8000-000000000006' },
  ];
  const axiosClient = { post: async () => ({ data: responses.shift() }) };
  const { locationsApi } = loadTypescript('src/apis/locations.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/locations.schema': locationSchemas,
    '@/schema/machines.schema': machineSchemas,
  });

  await assert.rejects(
    locationsApi.assignMachine(locationId, '00000000-0000-4000-8000-000000000004'),
    /different machine/,
  );
  await assert.rejects(
    locationsApi.assignMachine(locationId, '00000000-0000-4000-8000-000000000004'),
    /requested machine location/,
  );
});
