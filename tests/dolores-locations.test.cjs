const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function loadTypescript(relativePath) {
  const fileName = join(__dirname, '..', relativePath);
  const source = readFileSync(fileName, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(require, module.exports, module);
  return module.exports;
}

const { withTenantRequestSlot } = loadTypescript('src/hooks/dolores/tenantRequestLimiter.ts');
const { StoreLocationListSchema, unwrapLocations } = loadTypescript('src/schemas/dolores/locations.ts');
const location = { id: '00000000-0000-4000-8000-000000000002', name: 'Store A' };

test('location response accepts complete list shapes and rejects incomplete pages', () => {
  for (const response of [[location], { data: [location] }, { locations: [location] }, { content: [location], last: true }]) {
    const parsed = StoreLocationListSchema.parse(response);
    assert.equal(unwrapLocations(parsed)[0].name, 'Store A');
  }
  assert.equal(StoreLocationListSchema.safeParse({ content: [location], last: false }).success, false);
  assert.equal(StoreLocationListSchema.safeParse({ data: [location], hasNext: true }).success, false);
  assert.equal(StoreLocationListSchema.safeParse({ message: 'unknown response' }).success, false);
});

test('location fan-out never starts more than five requests at once', async () => {
  let active = 0;
  let maximum = 0;
  const requests = Array.from({ length: 13 }, (_, index) => withTenantRequestSlot(new AbortController().signal, async () => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    return index;
  }));
  assert.deepEqual(await Promise.all(requests), Array.from({ length: 13 }, (_, index) => index));
  assert.equal(maximum, 5);
});

test('an aborted queued request never starts', async () => {
  const release = [];
  let started = 0;
  const running = Array.from({ length: 5 }, () => withTenantRequestSlot(new AbortController().signal, () => {
    started += 1;
    return new Promise((resolve) => release.push(resolve));
  }));
  const controller = new AbortController();
  const queued = withTenantRequestSlot(controller.signal, async () => { started += 1; });
  controller.abort();
  await assert.rejects(queued, { name: 'AbortError' });
  assert.equal(started, 5);
  release.forEach((resolve) => resolve(undefined));
  await Promise.all(running);
});
