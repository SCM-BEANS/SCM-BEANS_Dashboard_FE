const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const { z } = require('zod');

function loadClient() {
  const fileName = join(__dirname, '..', 'src', 'apis', 'dolores', 'client.ts');
  const source = readFileSync(fileName, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });

  const createdConfigs = [];
  const calls = [];
  const requestInterceptors = [];
  const responseInterceptors = [];
  const cookieWrites = [];
  const cookieRemovals = [];
  const responseQueue = [];
  let token = 'access-token';

  const instance = {
    interceptors: {
      request: { use: (fulfilled, rejected) => requestInterceptors.push({ fulfilled, rejected }) },
      response: { use: (fulfilled, rejected) => responseInterceptors.push({ fulfilled, rejected }) },
    },
    request: async (config) => {
      calls.push(config);
      return responseQueue.shift();
    },
    get(url, config) {
      return this.request({ ...config, method: 'GET', url });
    },
    post(url, data, config) {
      return this.request({ ...config, method: 'POST', url, data });
    },
  };

  const axios = {
    create: (config) => {
      createdConfigs.push(config);
      return instance;
    },
    isCancel: (error) => error?.isCancel === true,
    isAxiosError: (error) => error?.isAxiosError === true,
  };
  const cookies = {
    get: () => token,
    set: (...args) => cookieWrites.push(args),
    remove: (name) => cookieRemovals.push(name),
  };
  const sharedClientCalls = [];
  let sharedClientResponse = { access_token: 'refreshed-access-token' };
  const sharedClient = {
    post: async (...args) => {
      sharedClientCalls.push(args);
      return sharedClientResponse;
    },
  };
  const mocks = {
    axios: { __esModule: true, default: axios },
    'js-cookie': { __esModule: true, default: cookies },
    zod: require('zod'),
    '@/lib/axios/axiosClient': { __esModule: true, default: sharedClient },
    '@/constants/endpoints': { AUTH: { REFRESH: '/auth/refresh' } },
    '@/routes/path': { PATH_AUTH: { login: '/login' } },
  };
  const loaded = { exports: {} };
  const mockedRequire = (id) => Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : require(id);
  new Function('require', 'exports', 'module', outputText)(mockedRequire, loaded.exports, loaded);

  return {
    ...loaded.exports,
    calls,
    cookieWrites,
    cookieRemovals,
    createdConfigs,
    instance,
    requestInterceptors,
    responseInterceptors,
    responseQueue,
    setToken(value) { token = value; },
    setSharedClientResponse(value) { sharedClientResponse = value; },
    sharedClientCalls,
  };
}

function makeRequestConfig() {
  const values = {};
  return {
    headers: { set: (name, value) => { values[name] = value; } },
    values,
  };
}

test('dedicated client retains Dolores configuration and validates JSON responses', async () => {
  const client = loadClient();
  assert.deepEqual(client.createdConfigs, [{
    baseURL: '/api/dolores/v1',
    timeout: 10000,
    headers: { Accept: 'application/json' },
  }]);
  assert.equal(typeof client.doloresAxiosClient.get, 'function');
  assert.equal(typeof client.doloresAxiosClient.post, 'function');

  const signal = new AbortController().signal;
  client.responseQueue.push({ data: ['direct'] });
  assert.deepEqual(await client.doloresAxiosClient.get('/direct', { signal }), { data: ['direct'] });
  assert.deepEqual(client.calls[0], { signal, method: 'GET', url: '/direct' });

  const schema = z.array(z.string());
  assert.deepEqual(client.parseDoloresResponse(['parsed'], schema), ['parsed']);
  assert.throws(
    () => client.parseDoloresResponse({ invalid: true }, schema),
    (error) => error instanceof client.DoloresApiError && error.kind === 'invalid_response'
  );

  const requestInterceptor = client.requestInterceptors[0].fulfilled;
  assert.throws(
    () => requestInterceptor({ ...makeRequestConfig(), url: 'https://example.test/alerts' }),
    (error) => error instanceof client.DoloresApiError && error.kind === 'invalid_request'
  );
  assert.equal(client.calls.length, 1);
});

test('request interceptor attaches the access token and rejects a missing token', async () => {
  const client = loadClient();
  const requestInterceptor = client.requestInterceptors[0].fulfilled;
  const config = { ...makeRequestConfig(), url: '/alerts' };

  assert.equal(await requestInterceptor(config), config);
  assert.equal(config.values.Authorization, 'Bearer access-token');

  client.setToken(undefined);
  assert.throws(
    () => requestInterceptor({ ...makeRequestConfig(), url: '/alerts' }),
    (error) => error instanceof client.DoloresApiError && error.kind === 'unauthenticated'
  );
});

test('response interceptor maps Dolores failures, refreshes once on 401, and passes cancellation through', async () => {
  const client = loadClient();
  const rejectResponse = client.responseInterceptors[0].rejected;

  await assert.rejects(
    rejectResponse({ isAxiosError: true, response: { status: 403 } }),
    (error) => error instanceof client.DoloresApiError && error.kind === 'forbidden' && error.status === 403
  );

  const requestConfig = makeRequestConfig();
  const unauthorized = {
    isAxiosError: true,
    config: { ...requestConfig, headers: requestConfig.headers },
    response: { status: 401 },
  };
  client.responseQueue.push({ data: ['retried'] });
  const retriedResponse = await rejectResponse(unauthorized);
  assert.deepEqual(retriedResponse, { data: ['retried'] });
  assert.equal(unauthorized.config._retry, true);
  assert.equal(requestConfig.values.Authorization, 'Bearer refreshed-access-token');
  assert.deepEqual(client.sharedClientCalls, [['/auth/refresh', {}]]);
  assert.equal(client.cookieWrites[0][0], 'access_token');
  assert.deepEqual(client.cookieWrites.map(([name]) => name), ['access_token']);

  const cancellation = { isCancel: true };
  await assert.rejects(rejectResponse(cancellation), (error) => error === cancellation);
});

test('Dolores refresh failure preserves its error contract without JS refresh-cookie removal', async () => {
  const client = loadClient();
  client.setSharedClientResponse({});
  const rejectResponse = client.responseInterceptors[0].rejected;
  const requestConfig = makeRequestConfig();
  const unauthorized = {
    isAxiosError: true,
    config: { ...requestConfig, headers: requestConfig.headers },
    response: { status: 401 },
  };
  // A missing refreshed access token exercises the existing failure branch.
  await assert.rejects(
    rejectResponse(unauthorized),
    (error) => error instanceof client.DoloresApiError && error.kind === 'unauthenticated'
  );
  assert.deepEqual(client.cookieRemovals, ['access_token']);
  assert.equal(client.sharedClientCalls.length, 1);
});

test('direct Dolores Axios requests keep binary response handling on the dedicated client', async () => {
  const client = loadClient();
  const blob = new Blob(['pdf']);
  client.responseQueue.push({ data: blob });

  const response = await client.doloresAxiosClient.get('/files/1', {
    headers: { Accept: '*/*' },
    responseType: 'blob',
  });
  assert.equal(response.data, blob);
  assert.deepEqual(client.calls, [{
    method: 'GET',
    url: '/files/1',
    headers: { Accept: '*/*' },
    responseType: 'blob',
  }]);
});
