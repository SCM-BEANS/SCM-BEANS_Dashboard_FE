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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  const mockedRequire = (id) => Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : require(id);
  new Function('require', 'exports', 'module', outputText)(mockedRequire, module.exports, module);
  return module.exports;
}

const notificationId = '00000000-0000-4000-8000-000000000001';
const tenantId = '00000000-0000-4000-8000-000000000002';
const machineId = '00000000-0000-4000-8000-000000000003';
const schemas = loadTypescript('src/schemas/dolores/notifications.ts');

test('notification and alert schemas accept documented DTOs and reject invalid state types', () => {
  const notification = {
    id: notificationId,
    tenantId,
    title: 'Bảo trì đến hạn',
    message: 'Máy cần được kiểm tra.',
    type: 'MAINTENANCE',
    read: false,
    createdAt: '2026-10-21T10:15:00+07:00',
  };
  const globalNotification = { ...notification, tenantId: null, createdAt: null };
  const alert = {
    id: notificationId,
    level: 'HIGH',
    machineId,
    message: 'Máy mất kết nối.',
    acknowledged: false,
    ts: '2026-10-21T10:15:00',
  };

  assert.deepEqual(schemas.NotificationsSchema.parse([notification, globalNotification]), [notification, globalNotification]);
  assert.deepEqual(schemas.AlertsSchema.parse([{ ...alert, machineId: null }]), [{ ...alert, machineId: null }]);
  assert.equal(schemas.NotificationSchema.safeParse({ ...notification, read: 'false' }).success, false);
  assert.equal(schemas.AlertSchema.safeParse({ ...alert, acknowledged: 'false' }).success, false);
});

test('notification and alert APIs call only documented list and mark-read routes', async () => {
  const calls = [];
  const responses = [];
  const requestDolores = (config, schema) => {
    calls.push({ config, schema });
    return Promise.resolve(responses.shift());
  };
  const mocks = {
    './client': { requestDolores },
    '@/schemas/dolores/notifications': schemas,
  };
  const { notificationsApi } = loadTypescript('src/apis/dolores/notifications.api.ts', mocks);
  const { alertsApi } = loadTypescript('src/apis/dolores/alerts.api.ts', mocks);
  const signal = new AbortController().signal;

  responses.push([]);
  await notificationsApi.list(signal);
  responses.push({ id: notificationId, tenantId, title: 'Test', message: 'Test', type: 'SYSTEM', read: true, createdAt: null });
  await notificationsApi.markAsRead(notificationId);
  responses.push([]);
  await alertsApi.list(signal);

  assert.deepEqual(calls.map(({ config }) => [config.method, config.url, config.signal]), [
    ['GET', '/notifications', signal],
    ['POST', '/notifications/' + notificationId + '/read', undefined],
    ['GET', '/alerts', signal],
  ]);
  assert.deepEqual(Object.keys(notificationsApi), ['list', 'markAsRead']);
  assert.deepEqual(Object.keys(alertsApi), ['list']);
  await assert.rejects(async () => notificationsApi.markAsRead('not-a-uuid'));
});
