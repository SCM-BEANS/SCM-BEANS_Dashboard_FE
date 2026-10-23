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

const { TelemetryPointListSchema } = loadTypescript('src/schemas/dolores/telemetry.ts');

test('telemetry point response accepts the backend DTO and preserves flexible values', () => {
  const response = [
    {
      timestamp: '2026-10-20T08:15:00Z',
      field: 'temperature',
      value: 92.5,
      tenantId: '00000000-0000-4000-8000-000000000001',
      machineId: '00000000-0000-4000-8000-000000000002',
      subState: 'BREWING',
    },
    {
      timestamp: '2026-10-20T08:15:01Z',
      field: 'state',
      value: 'READY',
      tenantId: '00000000-0000-4000-8000-000000000001',
      machineId: '00000000-0000-4000-8000-000000000002',
      subState: null,
    },
  ];

  assert.deepEqual(TelemetryPointListSchema.parse(response), response);
});

test('telemetry point response accepts an empty list and rejects a null body', () => {
  assert.deepEqual(TelemetryPointListSchema.parse([]), []);
  assert.equal(TelemetryPointListSchema.safeParse(null).success, false);
});
