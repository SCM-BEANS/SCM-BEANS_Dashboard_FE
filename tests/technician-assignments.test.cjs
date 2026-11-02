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

const technicianId = '00000000-0000-4000-8000-000000000001';
const machineId = '00000000-0000-4000-8000-000000000002';
const ownerId = '00000000-0000-4000-8000-000000000003';
const assignment = {
  id: '00000000-0000-4000-8000-000000000004',
  idaasUserId: technicianId,
  machineId,
  ownerId,
  active: true,
  assignedAt: '2026-10-31T10:00:00Z',
  revokedAt: null,
};

test('Technician machine access uses the IDaaS UUID path and validates assignment identity', async () => {
  const calls = [];
  const axiosClient = {
    post: async (url, body, config) => {
      calls.push({ method: 'POST', url, body, config });
      return { data: assignment };
    },
  };
  const machineSchema = loadTypescript('src/schema/machines.schema.ts');
  const profileSchema = loadTypescript('src/schema/profiles.schema.ts');
  const responseSchema = loadTypescript('src/schema/technician-assignments.schema.ts');
  const { technicianAssignmentsApi } = loadTypescript('src/apis/technician-assignments.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/machines.schema': machineSchema,
    '@/schema/profiles.schema': profileSchema,
    '@/schema/technician-assignments.schema': responseSchema,
  });

  assert.deepEqual(await technicianAssignmentsApi.assign(technicianId, machineId), assignment);
  assert.deepEqual(calls, [{
    method: 'POST',
    url: `/technician-assignments/${technicianId}/machines/${machineId}`,
    body: undefined,
    config: { baseURL: '/api/dolores/v1' },
  }]);
  await assert.rejects(technicianAssignmentsApi.assign('invalid-profile', machineId));
  await assert.rejects(technicianAssignmentsApi.assign(technicianId, 'invalid-machine'));
  assert.equal(calls.length, 1);
});

test('Technician machine access revoke sends DELETE and accepts the no-content response', async () => {
  const calls = [];
  const axiosClient = {
    delete: async (url, config) => calls.push({ method: 'DELETE', url, config }),
  };
  const machineSchema = loadTypescript('src/schema/machines.schema.ts');
  const profileSchema = loadTypescript('src/schema/profiles.schema.ts');
  const responseSchema = loadTypescript('src/schema/technician-assignments.schema.ts');
  const { technicianAssignmentsApi } = loadTypescript('src/apis/technician-assignments.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/machines.schema': machineSchema,
    '@/schema/profiles.schema': profileSchema,
    '@/schema/technician-assignments.schema': responseSchema,
  });

  await technicianAssignmentsApi.revoke(technicianId, machineId);
  assert.deepEqual(calls, [{
    method: 'DELETE',
    url: `/technician-assignments/${technicianId}/machines/${machineId}`,
    config: { baseURL: '/api/dolores/v1' },
  }]);
});

test('assignment response identity mismatch is rejected', async () => {
  const axiosClient = {
    post: async () => ({ data: { ...assignment, machineId: ownerId } }),
  };
  const machineSchema = loadTypescript('src/schema/machines.schema.ts');
  const profileSchema = loadTypescript('src/schema/profiles.schema.ts');
  const responseSchema = loadTypescript('src/schema/technician-assignments.schema.ts');
  const { technicianAssignmentsApi } = loadTypescript('src/apis/technician-assignments.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/machines.schema': machineSchema,
    '@/schema/profiles.schema': profileSchema,
    '@/schema/technician-assignments.schema': responseSchema,
  });

  await assert.rejects(
    technicianAssignmentsApi.assign(technicianId, machineId),
    /different Technician or machine/,
  );
});
