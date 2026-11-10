const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function loadTypescript(relativePath, mocks = {}) {
  const fileName = join(__dirname, '..', relativePath);
  const source = readFileSync(fileName, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  });
  const mockModule = { exports: {} };
  const mockedRequire = (id) => Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id]
    : id.startsWith('@/schema/') ? loadTypescript(`src/${id.slice(2)}.ts`, mocks) : (id === "@/lib/evidence-multipart" ? require("./evidence-multipart-helper.cjs") : require(id));
  new Function('require', 'exports', 'module', outputText)(mockedRequire, mockModule.exports, mockModule);
  return mockModule.exports;
}

const machineId = '00000000-0000-4000-8000-000000000002';
const otherMachineId = '00000000-0000-4000-8000-000000000003';
const tenantId = '00000000-0000-4000-8000-000000000001';
const range = { from: '2026-10-20T00:00:00+07:00', to: '2026-10-21T23:59:59+07:00' };

function loadTelemetrySchema() {
  return loadTypescript('src/schema/telemetry.schema.ts', {
    '@/schema/machines.schema': loadTypescript('src/schema/machines.schema.ts'),
  });
}

test('telemetry schemas validate explicit increasing ranges and preserve flexible values', () => {
  const schema = loadTelemetrySchema();
  const point = {
    timestamp: '2026-10-20T08:15:00Z',
    field: 'temperature',
    value: 92.5,
    tenantId,
    machineId,
    subState: 'BREWING',
  };
  assert.deepEqual(schema.TelemetryPointListSchema.parse([point]), [point]);
  assert.deepEqual(schema.TelemetryPointListSchema.parse([]), []);
  assert.equal(schema.TelemetryPointListSchema.safeParse(null).success, false);
  assert.equal(schema.TelemetryPointsParamsSchema.safeParse({ ...range, limit: 100, offset: 0 }).success, true);
  assert.equal(schema.TelemetryPointsParamsSchema.safeParse({ from: range.to, to: range.from, limit: 100, offset: 0 }).success, false);
});

test('telemetry bounds cap pages at 500 and reject ranges longer than thirty days', () => {
  const { TelemetryPointsParamsSchema } = loadTelemetrySchema();
  const thirtyDays = { from: '2026-10-01T00:00:00Z', to: '2026-10-31T00:00:00Z', limit: 500, offset: 100000 };
  assert.equal(TelemetryPointsParamsSchema.safeParse(thirtyDays).success, true);
  assert.equal(TelemetryPointsParamsSchema.safeParse({ ...thirtyDays, limit: 501 }).success, false);
  assert.equal(TelemetryPointsParamsSchema.safeParse({ ...thirtyDays, to: '2026-10-31T00:00:01Z' }).success, false);
  assert.equal(TelemetryPointsParamsSchema.safeParse({ ...thirtyDays, offset: 100001 }).success, false);
});

test('heartbeat lifecycle fields are typed while zero health and nullable state remain valid', () => {
  const { MachineHeartbeatSchema } = loadTelemetrySchema();
  const value = { machineId, status: 'OFFLINE', brewState: 'BREWING', sequenceNumber: 0, metricsJson: { temperature: 0 }, health: { ramUsedMb: 0, wifiRssiDbm: 0 } };
  assert.deepEqual(MachineHeartbeatSchema.parse(value), value);
  assert.equal(MachineHeartbeatSchema.safeParse({ ...value, sequenceNumber: 'zero' }).success, false);
  assert.equal(MachineHeartbeatSchema.safeParse({ ...value, brewState: 12 }).success, false);
  assert.equal(MachineHeartbeatSchema.safeParse({ ...value, brewState: null, sequenceNumber: null, health: null }).success, true);
});

test('heartbeat GPS validates coordinates while permitting absent, zero and equator/meridian readings', () => {
  const { MachineHeartbeatSchema } = loadTelemetrySchema();
  const base = { machineId, status: 'ONLINE' };
  for (const gps of [{}, { latitude: null, longitude: null }, { latitude: 0, longitude: 0 }, { latitude: 0, longitude: 106.7 }, { latitude: 10.7, longitude: 0 }, { latitude: 999, longitude: 106.7 }]) {
    assert.equal(MachineHeartbeatSchema.safeParse({ ...base, ...gps }).success, true);
  }
  for (const gps of [{ latitude: '10.7' }, { latitude: NaN }, { longitude: Infinity }]) {
    assert.equal(MachineHeartbeatSchema.safeParse({ ...base, ...gps }).success, false);
  }
});

test('shared heartbeat GPS distinguishes missing, valid, stale and incomplete locations', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { MachineHeartbeatPanel } = loadTypescript('src/components/machines/machine-heartbeat-panel.tsx', {
    './machine-connection-badge': { MachineConnectionBadge: ({ state }) => React.createElement('span', null, state) },
    './smart-iot-panel': { SmartIotPanel: ({ children }) => React.createElement('section', null, children) },
    './machines.module.css': { default: {} },
  });
  const render = (heartbeat) => renderToStaticMarkup(React.createElement(MachineHeartbeatPanel, { title: 'Machine', heartbeat: { machineId, ...heartbeat } }));
  for (const gps of [{ latitude: 0, longitude: 0 }, { latitude: null, longitude: null }, { latitude: 10.7 }, { latitude: 999, longitude: 106.7 }, { latitude: 10.7, longitude: -181 }]) {
    const html = render({ status: 'ONLINE', ...gps });
    assert.match(html, /Chưa ghi nhận vị trí/);
    assert.match(html, /kiểm tra quyền truy cập vị trí/);
    assert.doesNotMatch(html, /0\.000000/);
  }
  assert.match(render({ status: 'ONLINE', latitude: 0, longitude: 106.7 }), /0\.000000/);
  assert.match(render({ status: 'ONLINE', latitude: 0, longitude: 106.7 }), /106\.700000/);
  const stale = render({ status: 'OFFLINE', latitude: 10.7, longitude: 106.7 });
  assert.match(stale, /Tọa độ ghi nhận gần nhất/);
  assert.doesNotMatch(stale, /Máy đang kết nối nhưng/);
});

test('telemetry API sends a bounded page request with the selected machine UUID and range', async () => {
  const calls = [];
  const point = { timestamp: '2026-10-20T08:15:00Z', field: 'temperature', value: 92.5, tenantId, machineId };
  const axiosClient = {
    get: async (url, config) => { calls.push({ url, config }); return { data: url.endsWith('/points') ? [point] : { machineId, status: 'ONLINE' } }; },
  };
  const schemas = {
    '@/schema/machines.schema': loadTypescript('src/schema/machines.schema.ts'),
    '@/schema/telemetry.schema': loadTelemetrySchema(),
  };
  const { telemetryApi } = loadTypescript('src/apis/telemetry.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    ...schemas,
  });
  const signal = new AbortController().signal;
  assert.deepEqual(await telemetryApi.listMachinePoints(machineId, range, 100, signal), [point]);
  assert.deepEqual(await telemetryApi.getLatestHeartbeat(machineId, signal), { machineId, status: 'ONLINE' });
  assert.deepEqual(calls, [
    { url: `/telemetry-query/machines/${machineId}/points`, config: { baseURL: '/api/dolores/v1', params: { ...range, limit: 100, offset: 100 }, signal } },
    { url: `/telemetry-query/machines/${machineId}/heartbeats/latest`, config: { baseURL: '/api/dolores/v1', signal } },
  ]);
});

test('telemetry API rejects invalid machine IDs, reversed ranges, and mismatched response identity', async () => {
  let calls = 0;
  let response = [{ timestamp: '2026-10-20T08:15:00Z', field: 'temperature', value: 92.5, machineId: otherMachineId }];
  const axiosClient = { get: async () => { calls += 1; return { data: response }; } };
  const { telemetryApi } = loadTypescript('src/apis/telemetry.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/machines.schema': loadTypescript('src/schema/machines.schema.ts'),
    '@/schema/telemetry.schema': loadTelemetrySchema(),
  });
  await assert.rejects(telemetryApi.listMachinePoints('S-018', range, 0));
  await assert.rejects(telemetryApi.listMachinePoints(machineId, { from: range.to, to: range.from }, 0));
  await assert.rejects(telemetryApi.listMachinePoints(machineId, range, 0), /different machine UUID/);
  assert.equal(calls, 1);

  response = { machineId: otherMachineId, status: 'ONLINE' };
  await assert.rejects(telemetryApi.getLatestHeartbeat(machineId), /different machine UUID/);
  assert.equal(calls, 2);
});

test('Owner operations and Admin machine detail provide 24h, 7d, 30d and validated custom telemetry ranges', () => {
  const screens = [
    'src/pages/dashboard/machines/machine-operational-overview-screen.tsx',
    'src/pages/admin/machines/machine-detail-screen.tsx',
  ];
  for (const screen of screens) {
    const source = readFileSync(join(__dirname, '..', screen), 'utf8');
    assert.ok(/telemetryApi\.listMachinePoints/.test(source), `${screen} should use the documented points API`);
    assert.ok(/createTelemetryRange/.test(source), `${screen} should use the shared rolling-range controls`);
  }
  const panel = readFileSync(join(__dirname, '..', 'src/components/machines/telemetry-history-panel.tsx'), 'utf8');
  assert.ok(/24\s*(?:h|giờ|hours?)/i.test(panel), 'shared controls should offer a rolling 24 hour range');
  assert.ok(/7\s*(?:d|ngày|days?)/i.test(panel), 'shared controls should offer a rolling 7 day range');
  assert.ok(/30\s*(?:d|ngày|days?)/i.test(panel), 'shared controls should offer a rolling 30 day range');
  assert.ok(/datetime-local/.test(panel), 'shared controls should allow a custom date-time range');
  assert.ok(/Date\.parse\(from\)\s*>=\s*Date\.parse\(to\)/.test(panel), 'shared controls should reject malformed and reversed ranges before requesting data');
});

test('Owner and Admin telemetry history exposes returned fields, charts numeric values, and records nonnumeric points by timestamp', () => {
  const root = join(__dirname, '..');
  const screenSources = [
    'src/pages/dashboard/machines/machine-operational-overview-screen.tsx',
    'src/pages/admin/machines/machine-detail-screen.tsx',
  ].map((path) => readFileSync(join(root, path), 'utf8')).join('\n');
  const presentationSources = require('node:fs').readdirSync(join(root, 'src/components/machines'))
    .filter((name) => /\.(?:tsx?|css)$/.test(name))
    .map((name) => readFileSync(join(root, 'src/components/machines', name), 'utf8'))
    .join('\n');
  const source = `${screenSources}\n${presentationSources}`;

  assert.ok(/new Set\([\s\S]{0,240}\.field/.test(source), 'the field selector should be derived from received point fields');
  assert.ok(/typeof\s+\w+\.value\s*===\s*["']number["']/.test(source), 'only numeric telemetry values should be charted');
  assert.ok(/timestamp/.test(source), 'telemetry history should retain point timestamps');
  assert.ok(/(?:non.?numeric|nonnumeric|record|bản ghi)/i.test(source), 'nonnumeric values should be presented as timestamped records');
});

test('telemetry detail requests 100-point pages and loads later offsets only from an explicit action', () => {
  const root = join(__dirname, '..');
  for (const screen of [
    'src/pages/dashboard/machines/machine-operational-overview-screen.tsx',
    'src/pages/admin/machines/machine-detail-screen.tsx',
  ]) {
    const source = readFileSync(join(root, screen), 'utf8');
    assert.ok(/TELEMETRY_POINTS_PAGE_SIZE/.test(source), `${screen} should use the bounded 100-point page size`);
    assert.ok(/initialPageParam:\s*0/.test(source), `${screen} should begin at offset zero`);
    assert.ok(/fetchNextPage/.test(source), `${screen} should expose an explicit load-more action`);
    assert.ok(/getNextPageParam/.test(source), `${screen} should advance offsets by page after user action`);
  }
  assert.equal(loadTelemetrySchema().TelemetryPointsParamsSchema.parse({ ...range, limit: 100, offset: 0 }).limit, 100);
});

function renderTelemetryPanel(props) {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { TelemetryHistoryPanel } = loadTypescript('src/components/machines/telemetry-history-panel.tsx', {
    '@/components/table/data-table': { DataTable: () => React.createElement('div', null, 'records') },
    './machines.module.css': { default: {} },
  });
  return renderToStaticMarkup(React.createElement(TelemetryHistoryPanel, { range, onRangeChange() {}, loading: false, ...props }));
}

test('telemetry chart spaces irregular observations by actual timestamp and discloses partial coverage', () => {
  const points = [0, 1, 10].map((minute, index) => ({ machineId, field: 'temperature', value: index, timestamp: new Date(Date.UTC(2026, 10, 1, 0, minute)).toISOString() }));
  const html = renderTelemetryPanel({ points, hasMore: true, onLoadMore() {} });
  assert.match(html, /points="0,180 100,100 1000,20"/);
  assert.match(html, /Dữ liệu đã tải/);
  assert.match(html, /còn dữ liệu chưa tải/);
});

test('telemetry axis preserves tiny nonzero values instead of labelling them all zero', () => {
  const points = [0.0000001, 0.0000002].map((value, index) => ({ machineId, field: 'sensor', value, timestamp: new Date(Date.UTC(2026, 10, 1, 0, index)).toISOString() }));
  const html = renderTelemetryPanel({ points });
  assert.match(html, /1E-7/);
  assert.match(html, /2E-7/);
  assert.match(html, /1e-7/);
});

test('heartbeat shows zero health as historical separately from current connection and explicit Vietnam time', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { MachineHeartbeatPanel } = loadTypescript('src/components/machines/machine-heartbeat-panel.tsx', {
    './machine-connection-badge': { MachineConnectionBadge: ({ state }) => React.createElement('span', null, state) },
    './smart-iot-panel': { SmartIotPanel: ({ children }) => React.createElement('section', null, children) },
    './machines.module.css': { default: {} },
  });
  const html = renderToStaticMarkup(React.createElement(MachineHeartbeatPanel, {
    title: 'Machine', heartbeat: { machineId, status: 'OFFLINE', evaluatedAt: '2026-11-01T00:00:00Z', healthReportedAt: '2026-10-31T00:00:00Z', health: { ramUsedMb: 0, ramTotalMb: 0, wifiRssiDbm: 0 } },
  }));
  assert.match(html, /Sức khỏe ghi nhận gần nhất/);
  assert.match(html, /không phản ánh tình trạng hiện tại/);
  assert.match(html, /07:00/);
  assert.match(html, /0.*0.*MB/);
  assert.match(html, /Giờ Việt Nam/);
});

test('Technician monitoring waits for authenticated Smart IoT lookup and contains no offline review calls', () => {
  const source = readFileSync(join(__dirname, '..', 'src/pages/technician/machine-check/machine-detail-screen.tsx'), 'utf8');
  assert.match(source, /authScopedQuerySubject\("TECHNICIAN"\)/);
  assert.match(source, /telemetryApi\.getLatestHeartbeat/);
  assert.match(source, /telemetryApi\.listMachinePoints/);
  assert.match(source, /machine\.data\?\.machineType === "SMART_IOT"/);
  assert.match(source, /refetchIntervalInBackground: false/);
  assert.doesNotMatch(source, /offlineViolationReviewsApi/);
});

function complianceSample(overrides = {}) {
  return {
    machine_id: machineId,
    evaluated_days: 30,
    compliant_days: 0,
    missing_startup_days: 30,
    missing_closing_days: 30,
    compliance_percentage: 0,
    flagged_dates: ['2026-11-01'],
    ...overrides,
  };
}

function loadComplianceApi(axiosClient) {
  return loadTypescript('src/apis/machines.api.ts', {
    '@/lib/http': { axiosClient, DOLORES_API_BASE_URL: '/api/dolores/v1' },
    '@/schema/machines.schema': loadTypescript('src/schema/machines.schema.ts'),
    '@/schema/profiles.schema': loadTypescript('src/schema/profiles.schema.ts'),
  }).machinesApi;
}

test('cleaning compliance schemas preserve server zero and reject malformed required SLA fields', () => {
  const { MachineCleaningComplianceSchema: schema } = loadTypescript('src/schema/machines.schema.ts');
  const sample = complianceSample();
  assert.deepEqual(schema.parse(sample), sample);
  assert.equal(schema.safeParse(complianceSample({ evaluated_days: 0, missing_startup_days: 0, missing_closing_days: 0, flagged_dates: [] })).success, false);
  for (const key of Object.keys(sample)) {
    const missing = { ...sample };
    delete missing[key];
    assert.equal(schema.safeParse(missing).success, false, `${key} is required`);
  }
  for (const patch of [
    { machine_id: 'TEST12' }, { evaluated_days: -1 }, { compliant_days: -1 },
    { missing_startup_days: -1 }, { missing_closing_days: -1 },
    { compliant_days: 1.5 }, { compliance_percentage: -0.1 },
    { compliance_percentage: 100.1 }, { compliance_percentage: '0' },
    { flagged_dates: ['2026-02-30'] }, { flagged_dates: ['yesterday'] },
  ]) assert.equal(schema.safeParse(complianceSample(patch)).success, false, JSON.stringify(patch));
});

test('cleaning compliance days default to thirty and accept positive int32 without an invented short cap', () => {
  const { CleaningComplianceParamsSchema: schema } = loadTypescript('src/schema/machines.schema.ts');
  assert.deepEqual(schema.parse({}), { days: 30 });
  for (const days of [1, 7, 30, 365, 2147483647]) assert.equal(schema.safeParse({ days }).success, true);
  for (const days of [0, -1, 1.5, '30', null, 2147483648]) assert.equal(schema.safeParse({ days }).success, false);
});

test('cleaning compliance API forwards machine UUID, days and abort signal without deriving SLA from history', async () => {
  const calls = [];
  const sample = complianceSample({ evaluated_days: 7 });
  const api = loadComplianceApi({ get: async (url, config) => { calls.push({ url, config }); return { data: sample }; } });
  const signal = new AbortController().signal;
  assert.deepEqual(await api.getCleaningCompliance(machineId, 7, signal), sample);
  await api.getCleaningCompliance(machineId);
  assert.deepEqual(calls, [
    { url: `/machines/${machineId}/cleaning-compliance`, config: { baseURL: '/api/dolores/v1', params: { days: 7 }, signal } },
    { url: `/machines/${machineId}/cleaning-compliance`, config: { baseURL: '/api/dolores/v1', params: { days: 30 }, signal: undefined } },
  ]);
});

test('cleaning compliance rejects invalid inputs before HTTP and mismatched machine responses before display', async () => {
  let calls = 0;
  const api = loadComplianceApi({ get: async () => { calls += 1; return { data: complianceSample({ machine_id: otherMachineId }) }; } });
  await assert.rejects(api.getCleaningCompliance('TEST12', 30));
  await assert.rejects(api.getCleaningCompliance(machineId, 0));
  assert.equal(calls, 0);
  await assert.rejects(api.getCleaningCompliance(machineId, 30));
  assert.equal(calls, 1);
});

test('cleaning compliance preserves the server evaluated period when a longer requested period is clamped', async () => {
  const sample = complianceSample({ evaluated_days: 90 });
  const calls = [];
  const api = loadComplianceApi({ get: async (url, config) => { calls.push({ url, config }); return { data: sample }; } });
  assert.deepEqual(await api.getCleaningCompliance(machineId, 365), sample);
  assert.equal(calls[0].config.params.days, 365);
  assert.equal(calls.length, 1);
});

test('cleaning compliance API propagates forbidden, unavailable and cancelled requests without retries or fallback', async () => {
  const abort = new Error('Aborted');
  abort.name = 'AbortError';
  for (const error of [{ response: { status: 403 } }, { response: { status: 503 } }, abort]) {
    let calls = 0;
    const api = loadComplianceApi({ get: async () => { calls += 1; throw error; } });
    await assert.rejects(api.getCleaningCompliance(machineId, 30, new AbortController().signal), (actual) => actual === error);
    assert.equal(calls, 1);
  }
});
