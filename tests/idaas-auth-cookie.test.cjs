const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function loadRoute(fetchImpl, env = {}) {
  const fileName = join(__dirname, '..', 'src', 'pages', 'api', 'v1', '[...path].page.ts');
  const source = readFileSync(fileName, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const loaded = { exports: {} };
  new Function('require', 'exports', 'module', 'fetch', 'process', outputText)(
    require,
    loaded.exports,
    loaded,
    fetchImpl,
    { env },
  );
  return loaded.exports.default;
}

function request(path, method = 'POST', headers = {}, body = '{}') {
  return {
    method,
    query: { path: path.split('/') },
    url: `/${path}?trace=test`,
    headers: { host: 'dashboard.test', ...headers },
    async *[Symbol.asyncIterator]() {
      if (body !== undefined) yield Buffer.from(body);
    },
  };
}

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    getHeader(name) { return this.headers[name.toLowerCase()]; },
    json(value) { this.body = Buffer.from(JSON.stringify(value)); return this; },
    end(value) { this.body = value === undefined ? Buffer.alloc(0) : Buffer.from(value); return this; },
    jsonBody() { return JSON.parse(this.body.toString('utf8')); },
    textBody() { return this.body.toString('utf8'); },
  };
}

function upstream(body, status = 200, headers = {}) {
  return new Response(body, { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

test('Pages Router login proxy removes refresh_token from JSON and preserves upstream cookie', async () => {
  const calls = [];
  const handler = loadRoute(async (target, options) => {
    calls.push({ target: target.toString(), options });
    return upstream(JSON.stringify({ access_token: 'browser-access', refresh_token: 'server-secret', expires_in: 900 }), 200, {
      'Set-Cookie': 'refresh_token=server-secret; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Strict',
    });
  }, { IDAAS_API_LOCAL_URL: 'http://idaas.test/api/v1' });
  const req = request('auth/login', 'POST', { cookie: 'existing=value', 'content-type': 'application/json' }, '{"email":"user@example.test"}');
  const res = responseRecorder();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.jsonBody(), { access_token: 'browser-access', expires_in: 900 });
  assert.match(res.getHeader('set-cookie')[0], /^refresh_token=server-secret;/);
  assert.equal(res.getHeader('cache-control'), 'no-store');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].target, 'http://idaas.test/api/v1/auth/login?trace=test');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.get('cookie'), 'existing=value');
  assert.equal(Buffer.from(calls[0].options.body).toString('utf8'), '{"email":"user@example.test"}');
});

test('auth proxy strips refresh tokens from error JSON and fails closed on malformed successful JSON', async () => {
  const errorHandler = loadRoute(async () => upstream(
    JSON.stringify({ error: 'invalid', refresh_token: 'must-not-escape' }), 401,
  ));
  const errorRes = responseRecorder();
  await errorHandler(request('auth/login'), errorRes);
  assert.equal(errorRes.statusCode, 401);
  assert.deepEqual(errorRes.jsonBody(), { error: 'invalid' });
  assert.doesNotMatch(errorRes.textBody(), /must-not-escape/);

  const malformedHandler = loadRoute(async () => upstream('invalid-json-with-server-secret', 200, {
    'Set-Cookie': 'refresh_token=server-secret; Path=/api/v1/auth; HttpOnly; Secure',
  }));
  const malformedRes = responseRecorder();
  await malformedHandler(request('auth/refresh'), malformedRes);
  assert.equal(malformedRes.statusCode, 502);
  assert.equal(malformedRes.getHeader('set-cookie'), undefined);
  assert.deepEqual(malformedRes.jsonBody(), { error: 'Invalid IDaaS authentication response' });
  assert.doesNotMatch(malformedRes.textBody(), /server-secret|invalid-json/);
});

test('non-auth IDaaS proxy routes preserve their upstream JSON contract', async () => {
  const handler = loadRoute(async () => upstream(JSON.stringify({ ready: true, refresh_token: 'other-route-field' })));
  const res = responseRecorder();
  await handler(request('users/me', 'GET', {}, undefined), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.jsonBody(), { ready: true, refresh_token: 'other-route-field' });
});

test('logout is proxied upstream and does not synthesize local cookie clearing', async () => {
  const calls = [];
  const handler = loadRoute(async (target, options) => {
    calls.push({ target: target.toString(), options });
    return new Response(null, { status: 204 });
  }, { IDAAS_API_LOCAL_URL: 'http://idaas.test/api/v1' });
  const res = responseRecorder();
  await handler(request('auth/logout', 'POST', { cookie: 'refresh_token=opaque' }, '{}'), res);

  assert.equal(res.statusCode, 204);
  assert.equal(res.body.length, 0);
  assert.equal(res.getHeader('set-cookie'), undefined);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].target, 'http://idaas.test/api/v1/auth/logout?trace=test');
  assert.equal(calls[0].options.headers.get('cookie'), 'refresh_token=opaque');
});

test('proxy rejects invalid path segments before contacting IDaaS', async () => {
  let calls = 0;
  const handler = loadRoute(async () => { calls += 1; return upstream('{}'); });
  const req = request('admin/users');
  req.query.path = ['..', 'users'];
  const res = responseRecorder();
  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.jsonBody(), { error: 'Invalid API path' });
  assert.equal(calls, 0);
});
