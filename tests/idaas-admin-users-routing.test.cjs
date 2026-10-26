const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function loadTypescript(relativePath, mocks = {}) {
  const fileName = join(__dirname, '..', relativePath);
  const source = readFileSync(fileName, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const mockedRequire = (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  const loaded = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(mockedRequire, loaded.exports, loaded);
  return loaded.exports;
}

const passSchema = { parse: (value) => value, safeParse: (value) => ({ success: true, data: value }) };
const userSchemas = new Proxy({}, {
  get: (_target, name) => name === 'AdminUserIdSchema'
    ? { parse(value) {
      if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
        throw new Error('invalid user UUID');
      }
      return value;
    } }
    : passSchema,
});

test('Admin user operations use the IDaaS routes on the shared /api/v1 client', async () => {
  const calls = [];
  const axiosClient = {
    get: async (...args) => { calls.push(['GET', ...args]); return { data: args[0] === '/admin/users' ? { items: [] } : { id: args[0].split('/').at(-1) } }; },
    post: async (...args) => { calls.push(['POST', ...args]); return { data: args[0].includes('/temporary-password') ? { temporaryPassword: 'one-time' } : { user: { id: '00000000-0000-4000-8000-000000000101' } } }; },
    patch: async (...args) => { calls.push(['PATCH', ...args]); return { data: { id: args[0].split('/').at(-1) } }; },
    delete: async (...args) => { calls.push(['DELETE', ...args]); return { data: undefined }; },
  };
  const { adminUsersApi } = loadTypescript('src/apis/admin-users.api.ts', {
    '@/lib/http': { axiosClient },
    '@/lib/api-errors': { AccountCreatedResponseValidationError: class extends Error {} },
    '@/schema/admin-users.schema': userSchemas,
  });
  const signal = new AbortController().signal;
  const userId = '00000000-0000-4000-8000-000000000101';
  const createRequest = { name: 'Moderator User', email: 'moderator@example.com', role: 'moderator' };
  const updateRequest = { status: 'ACTIVE' };

  await adminUsersApi.list({ page: 1, page_size: 20 }, signal);
  await adminUsersApi.getById(userId, signal);
  await adminUsersApi.create(createRequest);
  await adminUsersApi.update(userId, updateRequest);
  await adminUsersApi.disable(userId);
  await adminUsersApi.reissueTemporaryPassword(userId);

  assert.deepEqual(calls, [
    ['GET', '/admin/users', { params: { page: 1, page_size: 20 }, signal }],
    ['GET', `/admin/users/${userId}`, { signal }],
    ['POST', '/admin/users', createRequest],
    ['PATCH', `/admin/users/${userId}`, updateRequest],
    ['DELETE', `/admin/users/${userId}`],
    ['POST', `/admin/users/${userId}/temporary-password/reissue`, {}],
  ]);
  assert.ok(calls.every(([, url]) => url.startsWith('/admin/users')));
  await assert.rejects(adminUsersApi.getById('not-a-uuid'));
  assert.equal(calls.length, 6, 'invalid UUIDs must be rejected before reaching IDaaS');
});

test('admin route catalog points to the current Pages Router account and menu pages', () => {
  const path = loadTypescript('src/routes/path.ts');
  const routeMocks = {
    './path': path,
    '@/text/home/home-messages': { HOME_MESSAGES: { NAVIGATION: { ITEMS: [] }, FOOTER: { PRODUCT_LINKS: [], DISCOVERY_LINKS: [] } } },
    '@/text/admin/admin-messages': { ADMIN_MESSAGES: { NAVIGATION: new Proxy({}, { get: (_target, key) => String(key) }) } },
    '@/text/moderator/moderator-messages': { MODERATOR_MESSAGES: { NAVIGATION: new Proxy({}, { get: (_target, key) => String(key) }) } },
  };
  const routes = loadTypescript('src/routes/routes.ts', routeMocks);
  const root = join(__dirname, '..');

  assert.equal(path.PATH_ADMIN.USERS, '/admin/users');
  assert.equal(path.PATH_ADMIN.MENU, '/admin/menu');
  assert.ok(routes.ADMIN_ENABLED_PATHS.has(path.PATH_ADMIN.USERS));
  assert.ok(routes.ADMIN_ENABLED_PATHS.has(path.PATH_ADMIN.MENU));
  assert.ok(routes.ADMIN_NAVIGATION_LINKS.some((link) => link.HREF === path.PATH_ADMIN.USERS));
  assert.ok(routes.ADMIN_NAVIGATION_LINKS.some((link) => link.HREF === path.PATH_ADMIN.MENU));
  assert.ok(existsSync(join(root, 'src', 'pages', 'admin', 'users.page.tsx')));
  assert.ok(existsSync(join(root, 'src', 'pages', 'admin', 'menu.page.tsx')));
});
