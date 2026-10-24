const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function loadHttp(options = {}) {
  const fileName = join(__dirname, '..', 'src', 'lib', 'http.ts');
  const source = readFileSync(fileName, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });

  const calls = [];
  const requestInterceptors = [];
  const responseInterceptors = [];
  const cookieWrites = [];
  const cookieRemovals = [];
  const cookieValues = { access_token: 'old-access' };
  const client = function (config) {
    calls.push({ type: 'retry', config });
    return Promise.resolve({ data: 'retried' });
  };
  client.interceptors = {
    request: { use: (fulfilled, rejected) => requestInterceptors.push({ fulfilled, rejected }) },
    response: { use: (fulfilled, rejected) => responseInterceptors.push({ fulfilled, rejected }) },
  };
  client.post = async (...args) => {
    calls.push({ type: 'post', args });
    if (options.refreshError) throw options.refreshError;
    return options.refreshResponse ?? { data: { access_token: 'fresh-access', expires_in: 900 } };
  };

  const axios = {
    create: (config) => { client.defaults = config; return client; },
    isAxiosError: (error) => Boolean(error?.isAxiosError),
  };
  const mocks = {
    axios: { __esModule: true, default: axios },
    'js-cookie': { __esModule: true, default: {
      get: (name) => cookieValues[name],
      set: (...args) => cookieWrites.push(args),
      remove: (...args) => cookieRemovals.push(args),
    } },
    '@/routes/path': { PATH_AUTH: { LOGIN: '/login' } },
    '@/schema/auth.schema': {
      LoginSuccessResponseSchema: {
        parse(value) {
          if (!value || typeof value.access_token !== 'string' || !Number.isInteger(value.expires_in)) {
            throw new Error('invalid login response');
          }
          return value;
        },
      },
    },
  };
  const loaded = { exports: {} };
  const mockedRequire = (id) => Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : require(id);
  new Function('require', 'exports', 'module', outputText)(mockedRequire, loaded.exports, loaded);

  return {
    ...loaded.exports,
    calls,
    client,
    cookieWrites,
    cookieRemovals,
    requestInterceptors,
    responseInterceptors,
    cookieValues,
  };
}

function headers(initial = {}) {
  const values = { ...initial };
  return {
    values,
    set(name, value) { values[name] = value; },
    delete(name) { delete values[name]; },
  };
}

test('shared HTTP client keeps logout unauthenticated and does not refresh a logout 401', async () => {
  const http = loadHttp();
  assert.equal(http.axiosClient.defaults.baseURL, '/api/v1');
  assert.equal(http.axiosClient.defaults.withCredentials, true);

  const config = { url: '/auth/logout', headers: headers({ Authorization: 'Bearer old-access' }) };
  assert.equal(await http.requestInterceptors[0].fulfilled(config), config);
  assert.equal(Object.hasOwn(config.headers.values, 'Authorization'), false);

  const unauthorized = {
    config,
    response: { status: 401 },
  };
  await assert.rejects(http.responseInterceptors[0].rejected(unauthorized), (error) => error === unauthorized);
  assert.deepEqual(http.calls, []);
  assert.deepEqual(http.cookieRemovals, []);
});

test('shared client refreshes IDaaS once and retries the original Dolores request on its own base URL', async () => {
  const http = loadHttp({ refreshResponse: { data: {
    access_token: 'fresh-access', expires_in: 600, refresh_token: 'server-only-token',
  } } });
  const previousWindow = global.window;
  global.window = { location: { protocol: 'http:', pathname: '/admin', assign() {} } };

  try {
    const requestHeaders = headers();
    const originalRequest = {
      url: '/machines',
      baseURL: http.DOLORES_API_BASE_URL,
      headers: requestHeaders,
    };
    const result = await http.responseInterceptors[0].rejected({
      config: originalRequest,
      response: { status: 401 },
    });

    assert.deepEqual(result, { data: 'retried' });
    assert.equal(originalRequest._retry, true);
    assert.equal(requestHeaders.values.Authorization, 'Bearer fresh-access');
    assert.deepEqual(http.calls.map((call) => call.type), ['post', 'retry']);
    assert.deepEqual(http.calls[0].args, ['/auth/refresh', {}]);
    assert.equal(http.calls[1].config.baseURL, '/api/dolores/v1');
    assert.deepEqual(http.cookieWrites.map(([name]) => name), ['access_token']);
    assert.deepEqual(http.cookieRemovals, []);
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
});

test('refresh authorization failure clears only the access cookie and redirects to login', async () => {
  const refreshError = { isAxiosError: true, response: { status: 401 } };
  const http = loadHttp({ refreshError });
  const previousWindow = global.window;
  const redirects = [];
  global.window = { location: { protocol: 'http:', pathname: '/admin', assign: (path) => redirects.push(path) } };

  try {
    const unauthorized = {
      config: { url: '/admin/users', headers: headers() },
      response: { status: 401 },
    };
    await assert.rejects(http.responseInterceptors[0].rejected(unauthorized), (error) => error === refreshError);
    assert.deepEqual(http.cookieRemovals, [['access_token', { path: '/' }]]);
    assert.deepEqual(redirects, ['/login']);
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
});
