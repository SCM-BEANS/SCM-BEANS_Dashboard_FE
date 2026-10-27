const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = join(__dirname, "..");
const adminMessages = require("../src/text/admin/admin-operations-messages.ts").ADMIN_OPERATIONS_MESSAGES;
const { PATH_ADMIN } = require("../src/routes/path.ts");

function source(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function loadTypeScriptModule(relativePath, mocks = {}) {
  const fileName = join(root, relativePath);
  const { outputText } = ts.transpileModule(readFileSync(fileName, "utf8"), {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const loaded = { exports: {} };
  const mockedRequire = (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  new Function("require", "module", "exports", outputText)(mockedRequire, loaded, loaded.exports);
  return loaded.exports;
}

function loadAdminBackDestinations() {
  return loadTypeScriptModule("src/pages/admin/admin-back-destination.ts", {
    "@/routes/path": { PATH_ADMIN },
    "@/text/admin/admin-operations-messages": { ADMIN_OPERATIONS_MESSAGES: adminMessages },
  });
}

function count(sourceText, pattern) {
  return [...sourceText.matchAll(pattern)].length;
}

test("admin route inventory maps every nested detail and create view to an internal parent", () => {
  const destinations = loadAdminBackDestinations();
  const cases = [
    ["businesses detail", destinations.getBusinessesBackDestination({ view: "detail", q: "owner", status: "ACTIVE", page: "3" }), `${PATH_ADMIN.BUSINESSES}?q=owner&status=ACTIVE&page=3`],
    ["businesses list", destinations.getBusinessesBackDestination({ q: "owner" }), null],
    ["stores detail", destinations.getStoresBackDestination({ view: "detail", ownerId: "owner-12" }), `${PATH_ADMIN.STORES}?ownerId=owner-12`],
    ["stores create", destinations.getStoresBackDestination({ view: "create", ownerId: "owner-12" }), `${PATH_ADMIN.STORES}?ownerId=owner-12`],
    ["stores list", destinations.getStoresBackDestination({ view: "list" }), null],
    ["machines create", destinations.getMachinesBackDestination({ view: "create" }), PATH_ADMIN.MACHINES],
    ["filtered machine create", destinations.getMachinesBackDestination({ view: "create", status: "UNDER_MAINTENANCE" }), `${PATH_ADMIN.MACHINES}?status=UNDER_MAINTENANCE`],
    ["filtered machine detail", destinations.getMachineDetailBackDestination({ status: "UNDER_MAINTENANCE" }), `${PATH_ADMIN.MACHINES}?status=UNDER_MAINTENANCE`],
    ["machines list", destinations.getMachinesBackDestination({}), null],
    ["contracts create", destinations.getContractsBackDestination({ view: "create" }), PATH_ADMIN.CONTRACTS],
    ["contracts detail", destinations.getContractsBackDestination({ view: "detail", id: "contract-6" }), PATH_ADMIN.CONTRACTS],
    ["contract machine history", destinations.getContractsBackDestination({ view: "history", id: "contract-6", machineId: "machine-9" }), `${PATH_ADMIN.CONTRACTS}?view=detail&id=contract-6`],
    ["contracts list", destinations.getContractsBackDestination({ view: "list" }), null],
    ["IoT owner detail", destinations.getIotBackDestination({ ownerId: "owner-12", page: "2" }), `${PATH_ADMIN.IOT}?page=2`],
    ["IoT owner detail default page", destinations.getIotBackDestination({ ownerId: "owner-12" }), PATH_ADMIN.IOT],
    ["IoT owner list", destinations.getIotBackDestination({ page: "2" }), null],
    ["menu create", destinations.getMenuBackDestination({ view: "create" }), PATH_ADMIN.MENU],
    ["menu list", destinations.getMenuBackDestination({ view: "list" }), null],
  ];

  for (const [route, destination, fallbackHref] of cases) {
    assert.equal(destination?.fallbackHref ?? null, fallbackHref, route);
    if (destination) {
      assert.ok(destination.label.trim().length > 0, `${route} needs an accessible label`);
      assert.ok(destination.fallbackHref.startsWith("/"), `${route} fallback stays within Dolores`);
      assert.ok(!destination.fallbackHref.startsWith("//"), `${route} fallback cannot be protocol-relative`);
    }
  }
});

test("each admin create/detail page renders one shared heading back control and removes duplicate parent actions", () => {
  const routeScreens = [
    ["src/pages/admin/businesses/index.page.tsx", "getBusinessesBackDestination", 1],
    ["src/pages/admin/stores/index.page.tsx", "getStoresBackDestination", 1],
    ["src/pages/admin/machines/index.page.tsx", "getMachinesBackDestination", 1],
    ["src/pages/admin/contracts/index.page.tsx", "getContractsBackDestination", 1],
    ["src/pages/admin/iot/index.page.tsx", "getIotBackDestination", 3],
    ["src/pages/admin/menu/index.page.tsx", "getMenuBackDestination", 1],
  ];

  for (const [file, destination, headingCount] of routeScreens) {
    const content = source(file);
    assert.equal(count(content, /<BackButtonHeading\b/g), headingCount, `${file} renders one shared heading for each route branch`);
    assert.match(content, new RegExp(destination), `${file} supplies its route fallback`);
  }

  const contracts = source("src/pages/admin/contracts/index.page.tsx");
  assert.doesNotMatch(contracts, /<ButtonBar[^>]*>Về danh sách<\/ButtonBar>/);
  const machines = source("src/pages/admin/machines/index.page.tsx");
  const machineDetail = source("src/pages/admin/machines/[machineId].page.tsx");
  assert.match(machineDetail, /getMachineDetailBackDestination\(router\.query\)/);
  assert.match(machines, /query:\s*\{\s*status:\s*statusFilter\s*\}/);
  assert.doesNotMatch(machines, /\{T\.MACHINES\.CANCEL\}<\/ButtonBar>/);
  const stores = source("src/pages/admin/stores/index.page.tsx");
  assert.doesNotMatch(stores, /\{T\.STORES\.CANCEL\}<\/ButtonBar>/);
  const menu = source("src/pages/admin/menu/index.page.tsx");
  assert.doesNotMatch(menu, /\{ADMIN_MESSAGES\.MENU\.CANCEL\}<\/ButtonBar>/);
  const iot = source("src/pages/admin/iot/index.page.tsx");
  assert.doesNotMatch(iot, /<ButtonBar[^>]*>\{T\.IOT\.BACK\}<\/ButtonBar>/);
});

test("shared back control keeps its accessible label, visible keyboard focus, and 44px touch target", () => {
  const button = source("src/components/navigation/back-button.tsx");
  const css = source("src/components/navigation/back-button.module.css");
  assert.match(button, /aria-label=\{label\}/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*2px/s);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.doesNotMatch(css, /@media\s*\(max-width:[^)]*\)[^{]*\{[^}]*\.button\s*\{[^}]*min-height:\s*(?:[0-3]?\d)px/s);
});
