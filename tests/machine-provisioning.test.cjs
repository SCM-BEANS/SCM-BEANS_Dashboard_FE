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
  const mockedRequire = (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
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
