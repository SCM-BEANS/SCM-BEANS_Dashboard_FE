const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const { z } = require('zod');

function loadTypescript(relativePath, mocks = {}) {
  const fileName = join(__dirname, '..', relativePath);
  const source = readFileSync(fileName, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });
  const loaded = { exports: {} };
  const mockedRequire = (id) => Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : require(id);
  new Function('require', 'exports', 'module', outputText)(mockedRequire, loaded.exports, loaded);
  return loaded.exports;
}

test('all admin user endpoints use the IDaaS transport rather than the Dolores proxy', async () => {
  const idaasCalls = [];
  const { adminUsersApi } = loadTypescript('src/apis/idaas/adminUsers.api.ts', {
    './client': {
      requestIdaas: (config) => { idaasCalls.push(config); return Promise.resolve({ source: 'idaas' }); },
    },
    '@/schemas/idaas/adminUsers': {
      AdminUserCreateRequestSchema: { parse: (value) => value },
      AdminUserCreateResponseSchema: {},
      AdminUserListParamsSchema: { parse: (value) => value },
      AdminUserListResponseSchema: {},
      AdminUserSchema: {},
      AdminUserTemporaryPasswordResponseSchema: {},
      AdminUserUpdateRequestSchema: { parse: (value) => value },
      AdminUserUpdateResponseSchema: {},
    },
  });
  const signal = new AbortController().signal;
  const userId = '00000000-0000-4000-8000-000000000101';

  await adminUsersApi.list({ page: 1, page_size: 20 }, signal);
  await adminUsersApi.getById(userId, signal);
  await adminUsersApi.create({ name: 'Moderator User', email: 'moderator@example.com', role: 'moderator' });
  await adminUsersApi.update(userId, { status: 'ACTIVE' });
  await adminUsersApi.disable(userId);
  await adminUsersApi.reissueTemporaryPassword(userId);

  assert.deepEqual(idaasCalls, [{
    method: 'GET',
    url: '/admin/users',
    params: { page: 1, page_size: 20 },
    signal,
  }, {
    method: 'GET',
    url: '/admin/users/' + userId,
    signal,
  }, {
    method: 'POST',
    url: '/admin/users',
    data: { name: 'Moderator User', email: 'moderator@example.com', role: 'moderator' },
  }, {
    method: 'PATCH',
    url: '/admin/users/' + userId,
    data: { status: 'ACTIVE' },
  }, {
    method: 'DELETE',
    url: '/admin/users/' + userId,
  }, {
    method: 'POST',
    url: '/admin/users/' + userId + '/temporary-password/reissue',
  }]);
});

test('IDaaS request helper forwards relative routes through the shared IDaaS client and validates responses', async () => {
  const calls = [];
  const { requestIdaas } = loadTypescript('src/apis/idaas/client.ts', {
    '@/lib/axios/axiosClient': {
      request: async (config) => { calls.push(config); return { ready: true }; },
    },
  });
  const responseSchema = z.object({ ready: z.boolean() });

  assert.deepEqual(await requestIdaas({ method: 'GET', url: '/admin/users' }, responseSchema), { ready: true });
  assert.deepEqual(calls, [{ method: 'GET', url: '/admin/users' }]);
  await assert.rejects(
    requestIdaas({ method: 'GET', url: 'http://localhost:8082/api/v1/admin/users' }, responseSchema),
    /relative to the configured API/
  );
});

test('legacy role-specific account creation URLs resolve to one shared create view', () => {
  const { resolveAdminAccountView } = loadTypescript('src/routes/query.ts');

  assert.equal(resolveAdminAccountView('create'), 'create');
  assert.equal(resolveAdminAccountView('create-customer'), 'create');
  assert.equal(resolveAdminAccountView('create-moderator'), 'create');
  assert.equal(resolveAdminAccountView('create-technician'), 'create');
});

test('admin menu opens the recipe list directly and redirects the old overview view', () => {
  const { resolveAdminMenuView } = loadTypescript('src/routes/query.ts');

  assert.equal(resolveAdminMenuView(undefined), 'items');
  assert.equal(resolveAdminMenuView('list'), 'items');
  assert.equal(resolveAdminMenuView('detail'), 'detail');
});
