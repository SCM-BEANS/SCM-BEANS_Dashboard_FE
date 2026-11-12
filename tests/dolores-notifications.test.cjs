const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadTypescript(relativePath, mocks = {}) {
  const fileName = join(__dirname, "..", relativePath);
  const source = readFileSync(fileName, "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  const mockedRequire = (id) => Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : require(id);
  new Function("require", "exports", "module", outputText)(mockedRequire, module.exports, module);
  return module.exports;
}

const notificationId = "00000000-0000-4000-8000-000000000001";
const machineId = "00000000-0000-4000-8000-000000000003";
const schemas = loadTypescript("src/schema/notifications.schema.ts", { zod: require("zod") });

test('GPS advisory uses understandable copy, preserves machine context and leaves other notifications unchanged', () => {
  const { getNotificationPresentation } = loadTypescript('src/text/notification-inbox-messages.ts');
  const gps = { type: 'MACHINE_GPS_SIGNAL_MISSING', title: 'Warning', message: `Machine ${machineId} is online but not reporting valid GPS coordinates.` };
  const result = getNotificationPresentation(gps);
  assert.match(result.title, /Máy 00000000 chưa gửi được vị trí GPS/);
  assert.equal(result.typeLabel, 'Vị trí GPS');
  assert.match(result.message, /Tại thời điểm cảnh báo/);
  assert.match(result.message, /quyền truy cập vị trí/);
  assert.equal(gps.title, 'Warning');
  assert.equal(getNotificationPresentation({ ...gps, message: '' }).title, 'Máy chưa gửi được vị trí GPS');
  const other = { type: 'INFO', title: 'Original title', message: 'Original message' };
  assert.deepEqual(getNotificationPresentation(other), { title: other.title, message: other.message, typeLabel: 'Thông báo' });
  const expiring = getNotificationPresentation({ type: 'CONTRACT_EXPIRING', title: 'Hợp đồng Owner sắp hết hạn', message: 'Hợp đồng df87981a-75d5-4fd6-a209-13974dbf1c82 sẽ hết hạn vào 2026-11-22.' });
  assert.deepEqual(expiring, { title: 'Hợp đồng chủ sở hữu sắp hết hạn', message: 'Hợp đồng #DF87981A sẽ hết hạn vào 22/11/2026.', typeLabel: 'Hợp đồng' });
});

test("notification and alert schemas validate server records including nullable timestamps", () => {
  const notification = {
    id: notificationId,
    ownerId: null,
    title: "Maintenance due",
    message: "Machine needs service.",
    type: "MAINTENANCE",
    read: false,
    createdAt: null,
  };
  const alert = {
    id: notificationId,
    level: "HIGH",
    machineId,
    message: "Machine disconnected.",
    acknowledged: false,
    ts: "2026-10-21T10:15:00Z",
  };

  assert.deepEqual(schemas.NotificationsSchema.parse([notification]), [notification]);
  assert.deepEqual(schemas.AlertsSchema.parse([alert]), [alert]);
  assert.equal(schemas.NotificationSchema.safeParse({ ...notification, read: "false" }).success, false);
  assert.equal(schemas.AlertSchema.safeParse({ ...alert, acknowledged: "false" }).success, false);
});

test("unread-count schema accepts a nonnegative integer only", () => {
  assert.deepEqual(
    schemas.NotificationUnreadCountSchema.parse({ unreadCount: 3, source: "Dolores" }),
    { unreadCount: 3, source: "Dolores" },
  );
  assert.equal(schemas.NotificationUnreadCountSchema.safeParse({ unreadCount: -1 }).success, false);
  assert.equal(schemas.NotificationUnreadCountSchema.safeParse({ unreadCount: 1.5 }).success, false);
  assert.equal(schemas.NotificationUnreadCountSchema.safeParse({ unreadCount: "3" }).success, false);
});

test("shared Dolores notification API reads records and marks one UUID notification as read", async () => {
  const calls = [];
  let postResponse = {
    id: notificationId,
    ownerId: null,
    title: "Maintenance due",
    message: "Machine needs service.",
    type: "MAINTENANCE",
    read: true,
    createdAt: null,
  };
  const responses = {
    "/notifications": [{
      id: notificationId,
      ownerId: null,
      title: "Maintenance due",
      message: "Machine needs service.",
      type: "MAINTENANCE",
      read: false,
      createdAt: null,
    }],
    "/notifications/unread-count": { unreadCount: 1 },
    "/alerts": [{
      id: notificationId,
      level: "HIGH",
      machineId,
      message: "Machine disconnected.",
      acknowledged: false,
      ts: "2026-10-21T10:15:00Z",
    }],
  };
  const axiosClient = {
    get: async (url, config) => {
      calls.push({ method: "GET", url, ...config });
      return { data: responses[url] };
    },
    post: async (url, data, config) => {
      calls.push({ method: "POST", url, data, ...config });
      return { data: postResponse };
    },
  };
  const { notificationsApi } = loadTypescript("src/apis/notifications.api.ts", {
    "@/lib/http": { axiosClient, DOLORES_API_BASE_URL: "/api/dolores/v1" },
    "@/schema/notifications.schema": schemas,
  });
  const signal = new AbortController().signal;

  assert.equal((await notificationsApi.list(signal)).length, 1);
  assert.deepEqual(await notificationsApi.unreadCount(signal), { unreadCount: 1 });
  assert.equal((await notificationsApi.listAlerts(signal)).length, 1);
  assert.deepEqual(await notificationsApi.markAsRead(notificationId), postResponse);
  assert.deepEqual(calls, [
    { method: "GET", url: "/notifications", baseURL: "/api/dolores/v1", signal },
    { method: "GET", url: "/notifications/unread-count", baseURL: "/api/dolores/v1", signal },
    { method: "GET", url: "/alerts", baseURL: "/api/dolores/v1", signal },
    { method: "POST", url: "/notifications/" + notificationId + "/read", data: undefined, baseURL: "/api/dolores/v1" },
  ]);
  await assert.rejects(notificationsApi.markAsRead("not-a-uuid"), /uuid/i);
  assert.equal(calls.filter((call) => call.method === "POST").length, 1);

  postResponse = { ...postResponse, read: false };
  await assert.rejects(notificationsApi.markAsRead(notificationId), /did not confirm/i);
  postResponse = { ...postResponse, id: machineId, read: true };
  await assert.rejects(notificationsApi.markAsRead(notificationId), /did not confirm/i);
  assert.equal(typeof notificationsApi.markAsRead, "function");
});
