const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function load(relativePath, mocks) {
  const fileName = join(__dirname, '..', relativePath);
  const source = readFileSync(fileName, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const loaded = { exports: {} };
  const mockedRequire = (id) => Object.prototype.hasOwnProperty.call(mocks, id)
    ? mocks[id]
    : require(id);
  new Function('require', 'exports', 'module', outputText)(mockedRequire, loaded.exports, loaded);
  return loaded.exports;
}

function loadAuthService(post) {
  const removals = [];
  const cookies = {
    get: () => undefined,
    set: () => {},
    remove: (name) => removals.push(name),
  };
  const calls = [];
  const client = { post: async (...args) => {
    calls.push(args);
    return post(...args);
  } };
  const { authService } = load('src/services/auth.service.ts', {
    'js-cookie': { __esModule: true, default: cookies },
    '@/lib/axios/axiosClient': { __esModule: true, default: client },
    '@/constants/endpoints': { AUTH: { LOGOUT: '/auth/logout' } },
  });
  return { authService, calls, removals };
}

test('auth logout confirms the local route and removes only the JS access token', async () => {
  const auth = loadAuthService(async () => undefined);
  assert.equal(await auth.authService.logout(), true);
  assert.deepEqual(auth.calls, [['/auth/logout', {}]]);
  assert.deepEqual(auth.removals, ['access_token']);
});

test('auth logout reports an unavailable route while still clearing the access token', async () => {
  const auth = loadAuthService(async () => { throw new Error('timeout'); });
  assert.equal(await auth.authService.logout(), false);
  assert.deepEqual(auth.calls, [['/auth/logout', {}]]);
  assert.deepEqual(auth.removals, ['access_token']);
});

function loadSharedClient() {
  const calls = [];
  const cookies = { writes: [], removals: [], values: { access_token: 'old-access' } };
  const instance = function (config) {
    calls.push(['retry', config]);
    return Promise.resolve({ data: 'retried' });
  };
  instance.interceptors = {
    request: { use: (success) => { instance.request = success; } },
    response: { use: (success, failure) => {
      instance.response = success;
      instance.reject = failure;
    } },
  };
  instance.post = async (...args) => {
    calls.push(['post', ...args]);
    return { access_token: 'fresh-access', refresh_token: 'must-not-be-written' };
  };
  const axios = { create: (config) => {
    instance.config = config;
    return instance;
  } };
  load('src/lib/axios/axiosClient.ts', {
    axios: { __esModule: true, default: axios },
    'js-cookie': { __esModule: true, default: {
      get: (name) => cookies.values[name],
      set: (...args) => cookies.writes.push(args),
      remove: (name) => cookies.removals.push(name),
    } },
    '@/constants/endpoints': { AUTH: {
      LOGIN: '/auth/login', REFRESH: '/auth/refresh', LOGOUT: '/auth/logout',
    } },
    '@/routes/path': { PATH_AUTH: { login: '/login' } },
  });
  return { instance, calls, cookies };
}

test('IDaaS Axios keeps its route and does not retry logout after a 401', async () => {
  const client = loadSharedClient();
  assert.equal(client.instance.config.baseURL, '/api/v1');
  const rejection = { message: 'Unauthorized' };
  await assert.rejects(
    client.instance.reject({
      config: { url: '/auth/logout', headers: {} },
      response: { status: 401, data: rejection },
    }),
    (error) => error === rejection
  );
  assert.deepEqual(client.calls, []);
});

test('IDaaS refresh updates the access token and retries without writing a refresh cookie', async () => {
  const client = loadSharedClient();
  const originalRequest = { url: '/users/me', headers: {} };
  const result = await client.instance.reject({
    config: originalRequest,
    response: { status: 401, data: { message: 'Expired' } },
  });
  assert.deepEqual(result, { data: 'retried' });
  assert.deepEqual(client.calls.map((call) => call[0]), ['post', 'retry']);
  assert.equal(client.calls[0][1], '/auth/refresh');
  assert.equal(originalRequest.headers.Authorization, 'Bearer fresh-access');
  assert.deepEqual(client.cookies.writes.map(([name]) => name), ['access_token']);
  assert.deepEqual(client.cookies.removals, []);
});
