const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = join(__dirname, '..');
const loginCookie = 'refresh_token=server-secret; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Strict';

function loadRoute(relativePath, fetchImpl = async () => {
  throw new Error('Unexpected upstream request');
}, env = {}) {
  const fileName = join(projectRoot, relativePath);
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
  const mocks = {
    'next/server': {
      NextResponse: {
        json: (body, options = {}) => new Response(JSON.stringify(body), {
          status: options.status || 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      },
    },
    '@/lib/axios/idaasTarget': {
      getIdaasApiBaseUrl: async () => 'http://idaas.test/api/v1',
    },
  };
  const mockedRequire = (id) => Object.prototype.hasOwnProperty.call(mocks, id)
    ? mocks[id]
    : require(id);
  new Function('require', 'exports', 'module', 'fetch', 'process', outputText)(
    mockedRequire,
    loaded.exports,
    loaded,
    fetchImpl,
    { env }
  );
  return loaded.exports;
}

function request(path, method = 'POST', headers = {}) {
  const url = new URL('http://dashboard.test/api/v1/' + path);
  return {
    method,
    nextUrl: url,
    headers: new Headers(headers),
    arrayBuffer: async () => new TextEncoder().encode('{}').buffer,
  };
}

function upstream(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

test('login proxy removes the refresh token from browser JSON and preserves Set-Cookie', async () => {
  const calls = [];
  const route = loadRoute('src/app/api/v1/[...path]/route.ts', async (target, options) => {
    calls.push({ target, options });
    return upstream(JSON.stringify({
      access_token: 'browser-access',
      refresh_token: 'server-secret',
      expires_in: 900,
    }), 200, { 'Set-Cookie': loginCookie, 'Cache-Control': 'no-store' });
  });
  const response = await route.POST(
    request('auth/login', 'POST', { Cookie: 'existing=value' }),
    { params: Promise.resolve({ path: ['auth', 'login'] }) }
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { access_token: 'browser-access', expires_in: 900 });
  assert.equal(response.headers.get('set-cookie'), loginCookie);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].target, 'http://idaas.test/api/v1/auth/login');
  assert.equal(calls[0].options.headers.get('cookie'), 'existing=value');
});

test('login proxy strips refresh token from JSON error bodies and fails closed on malformed success', async () => {
  const errorRoute = loadRoute('src/app/api/v1/[...path]/route.ts', async () => upstream(
    JSON.stringify({ error: 'invalid', refresh_token: 'must-not-escape' }),
    401
  ));
  const context = { params: Promise.resolve({ path: ['auth', 'login'] }) };
  const errorResponse = await errorRoute.POST(request('auth/login'), context);
  assert.equal(errorResponse.status, 401);
  assert.deepEqual(await errorResponse.json(), { error: 'invalid' });

  const malformedRoute = loadRoute('src/app/api/v1/[...path]/route.ts', async () => upstream(
    'invalid-json-with-server-secret',
    200,
    { 'Set-Cookie': loginCookie }
  ));
  const malformedResponse = await malformedRoute.POST(request('auth/login'), context);
  assert.equal(malformedResponse.status, 502);
  assert.equal(malformedResponse.headers.get('set-cookie'), null);
  assert.doesNotMatch(await malformedResponse.text(), /server-secret|invalid-json/);
});

test('other IDaaS routes retain their upstream response contract', async () => {
  const route = loadRoute('src/app/api/v1/[...path]/route.ts', async () => upstream(
    JSON.stringify({ ready: true, refresh_token: 'untouched-for-other-routes' }),
    200
  ));
  const response = await route.GET(
    request('users/me', 'GET'),
    { params: Promise.resolve({ path: ['users', 'me'] }) }
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ready: true,
    refresh_token: 'untouched-for-other-routes',
  });
});

test('local logout expires scoped and legacy root refresh cookies without calling IDaaS', async () => {
  const route = loadRoute('src/app/api/v1/auth/logout/route.ts');
  const response = await route.POST(request('auth/logout', 'POST', {
    Origin: 'http://dashboard.test',
    Cookie: 'refresh_token=opaque',
  }));

  assert.equal(response.status, 204);
  assert.equal(await response.text(), '');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 2);
  assert.ok(cookies.some((value) => value.includes('Path=/api/v1/auth')));
  assert.ok(cookies.some((value) => value.includes('Path=/;')));
  for (const cookie of cookies) {
    assert.match(cookie, /^refresh_token=/);
    assert.match(cookie, /Max-Age=0/i);
    assert.match(cookie, /Expires=/i);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /Secure/i);
    assert.match(cookie, /SameSite=Strict/i);
    assert.doesNotMatch(cookie, /opaque/);
  }
});

test('local logout uses configured cookie path and rejects unsafe configuration or foreign origin', async () => {
  const configured = loadRoute('src/app/api/v1/auth/logout/route.ts', undefined, {
    IDAAS_REFRESH_COOKIE_PATH: '/custom/auth',
  });
  const configuredResponse = await configured.POST(request('auth/logout'));
  assert.equal(configuredResponse.status, 204);
  assert.ok(configuredResponse.headers.getSetCookie().some((value) => value.includes('Path=/custom/auth')));

  const invalid = loadRoute('src/app/api/v1/auth/logout/route.ts', undefined, {
    IDAAS_REFRESH_COOKIE_PATH: '/bad; Domain=evil.test',
  });
  const invalidResponse = await invalid.POST(request('auth/logout'));
  assert.equal(invalidResponse.status, 500);
  assert.equal(invalidResponse.headers.getSetCookie().length, 0);

  const foreignResponse = await configured.POST(request('auth/logout', 'POST', {
    Origin: 'https://other.test',
  }));
  assert.equal(foreignResponse.status, 403);
  assert.equal(foreignResponse.headers.getSetCookie().length, 0);
});

test('local logout accepts the browser Origin when Next normalizes nextUrl to localhost', async () => {
  const route = loadRoute('src/app/api/v1/auth/logout/route.ts');
  const normalizedRequest = request('auth/logout', 'POST', {
    Origin: 'http://127.0.0.1:43110',
    Host: '127.0.0.1:43110',
    'X-Forwarded-Proto': 'http',
  });
  normalizedRequest.nextUrl = new URL('http://localhost:43110/api/v1/auth/logout');

  const response = await route.POST(normalizedRequest);
  assert.equal(response.status, 204);
  assert.equal(response.headers.getSetCookie().length, 2);
});
