const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = join(__dirname, "..");
const ownerId = "f1000000-0000-4000-8000-000000000001";
const locationId = "f1000000-0000-4000-8000-000000000002";
const contractId = "f1000000-0000-4000-8000-000000000003";
const machineId = "f1000000-0000-4000-8000-000000000004";
const documentId = "f1000000-0000-4000-8000-000000000005";
const profile = {
  idaasUserId: ownerId, email: "owner@example.invalid", fullName: "TEST_DATA Owner", phone: "+84900000000",
  emailVerified: true, roles: ["OWNER"], status: "ACTIVE", createdAt: "2026-10-23T00:00:00Z",
  updatedAt: "2026-10-23T00:00:00Z", contractsUrl: `/profiles/${ownerId}/contracts`,
};
const location = {
  id: locationId, ownerId, name: "TEST_DATA Store", address: "TEST_DATA Street", city: "Test City",
  contactPerson: "TEST_DATA Contact", phoneNumber: "+84900000001", active: true, machineCount: 0,
};
const contract = {
  id: contractId, ownerId, machineId, startDate: "2026-10-01", endDate: "2027-10-01", status: "ACTIVE",
  monthlyRentalFee: 1000000, depositAmount: 500000, installationFee: 0, paygUnitPrice: 2500,
  offlineLimitMinutes: 60, machineTypeSnapshot: "SMART_IOT", legacyUnmapped: false,
};

function loadModule(relativePath, mocks = {}) {
  const fileName = join(root, relativePath);
  const source = readFileSync(fileName, "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX,
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

function page(items) { return { items, page: 0, size: 20, totalElements: items.length, totalPages: items.length ? 1 : 0 }; }
function clientFor(handler) {
  const calls = [];
  return {
    calls,
    client: {
      get: async (url, config = {}) => { calls.push({ method: "GET", url, config }); return { data: await handler(url, config) }; },
      post: async (url, data, config = {}) => { calls.push({ method: "POST", url, data, config }); return { data: await handler(url, config) }; },
    },
  };
}
const httpMock = (axiosClient) => ({ axiosClient, DOLORES_API_BASE_URL: "/api/dolores/v1" });
const schemaMocks = {
  "@/schema/profiles.schema": loadModule("src/schema/profiles.schema.ts"),
  "@/schema/locations.schema": loadModule("src/schema/locations.schema.ts"),
  "@/schema/contracts.schema": loadModule("src/schema/contracts.schema.ts"),
  "@/schema/tenants.schema": loadModule("src/schema/tenants.schema.ts"),
};

test("profile API lists, details, contracts, and history with the Dolores base URL", async () => {
  const historyPage = page([{ id: "history-1", changedAt: "2026-10-23T00:00:00Z", source: "SYSTEM" }]);
  const contractsPage = page([{ contractId, machineId, status: "ACTIVE", startDate: contract.startDate, endDate: contract.endDate }]);
  const { client, calls } = clientFor((url) => url.endsWith("/history") ? historyPage : url.endsWith("/contracts") ? contractsPage : url === "/profiles" ? page([profile]) : profile);
  const { profilesApi } = loadModule("src/apis/profiles.api.ts", { ...schemaMocks, "@/lib/http": httpMock(client) });

  assert.equal((await profilesApi.list({ role: "OWNER", page: 0, size: 20 })).items[0].idaasUserId, ownerId);
  assert.equal((await profilesApi.getById(ownerId)).email, profile.email);
  assert.equal((await profilesApi.getContracts(ownerId)).items[0].contractId, contractId);
  assert.equal((await profilesApi.getHistory(ownerId)).items[0].source, "SYSTEM");
  assert.ok(calls.every((call) => call.config.baseURL === "/api/dolores/v1"));
  assert.deepEqual(calls.map((call) => call.url), ["/profiles", `/profiles/${ownerId}`, `/profiles/${ownerId}/contracts`, `/profiles/${ownerId}/history`]);
  await assert.rejects(profilesApi.getById("invalid-id"));
});

test("businesses page delegates Owner, search, status, and pagination filters to IDaaS", async () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const adminUserSchemas = loadModule("src/schema/admin-users.schema.ts");
  const { ADMIN_OPERATIONS_MESSAGES } = loadModule("src/text/admin/admin-operations-messages.ts");
  const ownerUser = {
    id: ownerId,
    name: "TEST_DATA IDaaS Owner",
    email: "owner@example.invalid",
    roles: ["owner"],
    tenant_id: null,
    status: "ACTIVE",
    email_verified: true,
    created_at: "2026-10-23T00:00:00Z",
    updated_at: "2026-10-23T00:00:00Z",
  };
  const listResponse = { items: [ownerUser], page: 2, page_size: 20, total: 41 };
  const listCalls = [];
  const queryOptions = [];
  const { default: AdminBusinessesPage } = loadModule("src/pages/admin/businesses.page.tsx", {
    "next/router": { useRouter: () => ({
      isReady: true,
      query: { q: "owner", status: "ACTIVE", page: "2" },
      push: () => {},
    }) },
    "@tanstack/react-query": { useQuery: (options) => {
      queryOptions.push(options);
      if (options.queryKey[0] === "idaas" && options.queryKey[2] === "businesses") {
        return { data: listResponse, isPending: false, isError: false, refetch: () => {} };
      }
      return { data: undefined, isPending: true, isError: false, refetch: () => {} };
    } },
    "@/apis/admin-users.api": { adminUsersApi: {
      list: async (params) => { listCalls.push(params); return listResponse; },
      getById: async () => ownerUser,
    } },
    "@/apis/profiles.api": { profilesApi: { getContracts: async () => page([]) } },
    "@/schema/admin-users.schema": adminUserSchemas,
    "@/routes/path": { PATH_ADMIN: { STORES: "/admin/stores", USERS: "/admin/users" } },
    "@/text/admin/admin-operations-messages": { ADMIN_OPERATIONS_MESSAGES },
    "./admin-shell": {
      AdminShell: ({ children }) => children,
      adminStyles: new Proxy({}, { get: (_target, key) => String(key) }),
    },
  });

  const html = renderToStaticMarkup(React.createElement(AdminBusinessesPage));
  const listQuery = queryOptions.find((options) => options.queryKey[0] === "idaas" && options.queryKey[2] === "businesses");
  assert.equal(listQuery.enabled, true);
  await listQuery.queryFn({ signal: new AbortController().signal });
  assert.deepEqual(listCalls, [{ role: "owner", q: "owner", status: "ACTIVE", page: 2, page_size: 20 }]);
  assert.match(html, /TEST_DATA IDaaS Owner/);
  assert.match(html, /41 khách hàng/);
});

test("locations API scopes list and create by the verified Owner UUID", async () => {
  const { client, calls } = clientFor((url, config) => url === "/locations" && config.method === "POST" ? location : url === "/locations" ? [location] : location);
  client.post = async (url, data, config = {}) => { calls.push({ method: "POST", url, data, config }); return { data: location }; };
  const { locationsApi } = loadModule("src/apis/locations.api.ts", { ...schemaMocks, "@/lib/http": httpMock(client) });

  assert.equal((await locationsApi.list({ ownerId }))[0].id, locationId);
  assert.equal((await locationsApi.getById(locationId)).ownerId, ownerId);
  assert.equal((await locationsApi.create(ownerId, { name: " TEST_DATA Store ", city: "Test City" })).name, location.name);
  assert.deepEqual(calls.map((call) => `${call.method} ${call.url}`), ["GET /locations", `GET /locations/${locationId}`, "POST /locations"]);
  assert.deepEqual(calls[0].config.params, { ownerId });
  assert.deepEqual(calls[2].config.params, { ownerId });
  assert.equal(calls[2].config.baseURL, "/api/dolores/v1");
  assert.deepEqual(calls[2].data, { name: "TEST_DATA Store", city: "Test City" });
  await assert.rejects(locationsApi.list({ ownerId: "invalid" }));
  await assert.rejects(locationsApi.create(ownerId, { name: " " }));

  const tenantOnlyClient = {
    post: async () => ({ data: { ...location, ownerId: undefined, tenantId: documentId } }),
  };
  const tenantOnlyApi = loadModule("src/apis/locations.api.ts", { ...schemaMocks, "@/lib/http": httpMock(tenantOnlyClient) }).locationsApi;
  assert.equal((await tenantOnlyApi.create(ownerId, { name: "TEST_DATA Store" })).tenantId, documentId);

  const wrongOwnerClient = {
    post: async () => ({ data: { ...location, ownerId: documentId } }),
  };
  const wrongOwnerApi = loadModule("src/apis/locations.api.ts", { ...schemaMocks, "@/lib/http": httpMock(wrongOwnerClient) }).locationsApi;
  await assert.rejects(wrongOwnerApi.create(ownerId, { name: "TEST_DATA Store" }), /different Owner/);
});

test("contracts API validates lists, related data, machine history, and Blob downloads", async () => {
  const docs = [{ id: documentId, contractId, documentType: "MAIN_CONTRACT", originalFilename: "TEST_DATA.pdf", sizeBytes: 42, version: 1, uploadedAt: "2026-10-23T00:00:00Z" }];
  const expiry = { expiryDate: "2027-10-01", reminderDate: "2027-09-01", decision: null };
  const blob = new Blob(["TEST_DATA"]);
  const { client, calls } = clientFor((url) => {
    if (url === "/contracts" || url.startsWith("/contracts/machine/")) return [contract];
    if (url.endsWith("/expiry-status")) return expiry;
    if (url.endsWith("/documents")) return docs;
    if (url.endsWith(`/documents/${documentId}`)) return blob;
    return contract;
  });
  client.get = async (url, config = {}) => {
    calls.push({ method: "GET", url, config });
    return { data: await ((url.endsWith(`/documents/${documentId}`)) ? blob : url === "/contracts" || url.startsWith("/contracts/machine/") ? [contract] : url.endsWith("/expiry-status") ? expiry : url.endsWith("/documents") ? docs : contract) };
  };
  const { contractsApi } = loadModule("src/apis/contracts.api.ts", { ...schemaMocks, "@/lib/http": httpMock(client) });

  assert.equal((await contractsApi.list())[0].ownerId, ownerId);
  assert.equal((await contractsApi.getById(contractId)).id, contractId);
  assert.equal((await contractsApi.getExpiry(contractId)).expiryDate, expiry.expiryDate);
  assert.equal((await contractsApi.getDocuments(contractId))[0].id, documentId);
  assert.equal((await contractsApi.getMachineHistory(machineId))[0].id, contractId);
  assert.ok(await contractsApi.downloadDocument(contractId, documentId) instanceof Blob);
  assert.ok(calls.every((call) => call.config.baseURL === "/api/dolores/v1"));
  assert.deepEqual(calls.map((call) => call.url), [
    "/contracts", `/contracts/${contractId}`, `/contracts/${contractId}/expiry-status`,
    `/contracts/${contractId}/documents`, `/contracts/machine/${machineId}/history`,
    `/contracts/${contractId}/documents/${documentId}`,
  ]);
  assert.equal(calls.at(-1).config.responseType, "blob");
  await assert.rejects(contractsApi.getById("not-a-uuid"));
});

test("contract create action opens the API-backed request form", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const contractSchemas = loadModule("src/schema/contracts.schema.ts");
  const { ADMIN_OPERATIONS_MESSAGES } = loadModule("src/text/admin/admin-operations-messages.ts");

  const renderPage = (view) => {
    const buttons = [];
    const navigation = [];
    const query = view ? { view } : {};
    const { default: AdminContractsPage } = loadModule("src/pages/admin/contracts.page.tsx", {
      "next/router": { useRouter: () => ({ query, push: (...args) => { navigation.push(args); } }) },
      "@tanstack/react-query": {
        useQuery: () => ({ data: [], isPending: false, isFetching: false, isError: false, refetch: async () => {} }),
        useMutation: () => ({ mutate: () => {}, isPending: false, isError: false }),
      },
      "@/apis/contracts.api": { contractsApi: {
        list: async () => [], getById: async () => ({}), getExpiry: async () => ({}),
        getDocuments: async () => [], getMachineHistory: async () => [], downloadDocument: async () => new Blob(),
      } },
      "@/apis/profiles.api": { profilesApi: { list: async () => [] } },
      "@/apis/machines.api": { machinesApi: { list: async () => [] } },
      "@/schema/contracts.schema": contractSchemas,
      "@/text/admin/admin-operations-messages": { ADMIN_OPERATIONS_MESSAGES },
      "@/components/button/button-bar": { ButtonBar: ({ children, ...props }) => {
        buttons.push({ children, ...props });
        return React.createElement("button", props, children);
      } },
      "./admin-shell": {
        AdminShell: ({ children }) => children,
        adminStyles: new Proxy({}, { get: (_target, key) => String(key) }),
      },
    });
    const html = renderToStaticMarkup(React.createElement(AdminContractsPage));
    return { html, buttons, navigation };
  };

  const list = renderPage("");
  const openForm = list.buttons.find((button) => button.children === "Tạo hợp đồng");
  assert.equal(openForm.disabled, undefined);
  openForm.onClick();
  assert.equal(list.navigation[0][0].query.view, "create");

  const create = renderPage("create");
  assert.match(create.html, /Owner/);
  assert.match(create.html, /Máy đang ở kho/);
  assert.match(create.html, /Ngày bắt đầu/);
  assert.match(create.html, /Phí thuê hàng tháng/);
  assert.match(create.html, /contractTermsSnapshot\.maintenanceIntervalMonths/);
  assert.match(create.html, /contractTermsSnapshot\.allowedReplacementMachineTypes/);
  assert.doesNotMatch(create.html, /chưa thể lưu dữ liệu/);
  const submit = create.buttons.find((button) => button.form === "contract-create-form");
  assert.equal(submit.children, "Tạo hợp đồng");
  assert.equal(submit.disabled, true);
});

test("admin operations preserve 401 and 403 responses for the shared auth and forbidden states", async () => {
  for (const status of [401, 403]) {
    const axiosClient = {
      get: async () => { throw Object.assign(new Error(`HTTP ${status}`), { response: { status } }); },
    };
    const { contractsApi } = loadModule("src/apis/contracts.api.ts", { ...schemaMocks, "@/lib/http": httpMock(axiosClient) });
    await assert.rejects(contractsApi.list(), (error) => error.response.status === status);
  }
});

test("store fan-out keeps successful Owner data, records partial failures, and caps concurrency at five", async () => {
  const owners = Array.from({ length: 12 }, (_, index) => ({
    ...profile,
    idaasUserId: `f2${String(index).padStart(6, "0")}-0000-4000-8000-000000000001`,
    fullName: `TEST_DATA Owner ${index}`,
  }));
  let inFlight = 0;
  let maxInFlight = 0;
  const profilesApi = {
    list: async () => page(owners),
  };
  const locationsApi = {
    list: async ({ ownerId: requestedOwnerId }) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 3));
      inFlight -= 1;
      if (requestedOwnerId === owners[6].idaasUserId) throw Object.assign(new Error("forbidden"), { response: { status: 403 } });
      return [{
        ...location,
        id: requestedOwnerId.slice(0, 8) + "-0000-4000-8000-000000000099",
        ownerId: undefined,
        tenantId: documentId,
      }];
    },
  };
  const pageModule = loadModule("src/pages/admin/stores.page.tsx", {
    ...schemaMocks,
    "@/apis/admin-users.api": { adminUsersApi: { list: async () => ({ items: [], page: 1, page_size: 100, total: 0 }) } },
    "@/apis/profiles.api": { profilesApi },
    "@/apis/locations.api": { locationsApi },
    "@/text/admin/admin-operations-messages": { ADMIN_OPERATIONS_MESSAGES: {} },
    "./admin-shell": { AdminShell: () => null, adminStyles: {} },
    "next/router": { useRouter: () => ({}) },
  });
  const result = await pageModule.loadOwnerLocations();
  assert.equal(result.owners.length, 12);
  assert.equal(result.locations.length, 11);
  assert.deepEqual(result.failed, [owners[6].fullName]);
  assert.equal(maxInFlight, 5);
});

test("store creation owner options request IDaaS owners and keep the returned id and name", async () => {
  const users = Array.from({ length: 101 }, (_, index) => ({
    id: `f4${String(index).padStart(6, "0")}-0000-4000-8000-000000000001`,
    name: `TEST_DATA IDaaS Owner ${index}`,
  }));
  const calls = [];
  const adminUsersApi = {
    list: async (params) => {
      calls.push(params);
      return {
        items: params.page === 1 ? users.slice(0, 100) : users.slice(100),
        page: params.page,
        page_size: 100,
        total: users.length,
      };
    },
  };
  const pageModule = loadModule("src/pages/admin/stores.page.tsx", {
    ...schemaMocks,
    "@/apis/admin-users.api": { adminUsersApi },
    "@/apis/profiles.api": { profilesApi: { list: async () => page([]) } },
    "@/apis/locations.api": { locationsApi: { list: async () => [] } },
    "@/text/admin/admin-operations-messages": { ADMIN_OPERATIONS_MESSAGES: {} },
    "./admin-shell": { AdminShell: () => null, adminStyles: {} },
    "next/router": { useRouter: () => ({}) },
  });

  const owners = await pageModule.loadOwnerUsers();
  assert.equal(owners.length, 101);
  assert.deepEqual(owners[0], users[0]);
  assert.deepEqual(owners.at(-1), users.at(-1));
  assert.deepEqual(calls, [
    { role: "owner", page: 1, page_size: 100 },
    { role: "owner", page: 2, page_size: 100 },
  ]);
});

test("store fan-out stops scheduling later Owners after the current batch is cancelled", async () => {
  const owners = Array.from({ length: 12 }, (_, index) => ({
    ...profile,
    idaasUserId: `f3${String(index).padStart(6, "0")}-0000-4000-8000-000000000001`,
    fullName: `TEST_DATA Cancel Owner ${index}`,
  }));
  const controller = new AbortController();
  const requested = [];
  const pageModule = loadModule("src/pages/admin/stores.page.tsx", {
    ...schemaMocks,
    "@/apis/admin-users.api": { adminUsersApi: { list: async () => ({ items: [], page: 1, page_size: 100, total: 0 }) } },
    "@/apis/profiles.api": { profilesApi: { list: async () => page(owners) } },
    "@/apis/locations.api": { locationsApi: { list: async ({ ownerId: requestedOwnerId }) => {
      requested.push(requestedOwnerId);
      if (requested.length === 1) controller.abort();
      return [{ ...location, ownerId: requestedOwnerId }];
    } } },
    "@/text/admin/admin-operations-messages": { ADMIN_OPERATIONS_MESSAGES: {} },
    "./admin-shell": { AdminShell: () => null, adminStyles: {} },
    "next/router": { useRouter: () => ({}) },
  });
  const result = await pageModule.loadOwnerLocations(controller.signal);
  assert.equal(requested.length, 5);
  assert.equal(result.locations.length, 5);
});
