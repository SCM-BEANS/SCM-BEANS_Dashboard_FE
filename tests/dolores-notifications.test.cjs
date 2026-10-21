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

test('notification and alert APIs expose only documented list, unread-count, and mark-read routes', async () => {
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
  assert.deepEqual(Object.keys(notificationsApi), ['list', 'unreadCount', 'markAsRead']);
  assert.deepEqual(Object.keys(alertsApi), ['list']);
  await assert.rejects(async () => notificationsApi.markAsRead('not-a-uuid'));
});

test('moderator unread notification count uses the documented response and route', async () => {
  const calls = [];
  const response = { unreadCount: 3 };
  const requestDolores = (config, schema) => {
    calls.push({ config, schema });
    return Promise.resolve(response);
  };
  const mocks = {
    './client': { requestDolores },
    '@/schemas/dolores/notifications': schemas,
  };
  const { notificationsApi } = loadTypescript('src/apis/dolores/notifications.api.ts', mocks);
  const { NotificationUnreadCountSchema } = schemas;

  assert.deepEqual(NotificationUnreadCountSchema.parse(response), response);
  assert.equal(NotificationUnreadCountSchema.safeParse({ unreadCount: -1 }).success, false);
  assert.deepEqual(await notificationsApi.unreadCount(), response);
  assert.deepEqual(calls.map(({ config }) => config), [
    { method: 'GET', url: '/notifications/unread-count', signal: undefined },
  ]);
});

test('moderator unread notification query has its own cache identity and forwards cancellation', async () => {
  const queryOptions = [];
  const response = { unreadCount: 3 };
  const { useUnreadNotificationCount, notificationQueryKeys } = loadTypescript(
    'src/hooks/dolores/useNotifications.ts',
    {
      '@tanstack/react-query': {
        useQuery: (options) => { queryOptions.push(options); return options; },
      },
      '@/apis/dolores/notifications.api': {
        notificationsApi: { unreadCount: async (signal) => ({ ...response, signal }) },
      },
      '@/schemas/dolores/notifications': schemas,
      './queryPolicy': { retryDoloresRead: () => false },
    }
  );
  const signal = new AbortController().signal;

  const query = useUnreadNotificationCount();

  assert.deepEqual(notificationQueryKeys.unreadCount(), ['dolores', 'notifications', 'unread-count']);
  assert.deepEqual(query.queryKey, notificationQueryKeys.unreadCount());
  assert.deepEqual(await query.queryFn({ signal }), { ...response, signal });
  assert.equal(queryOptions.length, 1);
});
