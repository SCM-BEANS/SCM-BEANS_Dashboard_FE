const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = join(__dirname, "..");

function loadModule(relativePath, mocks = {}) {
  const fileName = join(root, relativePath);
  const source = readFileSync(fileName, "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const loaded = { exports: {} };
  const mockedRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id];
    if (id === "@/components/action-bar/action-bar") {
      return { ActionBar: ({ children }) => children };
    }
    if (id === "@/components/button/button-bar") {
      const React = require("react");
      return { ButtonBar: React.forwardRef(({ href, children, ...props }, ref) => href
        ? React.createElement("a", { href, ref, ...props }, children)
        : React.createElement("button", { ref, ...props }, children)) };
    }
    return require(id);
  };
  new Function("require", "module", "exports", outputText)(mockedRequire, loaded, loaded.exports);
  return loaded.exports;
}

const userId = "f0000000-0000-4000-8000-000000000001";
const tenantId = "f0000000-0000-4000-8000-000000000002";
const user = {
  id: userId,
  name: "Test Owner",
  email: "owner@example.invalid",
  roles: ["owner"],
  tenant_id: tenantId,
  status: "ACTIVE",
  email_verified: true,
  created_at: "2026-10-23T00:00:00Z",
  updated_at: "2026-10-23T00:00:00Z",
};

test("IDaaS schemas enforce role, pagination, and safe status changes", () => {
  const schemas = loadModule("src/schema/admin-users.schema.ts");
  assert.equal(schemas.AdminUserSchema.parse(user).id, userId);
  assert.equal(schemas.AdminUserListSchema.parse({ items: [user], page: 1, page_size: 20, total: 1 }).total, 1);
  assert.throws(() => schemas.AdminUserListParamsSchema.parse({ page: 0, page_size: 101 }));
  assert.throws(() => schemas.AdminUserCreateSchema.parse({
    name: "Test User", email: "user@example.invalid", role: "moderator", tenant_id: tenantId,
  }));
  assert.equal(schemas.AdminUserCreateSchema.parse({
    name: "Test Owner", email: "owner@example.invalid", role: "owner", tenant_id: tenantId,
  }).tenant_id, tenantId);
  assert.throws(() => schemas.AdminUserUpdateSchema.parse({ status: "DISABLED" }));
  assert.throws(() => schemas.AdminUserUpdateSchema.parse({}));
});

test("IDaaS create response accepts onboarding-email payload without expiry", () => {
  const schemas = loadModule("src/schema/admin-users.schema.ts");
  const response = schemas.AdminUserCreateResponseSchema.parse({
    id: userId,
    name: "Test Owner",
    email: "owner@example.invalid",
    role: "owner",
    status: "ACTIVE",
    temporary_password: "TEST_DATA-once",
    onboarding_email_sent: true,
  });

  assert.equal(response.onboarding_email_sent, true);
  assert.equal(response.temporary_password_expires_at, undefined);
});

test("admin account API uses IDaaS paths and validates every response", async () => {
  const schemas = loadModule("src/schema/admin-users.schema.ts");
  const calls = [];
  const listResponse = { items: [user], page: 1, page_size: 20, total: 1 };
  const credentialResponse = {
    id: userId, name: user.name, email: user.email, role: "owner", tenant_id: tenantId,
    status: "ACTIVE", email_verification_started: true,
    temporary_password: "TEST_DATA-once", temporary_password_expires_at: "2026-10-24T00:00:00Z",
  };
  const axiosClient = {
    get: async (url, config) => {
      calls.push({ method: "GET", url, config });
      return { data: url === "/admin/users" ? listResponse : user };
    },
    post: async (url, data) => {
      calls.push({ method: "POST", url, data });
      return { data: url.endsWith("/reissue")
        ? { user_id: userId, temporary_password: "TEST_DATA-next", temporary_password_expires_at: "2026-10-24T00:00:00Z" }
        : credentialResponse };
    },
    patch: async (url, data) => {
      calls.push({ method: "PATCH", url, data });
      return { data: { user: { ...user, name: "Updated Owner" }, email_verification_started: false } };
    },
    delete: async (url) => { calls.push({ method: "DELETE", url }); },
  };
  const { adminUsersApi } = loadModule("src/apis/admin-users.api.ts", {
    "@/lib/http": { axiosClient },
    "@/lib/api-errors": { AccountCreatedResponseValidationError: class extends Error {} },
    "@/schema/admin-users.schema": schemas,
  });
  const signal = new AbortController().signal;

  assert.equal((await adminUsersApi.list({ page: 1, page_size: 20 }, signal)).total, 1);
  assert.equal((await adminUsersApi.getById(userId, signal)).id, userId);
  assert.equal((await adminUsersApi.create({ name: user.name, email: user.email, role: "owner", tenant_id: tenantId })).temporary_password, "TEST_DATA-once");
  assert.equal((await adminUsersApi.update(userId, { name: "Updated Owner" })).user.name, "Updated Owner");
  await adminUsersApi.disable(userId);
  assert.equal((await adminUsersApi.reissueTemporaryPassword(userId)).temporary_password, "TEST_DATA-next");
  assert.equal((await adminUsersApi.update(userId, { status: "ACTIVE" })).user.id, userId);

  assert.deepEqual(calls.map(({ method, url }) => `${method} ${url}`), [
    "GET /admin/users",
    `GET /admin/users/${userId}`,
    "POST /admin/users",
    `PATCH /admin/users/${userId}`,
    `DELETE /admin/users/${userId}`,
    `POST /admin/users/${userId}/temporary-password/reissue`,
    `PATCH /admin/users/${userId}`,
  ]);
  assert.deepEqual(calls[0].config, { params: { page: 1, page_size: 20 }, signal });
  assert.equal(calls[6].data.status, "ACTIVE");
  await assert.rejects(adminUsersApi.getById("not-a-uuid"));
});

test("tenant lookup stays on the Dolores base URL", async () => {
  const schemas = loadModule("src/schema/tenants.schema.ts");
  const calls = [];
  const { tenantsApi } = loadModule("src/apis/tenants.api.ts", {
    "@/lib/http": {
      DOLORES_API_BASE_URL: "/api/dolores/v1",
      axiosClient: { get: async (url, config) => {
        calls.push({ url, config });
        return { data: [{ id: tenantId, name: "Test Tenant" }] };
      } },
    },
    "@/schema/tenants.schema": schemas,
  });
  const signal = new AbortController().signal;
  assert.equal((await tenantsApi.list(signal))[0].name, "Test Tenant");
  assert.deepEqual(calls, [{ url: "/tenants", config: { baseURL: "/api/dolores/v1", signal } }]);
});
