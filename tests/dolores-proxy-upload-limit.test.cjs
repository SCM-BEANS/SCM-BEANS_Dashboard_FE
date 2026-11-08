const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function loadHandler(mocks) {
  const fileName = join(__dirname, '..', 'src/pages/api/dolores/v1/[...path].page.ts');
  const source = readFileSync(fileName, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const loaded = { exports: {} };
  const mockedRequire = (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  new Function('require', 'exports', 'module', outputText)(mockedRequire, loaded.exports, loaded);
  return loaded.exports.default;
}

test('Dolores proxy accepts a 20 MiB multipart proof with request overhead', async () => {
  const fetchCalls = [];
  const handler = loadHandler({
    '@/lib/server/backend-api-selection': {
      getBackendApiSelection: async () => ({ doloresBaseUrl: 'http://dolores.test', mode: 'local' }),
      preferLocalBackendApis: () => {},
    },
  });
  const originalFetch = global.fetch;
  const headers = new Headers();
  headers.getSetCookie = () => [];
  global.fetch = async (target, options) => {
    fetchCalls.push({ target: String(target), bodyBytes: options.body.byteLength });
    return { status: 200, headers, arrayBuffer: async () => Buffer.from('ok') };
  };

  const body = Buffer.alloc(20 * 1024 * 1024 + 1024);
  const req = {
    query: { path: ['billing', 'invoices', '00000000-0000-4000-8000-000000000002', 'payment-proofs'] },
    method: 'POST',
    headers: {},
    url: '/api/dolores/v1/billing/invoices/00000000-0000-4000-8000-000000000002/payment-proofs?amount=1',
    async *[Symbol.asyncIterator]() { yield body; },
  };
  const response = {
    statusCode: 0,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; },
    setHeader() {},
    end(value) { this.body = value; },
  };

  try {
    await handler(req, response);
  } finally {
    global.fetch = originalFetch;
  }

  assert.equal(response.statusCode, 200);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].bodyBytes, body.length);
  assert.match(fetchCalls[0].target, /payment-proofs\?amount=1$/);
});

const machineId = '00000000-0000-4000-8000-000000000002';
const certificateId = '00000000-0000-4000-8000-000000000003';

function proxyRequest(segments, method = 'GET', query = '') {
  return {
    query: { path: segments }, method,
    headers: { authorization: 'Bearer test-token' },
    url: `/api/dolores/v1/${segments.join('/')}${query}`,
    async *[Symbol.asyncIterator]() {},
  };
}

function proxyResponse() {
  return {
    statusCode: 0, body: undefined, headers: new Map(),
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; },
    setHeader(name, value) { this.headers.set(name.toLowerCase(), value); },
    end(value) { this.body = value; },
  };
}

function upstreamResponse(body = 'certificate bundle') {
  const headers = new Headers({ 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="machine.zip"' });
  headers.getSetCookie = () => [];
  return { status: 200, headers, arrayBuffer: async () => Buffer.from(body) };
}

test('identity reads and mutations pin the same explicit backend and never fall back on read failure', async () => {
  let automaticCalls = 0, fallbackCalls = 0;
  const handler = loadHandler({ '@/lib/server/backend-api-selection': {
    getExplicitBackendApiSelection: () => ({ doloresBaseUrl: 'http://remote.test', mode: 'remote' }),
    getBackendApiSelection: async () => { automaticCalls++; return { doloresBaseUrl: 'http://local.test', mode: 'local' }; },
    preferLocalBackendApis: () => { fallbackCalls++; return { doloresBaseUrl: 'http://local.test', mode: 'local' }; },
  } });
  const original = global.fetch;
  let calls = 0;
  try {
    for (const method of ['GET', 'POST', 'DELETE']) {
      global.fetch = async (url) => { calls++; assert.match(String(url), /^http:\/\/remote\.test/); return upstreamResponse(); };
      const res = proxyResponse();
      await handler(proxyRequest(['machines', machineId, 'telemetry-device-identity'], method), res);
      assert.equal(res.statusCode, 200);
    }
    global.fetch = async () => { calls++; throw new Error('remote unavailable'); };
    const res = proxyResponse();
    await handler(proxyRequest(['machines', machineId, 'telemetry-device-identity']), res);
    assert.equal(res.statusCode, 502);
    assert.equal(calls, 4);
    assert.equal(automaticCalls, 0);
    assert.equal(fallbackCalls, 0);
  } finally { global.fetch = original; }
});

test('certificate list, detail, download and mutations use explicit selection rather than automatic environment fallback', async () => {
  const originalFetch = global.fetch;
  const remote = { doloresBaseUrl: 'http://remote.test', mode: 'remote' };
  const local = { doloresBaseUrl: 'http://local.test', mode: 'local' };
  try {
    for (const [method, suffix] of [
      ['GET', []], ['GET', [certificateId]], ['GET', [certificateId, 'download']],
      ['POST', []], ['DELETE', [certificateId]],
    ]) {
      let explicitCalls = 0, automaticCalls = 0, fallbackCalls = 0;
      const handler = loadHandler({
        '@/lib/server/backend-api-selection': {
          getExplicitBackendApiSelection: () => { explicitCalls += 1; return remote; },
          getBackendApiSelection: async () => { automaticCalls += 1; return local; },
          preferLocalBackendApis: () => { fallbackCalls += 1; return local; },
        },
      });
      const calls = [];
      global.fetch = async (target, options) => { calls.push({ target: String(target), options }); return upstreamResponse(); };
      const res = proxyResponse();
      const segments = ['machines', machineId, 'certificates', ...suffix];
      await handler(proxyRequest(segments, method, '?format=zip'), res);
      assert.equal(res.statusCode, 200);
      assert.equal(explicitCalls, 1, `${method} ${suffix.join('/')} must pin the backend`);
      assert.equal(automaticCalls, 0);
      assert.equal(fallbackCalls, 0);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].target, `http://remote.test/api/v1/${segments.join('/')}?format=zip`);
      assert.equal(calls[0].options.headers.get('authorization'), 'Bearer test-token');
      assert.equal(calls[0].options.cache, 'no-store');
      assert.equal(res.headers.get('cache-control'), 'no-store');
      assert.equal(res.headers.get('content-type'), 'application/zip');
      assert.equal(res.headers.get('content-disposition'), 'attachment; filename="machine.zip"');
    }
  } finally { global.fetch = originalFetch; }
});

test('certificate requests fail closed before upstream when an explicit environment is unavailable', async () => {
  let fetchCalls = 0, automaticCalls = 0;
  const handler = loadHandler({
    '@/lib/server/backend-api-selection': {
      getExplicitBackendApiSelection: () => { throw new Error('Explicit backend mode required'); },
      getBackendApiSelection: async () => { automaticCalls += 1; return { doloresBaseUrl: 'http://local.test', mode: 'local' }; },
      preferLocalBackendApis: () => { throw new Error('Must not choose a fallback'); },
    },
  });
  const originalFetch = global.fetch;
  global.fetch = async () => { fetchCalls += 1; return upstreamResponse('UNEXPECTED_LOCAL_SECRET'); };
  const res = proxyResponse();
  try { await handler(proxyRequest(['machines', machineId, 'certificates', certificateId, 'download']), res); }
  finally { global.fetch = originalFetch; }
  assert.ok(res.statusCode >= 500 && res.statusCode < 600);
  assert.equal(fetchCalls, 0);
  assert.equal(automaticCalls, 0);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.doesNotMatch(JSON.stringify(res.body), /UNEXPECTED_LOCAL_SECRET/);
});

test('remote certificate transport failure never fetches local secrets or changes backend preference', async () => {
  const remote = { doloresBaseUrl: 'http://remote.test', mode: 'remote' };
  let fallbackCalls = 0;
  const handler = loadHandler({
    '@/lib/server/backend-api-selection': {
      getExplicitBackendApiSelection: () => remote,
      getBackendApiSelection: async () => remote,
      preferLocalBackendApis: () => { fallbackCalls += 1; return { doloresBaseUrl: 'http://local.test', mode: 'local' }; },
    },
  });
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (target) => {
    calls.push(String(target));
    if (String(target).startsWith('http://remote.test')) throw new Error('Network unavailable');
    return upstreamResponse('LOCAL_PRIVATE_KEY');
  };
  const res = proxyResponse();
  try { await handler(proxyRequest(['machines', machineId, 'certificates', certificateId, 'download']), res); }
  finally { global.fetch = originalFetch; }
  assert.equal(res.statusCode, 502);
  assert.equal(calls.length, 1);
  assert.equal(fallbackCalls, 0);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.doesNotMatch(JSON.stringify(res.body), /LOCAL_PRIVATE_KEY/);
});

test('ordinary machine reads retain the existing remote-to-local transport fallback', async () => {
  const remote = { doloresBaseUrl: 'http://remote.test', mode: 'remote' };
  const local = { doloresBaseUrl: 'http://local.test', mode: 'local' };
  let explicitCalls = 0, fallbackCalls = 0;
  const handler = loadHandler({
    '@/lib/server/backend-api-selection': {
      getExplicitBackendApiSelection: () => { explicitCalls += 1; return remote; },
      getBackendApiSelection: async () => remote,
      preferLocalBackendApis: () => { fallbackCalls += 1; return local; },
    },
  });
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (target) => {
    calls.push(String(target));
    if (String(target).startsWith('http://remote.test')) throw new Error('Network unavailable');
    return upstreamResponse('ordinary machine');
  };
  const res = proxyResponse();
  try { await handler(proxyRequest(['machines', machineId]), res); }
  finally { global.fetch = originalFetch; }
  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 2);
  assert.equal(fallbackCalls, 1);
  assert.equal(explicitCalls, 0);
});

function loadBackendSelection() {
  const fileName = join(__dirname, '..', 'src/lib/server/backend-api-selection.ts');
  const { outputText } = ts.transpileModule(readFileSync(fileName, 'utf8'), {
    fileName, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const loaded = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(require, loaded.exports, loaded);
  return loaded.exports;
}

test('explicit backend selection bypasses health auto-selection and requires a configured mode', async () => {
  const envKeys = ['BACKEND_API_MODE', 'IDAAS_API_LOCAL_URL', 'DOLORES_API_LOCAL_URL', 'IDAAS_API_IP_URL', 'DOLORES_API_IP_URL', 'DOLORES_API_URL'];
  const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const originalFetch = global.fetch;
  global.fetch = async () => { throw new Error('Explicit mode must not probe remote health'); };
  try {
    process.env.IDAAS_API_LOCAL_URL = 'http://local.test:4000/api/v1';
    process.env.DOLORES_API_LOCAL_URL = 'http://local.test:8082';
    process.env.IDAAS_API_IP_URL = 'http://remote.test:4000/api/v1';
    process.env.DOLORES_API_IP_URL = 'http://remote.test:8082';
    delete process.env.DOLORES_API_URL;
    const { getExplicitBackendApiSelection } = loadBackendSelection();
    assert.equal(typeof getExplicitBackendApiSelection, 'function');
    process.env.BACKEND_API_MODE = 'local';
    assert.equal((await getExplicitBackendApiSelection()).doloresBaseUrl, 'http://local.test:8082');
    process.env.BACKEND_API_MODE = 'remote';
    assert.equal((await getExplicitBackendApiSelection()).doloresBaseUrl, 'http://remote.test:8082');
    for (const mode of [undefined, 'auto', 'unexpected']) {
      if (mode === undefined) delete process.env.BACKEND_API_MODE;
      else process.env.BACKEND_API_MODE = mode;
      await assert.rejects(async () => getExplicitBackendApiSelection());
    }
    process.env.BACKEND_API_MODE = 'remote';
    delete process.env.DOLORES_API_IP_URL;
    await assert.rejects(async () => getExplicitBackendApiSelection());
    process.env.DOLORES_API_IP_URL = 'http://remote.test:8082';
    delete process.env.IDAAS_API_IP_URL;
    await assert.rejects(async () => getExplicitBackendApiSelection());
  } finally {
    global.fetch = originalFetch;
    for (const key of envKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
