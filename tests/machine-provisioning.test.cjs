const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const machineId = '00000000-0000-4000-8000-000000000002';
const otherMachineId = '00000000-0000-4000-8000-000000000003';
const certificateId = '00000000-0000-4000-8000-000000000004';
const otherCertificateId = '00000000-0000-4000-8000-000000000005';
const baseURL = '/api/dolores/v1';

function load(relativePath, mocks = {}) {
  const fileName = join(__dirname, '..', relativePath);
  const { outputText } = ts.transpileModule(readFileSync(fileName, 'utf8'), {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const loaded = { exports: {} };
  const mockedRequire = (name) => Object.hasOwn(mocks, name) ? mocks[name]
    : name.startsWith('@/schema/') ? load(`src/${name.slice(2)}.ts`, mocks) : require(name);
  new Function('require', 'exports', 'module', outputText)(mockedRequire, loaded.exports, loaded);
  return loaded.exports;
}

function certificate(patch = {}) {
  return {
    id: certificateId, machineId, ownerId: null, commonName: 'TEST-KIOSK',
    fingerprint: 'TEST-FINGERPRINT', issuedAt: '2026-11-07T10:00:00',
    expiresAt: '2027-11-07T10:00:00', status: 'ACTIVE', ...patch,
  };
}

function certificatePage(items = [certificate()], patch = {}) {
  return { content: items, number: 0, size: 50, totalElements: items.length,
    totalPages: items.length ? 1 : 0, first: true, last: true, ...patch };
}

function schemas() {
  return load('src/schema/machine-certificates.schema.ts', {
    '@/schema/machines.schema': load('src/schema/machines.schema.ts'),
  });
}

function certificateApi(client) {
  return load('src/apis/machine-certificates.api.ts', {
    '@/lib/http': { axiosClient: client, DOLORES_API_BASE_URL: baseURL },
    '@/schema/machines.schema': load('src/schema/machines.schema.ts'),
    '@/schema/machine-certificates.schema': schemas(),
  }).machineCertificatesApi;
}

test('certificate schemas accept public metadata and local/offset timestamps while rejecting key material', () => {
  const s = schemas();
  assert.deepEqual(s.MachineCertificateSchema.parse(certificate()), certificate());
  assert.equal(s.MachineCertificateSchema.safeParse(certificate({ issuedAt: '2026-11-07T10:00:00Z' })).success, true);
  const detail = { ...certificate(), clientCrtPem: 'PUBLIC_CLIENT_CERT', caCrtPem: 'PUBLIC_CA_CERT' };
  assert.deepEqual(s.MachineCertificateDetailSchema.parse(detail), detail);
  for (const schema of [s.MachineCertificateSchema, s.MachineCertificateDetailSchema]) {
    const sample = schema === s.MachineCertificateSchema ? certificate() : detail;
    assert.equal(schema.safeParse({ ...sample, clientKeyPem: 'PRIVATE_TEST_KEY' }).success, false);
  }
  for (const patch of [{ machineId: 'SERIAL' }, { id: 'bad' }, { status: 'DELETED' }, { issuedAt: 'yesterday' }]) {
    assert.equal(s.MachineCertificateSchema.safeParse(certificate(patch)).success, false);
  }
});

test('certificate list uses bounded Spring Page metadata and an empty page is valid', () => {
  const s = schemas();
  assert.deepEqual(s.CertificateListParamsSchema.parse({}), { page: 0, size: 50 });
  for (const params of [{ page: -1 }, { size: 0 }, { size: 101 }, { status: 'DELETED' }]) {
    assert.equal(s.CertificateListParamsSchema.safeParse(params).success, false);
  }
  assert.deepEqual(s.MachineCertificatePageSchema.parse(certificatePage()), certificatePage());
  assert.deepEqual(s.MachineCertificatePageSchema.parse(certificatePage([])), certificatePage([]));
  assert.equal(s.MachineCertificatePageSchema.safeParse({ ...certificatePage(), number: undefined, page: 0 }).success, false);
});

test('certificate reads forward exact machine/certificate IDs, bounded filters and abort signal', async () => {
  const calls = [];
  const detail = { ...certificate(), clientCrtPem: 'PUBLIC_CLIENT_CERT', caCrtPem: 'PUBLIC_CA_CERT' };
  const api = certificateApi({ get: async (url, config) => {
    calls.push({ url, config }); return { status: 200, data: url.endsWith(certificateId) ? detail : certificatePage() };
  } });
  const signal = new AbortController().signal;
  assert.deepEqual(await api.list(machineId, { status: 'ACTIVE', page: 0, size: 50 }, signal), certificatePage());
  assert.deepEqual(await api.getById(machineId, certificateId, signal), detail);
  assert.equal(calls[0].url, `/machines/${machineId}/certificates`);
  assert.deepEqual(calls[0].config.params, { page: 0, size: 50, status: 'ACTIVE' });
  assert.equal(calls[0].config.baseURL, baseURL);
  assert.equal(calls[0].config.signal, signal);
  assert.equal(calls[1].url, `/machines/${machineId}/certificates/${certificateId}`);
  assert.equal(calls[1].config.signal, signal);
});

test('certificate input and response context checks stop wrong-machine, wrong-ID and wrong-page data', async () => {
  let calls = 0;
  let data = certificatePage([certificate({ machineId: otherMachineId })]);
  const api = certificateApi({ get: async () => { calls += 1; return { status: 200, data }; } });
  await assert.rejects(api.list('SERIAL', {}));
  await assert.rejects(api.getById(machineId, 'bad'));
  assert.equal(calls, 0);
  await assert.rejects(api.list(machineId, {}));
  data = certificatePage([], { number: 1 });
  await assert.rejects(api.list(machineId, { page: 0 }));
  data = { ...certificate({ id: otherCertificateId }), clientCrtPem: 'PUBLIC', caCrtPem: 'PUBLIC' };
  await assert.rejects(api.getById(machineId, certificateId));
});

test('certificate issuance sends no fabricated body, requires 201 and validates its machine', async () => {
  const calls = [];
  let status = 201, data = certificate();
  const api = certificateApi({ post: async (...args) => { calls.push(args); return { status, data }; } });
  assert.deepEqual(await api.issue(machineId), certificate());
  assert.equal(calls[0][0], `/machines/${machineId}/certificates`);
  assert.equal(calls[0][1], undefined);
  assert.equal(calls[0][2].baseURL, baseURL);
  status = 200;
  await assert.rejects(api.issue(machineId));
  status = 201; data = certificate({ machineId: otherMachineId });
  await assert.rejects(api.issue(machineId));
});

test('certificate deletion uses only the exact scoped endpoint and requires empty 204 success', async () => {
  const calls = [];
  let status = 204;
  const api = certificateApi({ delete: async (...args) => { calls.push(args); return { status }; } });
  await api.delete(machineId, certificateId);
  assert.equal(calls[0][0], `/machines/${machineId}/certificates/${certificateId}`);
  assert.equal(calls[0][1].baseURL, baseURL);
  await assert.rejects(api.delete(machineId, 'invalid'));
  assert.equal(calls.length, 1);
  status = 200;
  await assert.rejects(api.delete(machineId, certificateId));
});

test('bundle download validates ZIP/JSON and uses deterministic safe filenames without exposing key in result metadata', async () => {
  const calls = [];
  let blob = new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0])], { type: 'application/zip' });
  const api = certificateApi({ get: async (url, config) => {
    calls.push({ url, config }); return { status: 200, data: blob, headers: { 'content-type': blob.type, 'content-disposition': 'attachment; filename="../../unsafe.zip"' } };
  } });
  const signal = new AbortController().signal;
  const zip = await api.download(machineId, certificateId, 'zip', signal);
  assert.equal(zip.blob, blob);
  assert.equal(zip.filename, `machine-${machineId}-certificate-${certificateId}.zip`);
  assert.equal(calls[0].url, `/machines/${machineId}/certificates/${certificateId}/download`);
  assert.equal(calls[0].config.responseType, 'blob');
  assert.equal(calls[0].config.params.format, 'zip');
  assert.equal(calls[0].config.signal, signal);
  blob = new Blob([JSON.stringify({ caCrtPem: 'PUBLIC_CA', clientCrtPem: 'PUBLIC_CLIENT', clientKeyPem: 'PRIVATE_TEST_KEY' })], { type: 'application/json' });
  const json = await api.download(machineId, certificateId, 'json');
  assert.deepEqual(Object.keys(json).sort(), ['blob', 'filename']);
  assert.equal(json.filename, `machine-${machineId}-certificate-${certificateId}.json`);
  await assert.rejects(api.download(machineId, certificateId, 'exe'));
});

test('JSON errors and malformed/empty bundles cannot be saved as certificate files', async () => {
  let blob = new Blob([JSON.stringify({ error: 'Unavailable' })], { type: 'application/json' });
  const api = certificateApi({ get: async () => ({ status: 200, data: blob, headers: { 'content-type': blob.type } }) });
  await assert.rejects(api.download(machineId, certificateId, 'zip'));
  await assert.rejects(api.download(machineId, certificateId, 'json'));
  blob = new Blob(['not-a-zip'], { type: 'application/zip' });
  await assert.rejects(api.download(machineId, certificateId, 'zip'));
  blob = new Blob([], { type: 'application/zip' });
  await assert.rejects(api.download(machineId, certificateId, 'zip'));
  blob = new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], { type: 'text/html' });
  await assert.rejects(api.download(machineId, certificateId, 'zip'));
});

test('certificate denial, outage and cancellation propagate once without adapter fallback', async () => {
  for (const status of [403, 503]) {
    let calls = 0;
    const failure = Object.assign(new Error('Denied or unavailable'), { response: { status } });
    const api = certificateApi({ get: async () => { calls += 1; throw failure; } });
    await assert.rejects(api.list(machineId), (error) => error === failure);
    assert.equal(calls, 1);
  }
  const failure = new DOMException('Cancelled', 'AbortError');
  const api = certificateApi({ get: async () => { throw failure; } });
  await assert.rejects(api.download(machineId, certificateId), (error) => error === failure);
});

function identityApi(client) {
  return load('src/apis/machines.api.ts', {
    '@/lib/http': { axiosClient: client, DOLORES_API_BASE_URL: baseURL },
    '@/schema/machines.schema': load('src/schema/machines.schema.ts'),
    '@/schema/profiles.schema': load('src/schema/profiles.schema.ts'),
  }).machinesApi;
}

test('active identity GET validates machine, ACTIVE status and cancellation without swallowing 404', async () => {
  const calls = [];
  let data = { id: certificateId, machineId, deviceId: 'serial-test', status: 'ACTIVE', createdAt: '2026-11-07T10:00:00' };
  let failure;
  const api = identityApi({ get: async (...args) => { calls.push(args); if (failure) throw failure; return { status: 200, data }; } });
  const signal = new AbortController().signal;
  assert.equal(typeof api.getDeviceIdentity, 'function');
  assert.deepEqual(await api.getDeviceIdentity(machineId, signal), data);
  assert.equal(calls[0][0], `/machines/${machineId}/telemetry-device-identity`);
  assert.equal(calls[0][1].signal, signal);
  await assert.rejects(api.getDeviceIdentity('serial'));
  assert.equal(calls.length, 1);
  data = { ...data, machineId: otherMachineId };
  await assert.rejects(api.getDeviceIdentity(machineId));
  data = { ...data, machineId, status: 'REVOKED' };
  await assert.rejects(api.getDeviceIdentity(machineId));
  for (const status of [404, 403, 503]) {
    failure = Object.assign(new Error('read failed'), { response: { status } });
    await assert.rejects(api.getDeviceIdentity(machineId), (error) => error === failure);
  }
});

test('certificate detail preserves unavailable public PEM without accepting private keys', async () => {
  const data = { ...certificate(), clientCrtPem: null, caCrtPem: null };
  const api = certificateApi({ get: async () => ({ data }) });
  assert.deepEqual(await api.getById(machineId, certificateId), data);
  assert.equal(schemas().MachineCertificateDetailSchema.safeParse({ ...data, clientKeyPem: 'PRIVATE' }).success, false);
});

test('device identity schema rejects blank/oversized IDs and preserves explicit server identity', () => {
  const s = load('src/schema/machines.schema.ts');
  assert.deepEqual(s.MachineDeviceIdentityRequestSchema.parse({ deviceId: '  dev-test  ' }), { deviceId: 'dev-test' });
  for (const deviceId of ['', '   ', 'a'.repeat(256)]) assert.equal(s.MachineDeviceIdentityRequestSchema.safeParse({ deviceId }).success, false);
  const value = { id: certificateId, machineId, deviceId: 'dev-test', status: 'ACTIVE', createdAt: '2026-11-07T10:00:00Z' };
  assert.deepEqual(s.MachineDeviceIdentitySchema.parse(value), value);
});

test('device identity registration validates input/status/machine and revoke sends exact DELETE', async () => {
  const calls = [];
  let data = { id: certificateId, machineId, deviceId: 'dev-test', status: 'ACTIVE', createdAt: '2026-11-07T10:00:00Z' };
  let status = 201;
  const api = identityApi({
    post: async (...args) => { calls.push(args); return { status, data }; },
    delete: async (...args) => { calls.push(args); return { status: 204 }; },
  });
  await assert.rejects(api.provisionDeviceIdentity(machineId, { deviceId: '' }));
  assert.equal(calls.length, 0);
  assert.deepEqual(await api.provisionDeviceIdentity(machineId, { deviceId: ' dev-test ' }), data);
  assert.equal(calls[0][0], `/machines/${machineId}/telemetry-device-identity`);
  assert.deepEqual(calls[0][1], { deviceId: 'dev-test' });
  status = 200;
  await assert.rejects(api.provisionDeviceIdentity(machineId, { deviceId: 'dev-test' }));
  status = 201; data = { ...data, machineId: otherMachineId };
  await assert.rejects(api.provisionDeviceIdentity(machineId, { deviceId: 'dev-test' }));
  await api.revokeDeviceIdentity(machineId);
  assert.equal(calls.at(-1)[0], `/machines/${machineId}/telemetry-device-identity`);
});

const historyRange = { from: '2026-11-01T00:00:00Z', to: '2026-11-09T00:00:00Z' };
const historyBrew = { id: certificateId, eventId: otherCertificateId, machineId, machineSerialNumber: 'TEST-KIOSK', recipeName: 'Espresso', brewedAt: '2026-11-06T08:00:00Z', receivedAt: null };
const historyCleaning = { id: certificateId, eventId: otherCertificateId, machineId, machineSerialNumber: 'TEST-KIOSK', cleaningType: 'CLOSING', startedAt: '2026-11-06T08:00:00Z', finishedAt: '2026-11-06T08:15:00Z', coffeeCleaned: true, milkCleaned: false, heatingCompleted: true, groupheadPurged: true, status: 'COMPLETED', notes: null };
const historySpringPage = (content, patch = {}) => ({ content, number: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0, first: true, last: true, ...patch });

test('machine history date inputs normalize inclusive UTC dates while ISO instants retain exclusive end', () => {
  const s = load('src/schema/owner-analytics.schema.ts');
  const result = s.MachineHistoryParamsSchema.parse({ from: '2026-11-01', to: '2026-11-08' });
  assert.equal(Date.parse(result.from), Date.parse(historyRange.from));
  assert.equal(Date.parse(result.to), Date.parse(historyRange.to));
  assert.equal(result.page, 0);
  assert.equal(result.size, 20);
  const iso = s.MachineHistoryParamsSchema.parse(historyRange);
  assert.equal(Date.parse(iso.to), Date.parse(historyRange.to));
  for (const input of [
    { from: '2026-02-30', to: '2026-03-01' },
    { from: '2026-11-09', to: '2026-11-08' },
    { ...historyRange, ownerId: otherMachineId },
    { ...historyRange, page: -1 },
    { ...historyRange, size: 101 },
    { ...historyRange, sort: 'ownerId,asc' },
  ]) assert.equal(s.MachineHistoryParamsSchema.safeParse(input).success, false);
});

test('machine brew and cleaning Spring pages normalize number to page without accepting broken pagination', () => {
  const s = load('src/schema/owner-analytics.schema.ts');
  for (const [schema, row] of [[s.MachineBrewRecordsPageSchema, historyBrew], [s.MachineCleaningRecordsPageSchema, historyCleaning]]) {
    const result = schema.parse(historySpringPage([row]));
    assert.deepEqual(result, { content: [row], page: 0, size: 20, totalElements: 1, totalPages: 1, first: true, last: true });
    assert.deepEqual(schema.parse(historySpringPage([])).content, []);
    for (const bad of [
      { content: [row] },
      historySpringPage([row], { number: undefined, page: 0 }),
      historySpringPage([row], { size: 0 }),
      historySpringPage([row], { totalPages: 9 }),
      historySpringPage([row], { first: false }),
      historySpringPage([{ ...row, machineId: 'not-a-uuid' }]),
    ]) assert.equal(schema.safeParse(bad).success, false);
  }
});

test('operator machine histories use scoped read endpoints with fixed sorting, normalized range and signal', async () => {
  const calls = [];
  const signal = new AbortController().signal;
  const api = identityApi({ get: async (...args) => {
    calls.push(args);
    return { data: historySpringPage([args[0].endsWith('/brew-records') ? historyBrew : historyCleaning]) };
  } });
  const brew = await api.listBrewRecords(machineId, { from: '2026-11-01', to: '2026-11-08' }, signal);
  const cleaning = await api.listCleaningRecords(machineId, { from: '2026-11-01', to: '2026-11-08' }, signal);
  assert.equal(brew.page, 0); assert.deepEqual(brew.content, [historyBrew]);
  assert.equal(cleaning.page, 0); assert.deepEqual(cleaning.content, [historyCleaning]);
  assert.deepEqual(calls.map(([url]) => url), [`/machines/${machineId}/brew-records`, `/machines/${machineId}/cleaning-records`]);
  for (const [, config] of calls) {
    assert.equal(config.baseURL, baseURL);
    assert.equal(config.signal, signal);
    assert.equal(Date.parse(config.params.from), Date.parse(historyRange.from));
    assert.equal(Date.parse(config.params.to), Date.parse(historyRange.to));
    assert.equal(config.params.page, 0); assert.equal(config.params.size, 20);
    assert.equal(Object.hasOwn(config.params, 'ownerId'), false);
  }
  assert.equal(calls[0][1].params.sort, 'brewedAt,desc');
  assert.equal(calls[1][1].params.sort, 'startedAt,desc');
});

test('machine histories reject foreign machines, out-of-range rows and incorrect requested pages', async () => {
  let calls = 0, data = historySpringPage([historyBrew]);
  const api = identityApi({ get: async () => { calls++; return { data }; } });
  await assert.rejects(api.listBrewRecords('SERIAL', historyRange));
  await assert.rejects(api.listCleaningRecords(machineId, { ...historyRange, size: 101 }));
  assert.equal(calls, 0);
  for (const bad of [
    historySpringPage([{ ...historyBrew, machineId: otherMachineId }]),
    historySpringPage([{ ...historyBrew, brewedAt: historyRange.to }]),
    historySpringPage([{ ...historyBrew, brewedAt: '2026-10-31T23:59:59Z' }]),
    historySpringPage([], { number: 1, first: false }),
    historySpringPage([historyBrew], { size: 50 }),
  ]) { data = bad; await assert.rejects(api.listBrewRecords(machineId, historyRange)); }
  for (const row of [
    { ...historyCleaning, machineId: otherMachineId },
    { ...historyCleaning, startedAt: historyRange.to },
  ]) { data = historySpringPage([row]); await assert.rejects(api.listCleaningRecords(machineId, historyRange)); }
});

test('machine history scope denials and unavailable storage propagate without retries or fallback', async () => {
  for (const method of ['listBrewRecords', 'listCleaningRecords']) for (const status of [404, 503]) {
    let calls = 0;
    const failure = Object.assign(new Error('history unavailable'), { response: { status } });
    const api = identityApi({ get: async () => { calls++; throw failure; } });
    await assert.rejects(api[method](machineId, historyRange), (error) => error === failure);
    assert.equal(calls, 1);
  }
});
