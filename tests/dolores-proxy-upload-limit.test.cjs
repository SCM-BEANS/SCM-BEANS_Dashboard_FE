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
