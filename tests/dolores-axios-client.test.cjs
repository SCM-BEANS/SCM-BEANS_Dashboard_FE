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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const requestInterceptors = [];
  const responseInterceptors = [];
  const calls = [];
  const cookieWrites = [];
  const cookieRemovals = [];
  const client = function (config) {
    calls.push({ method: 'retry', config });
    if (options.retryError) return Promise.reject(options.retryError);
    return Promise.resolve({ data: 'retried' });
  };
  client.interceptors = {
    request: { use: (fulfilled, rejected) => requestInterceptors.push({ fulfilled, rejected }) },
    response: { use: (fulfilled, rejected) => responseInterceptors.push({ fulfilled, rejected }) },
  };
  client.post = async (...args) => {
    calls.push({ method: 'POST', args });
    if (options.refreshError) throw options.refreshError;
    return options.refreshResponse ?? { data: { access_token: 'refreshed-access-token', expires_in: 900 } };
  };
  const axios = {
    create: (config) => { client.defaults = config; return client; },
    isAxiosError: (error) => Boolean(error?.isAxiosError),
  };
  const cookies = {
    get: () => 'current-access-token',
    set: (...args) => cookieWrites.push(args),
    remove: (...args) => cookieRemovals.push(args),
  };
  const mocks = {
    axios: { __esModule: true, default: axios },
    'js-cookie': { __esModule: true, default: cookies },
    '@/routes/path': { PATH_AUTH: { LOGIN: '/login' } },
    '@/schema/auth.schema': { LoginSuccessResponseSchema: { parse: (value) => value } },
  };
  const loaded = { exports: {} };
  const mockedRequire = (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  new Function('require', 'exports', 'module', outputText)(mockedRequire, loaded.exports, loaded);
  return { ...loaded.exports, calls, client, cookieWrites, cookieRemovals, requestInterceptors, responseInterceptors };
}

function headerBag(values = {}) {
  const data = { ...values };
  return {
    values: data,
    set(name, value) { data[name] = value; },
    delete(name) { delete data[name]; },
  };
}

test('shared HTTP client has separate IDaaS and Dolores base paths', () => {
  const http = loadHttp();
  assert.equal(http.axiosClient.defaults.baseURL, '/api/v1');
  assert.equal(http.DOLORES_API_BASE_URL, '/api/dolores/v1');
  assert.equal(http.axiosClient.defaults.timeout, 10000);
  assert.equal(http.axiosClient.defaults.withCredentials, true);
});

test('request interceptor adds bearer auth to protected requests and removes it from login', async () => {
  const http = loadHttp();
  const previousWindow = global.window;
  global.window = { location: { protocol: 'http:', pathname: '/login', assign() {} } };

  try {
    const protectedHeaders = headerBag();
    const protectedRequest = { url: '/machines', baseURL: http.DOLORES_API_BASE_URL, headers: protectedHeaders };
    await http.requestInterceptors[0].fulfilled(protectedRequest);
    assert.equal(protectedHeaders.values.Authorization, 'Bearer current-access-token');

    const loginHeaders = headerBag({ Authorization: 'stale-token' });
    await http.requestInterceptors[0].fulfilled({ url: '/auth/login', headers: loginHeaders });
    assert.equal(Object.hasOwn(loginHeaders.values, 'Authorization'), false);
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
});

test('Dolores 401 refreshes through IDaaS once and preserves the Dolores base URL for retry', async () => {
  const http = loadHttp({ refreshResponse: { data: {
    access_token: 'refreshed-access-token', expires_in: 3600, refresh_token: 'never-store-this',
  } } });
  const previousWindow = global.window;
  global.window = { location: { protocol: 'https:', pathname: '/moderator/machines', assign() {} } };

  try {
    const requestHeaders = headerBag();
    const originalRequest = {
      url: '/machines', baseURL: http.DOLORES_API_BASE_URL, responseType: 'blob', headers: requestHeaders,
    };
    const result = await http.responseInterceptors[0].rejected({
      config: originalRequest,
      response: { status: 401 },
    });

    assert.deepEqual(result, { data: 'retried' });
    assert.equal(originalRequest._retry, true);
    assert.equal(requestHeaders.values.Authorization, 'Bearer refreshed-access-token');
    assert.deepEqual(http.calls.map(({ method }) => method), ['POST', 'retry']);
    assert.deepEqual(http.calls[0].args, ['/auth/refresh', {}]);
    assert.equal(http.calls[1].config.baseURL, '/api/dolores/v1');
    assert.equal(http.calls[1].config.responseType, 'blob');
    assert.deepEqual(http.cookieWrites.map(([name]) => name), ['access_token']);
    assert.equal(http.cookieWrites[0][2].secure, true);
    assert.deepEqual(http.cookieRemovals, []);
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
});

test('a retried Dolores request cannot refresh twice', async () => {
  const http = loadHttp({ retryError: { isAxiosError: true, response: { status: 401 } } });
  const previousWindow = global.window;
  global.window = { location: { protocol: 'http:', pathname: '/moderator', assign() {} } };

  try {
    const request = { url: '/machines', baseURL: http.DOLORES_API_BASE_URL, headers: headerBag(), _retry: true };
    const error = { config: request, response: { status: 401 } };
    await assert.rejects(http.responseInterceptors[0].rejected(error), (result) => result === error);
    assert.deepEqual(http.calls, []);
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
});
