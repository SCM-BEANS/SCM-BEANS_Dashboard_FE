const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const React = require("react");

const root = join(__dirname, "..");
const moderatorMessages = require("../src/text/moderator/moderator-messages.ts").MODERATOR_MESSAGES;
const adminMessages = require("../src/text/admin/admin-operations-messages.ts").ADMIN_OPERATIONS_MESSAGES;
const { PATH_ADMIN, PATH_MODERATOR } = require("../src/routes/path.ts");

function loadTypeScriptModule(relativePath, mocks = {}) {
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
  const mockedRequire = (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  new Function("require", "module", "exports", outputText)(mockedRequire, loaded, loaded.exports);
  return loaded.exports;
}

function source(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

test("moderator detail and nested workflow routes resolve to their parent list, while list roots have no back destination", () => {
  const { getModeratorBackDestination } = loadTypeScriptModule("src/pages/moderator/moderator-back-destination.ts", {
    "@/routes/path": { PATH_MODERATOR },
    "@/text/moderator/moderator-messages": { MODERATOR_MESSAGES: moderatorMessages },
  });

  const cases = [
    ["/moderator", null],
    ["/moderator/customers", null],
    ["/moderator/customers/list", null],
    ["/moderator/customers/customer-42", "/moderator/customers"],
    ["/moderator/customers/new", "/moderator/customers"],
    ["/moderator/contracts/C-204", "/moderator/contracts"],
    ["/moderator/contracts/handover/standard", "/moderator/contracts"],
    ["/moderator/contracts/list", null],
    ["/moderator/invoices/00000000-0000-4000-8000-000000000001", "/moderator/invoices"],
    ["/moderator/invoices", null],
    ["/moderator/machines/stock", "/moderator/machines"],
    ["/moderator/machines/repair-history", "/moderator/machines"],
    ["/moderator/machines/list", null],
    ["/moderator/machines/8db0c528-4c6e-4d2e-8e77-c950f6ca2061", "/moderator/machines"],
    ["/moderator/iot/machines", "/moderator/iot"],
    ["/moderator/iot", null],
    ["/moderator/menu/ingredients", "/moderator/menu"],
    ["/moderator/menu/00000000-0000-4000-8000-000000000001", "/moderator/menu"],
    ["/moderator/technical-requests/YC-204", "/moderator/technical-requests"],
    ["/moderator/technical-requests/new/repair", "/moderator/technical-requests"],
    ["/moderator/machine-history/AB-204", "/moderator/machine-history"],
    ["/moderator/machine-history", null],
    ["/moderator/buyback/MB-204", "/moderator/buyback"],
    ["/moderator/notifications/alerts", "/moderator/notifications"],
    ["/moderator/notifications", null],
  ];

  for (const [pathname, fallbackHref] of cases) {
    const destination = getModeratorBackDestination(pathname);
    assert.equal(destination?.fallbackHref ?? null, fallbackHref, pathname);
    if (destination) assert.ok(destination.label.length > 0, pathname);
  }
});

test("moderator page heading uses the shared back control once before the title and shell no longer duplicates it in the action bar", () => {
  let pathname = "/moderator/customers/customer-42";
  const BackButtonHeading = (props) => React.createElement("header", { "data-back-heading": true, ...props });
  const routeDestination = loadTypeScriptModule("src/pages/moderator/moderator-back-destination.ts", {
    "@/routes/path": { PATH_MODERATOR },
    "@/text/moderator/moderator-messages": { MODERATOR_MESSAGES: moderatorMessages },
  });
  const { ModeratorPageHeading } = loadTypeScriptModule("src/pages/moderator/moderator-page-heading.tsx", {
    "next/router": { useRouter: () => ({ asPath: pathname }) },
    "@/components/navigation/back-button-heading": { BackButtonHeading },
    "./moderator-back-destination": routeDestination,
    "./moderator-shell": { moderatorStyles: { pageHeading: "heading" } },
  });

  const detailHeading = ModeratorPageHeading({ title: "Chi tiết khách hàng", description: "Hồ sơ" });
  pathname = "/moderator/customers";
  const listHeading = ModeratorPageHeading({ title: "Khách hàng", description: "Danh sách" });
  assert.equal(detailHeading.props.back.fallbackHref, "/moderator/customers");
  assert.equal(detailHeading.type, BackButtonHeading);
  assert.equal(detailHeading.props.title, "Chi tiết khách hàng");
  assert.equal(listHeading.props.back, null);

  const shell = source("src/pages/moderator/moderator-shell.tsx");
  assert.doesNotMatch(shell, /return\s*<ButtonBar href=\{currentSection\.HREF\}>\{actionMessages\.BACK_TO_SECTION\}/);
});

test("admin business and store deep-link fallbacks retain list filters and owner scope", () => {
  const { getBusinessesBackDestination, getStoresBackDestination } = loadTypeScriptModule("src/pages/admin/admin-back-destination.ts", {
    "@/routes/path": { PATH_ADMIN },
    "@/text/admin/admin-operations-messages": { ADMIN_OPERATIONS_MESSAGES: adminMessages },
  });

  const businessDestination = getBusinessesBackDestination({
    view: "detail", id: "owner-12", q: "hạt cà phê", status: "ACTIVE", page: "3", contractPage: "2",
  });
  const businessQuery = new URLSearchParams({ q: "hạt cà phê", status: "ACTIVE", page: "3" }).toString();
  assert.equal(businessDestination.fallbackHref, `${PATH_ADMIN.BUSINESSES}?${businessQuery}`);
  assert.equal(getBusinessesBackDestination({ view: "list", q: "owner" }), null);

  const storeDestination = getStoresBackDestination({ view: "detail", id: "store-7", ownerId: "owner-12" });
  assert.equal(storeDestination.fallbackHref, `${PATH_ADMIN.STORES}?ownerId=owner-12`);
  assert.equal(getStoresBackDestination({ view: "create", ownerId: "owner-12" }).fallbackHref, `${PATH_ADMIN.STORES}?ownerId=owner-12`);
  assert.equal(getStoresBackDestination({ view: "list", ownerId: "owner-12" }), null);
});

test("admin business/store detail headings and machine detail use shared back control without replacing useful actions", () => {
  const businesses = source("src/pages/admin/businesses/index.page.tsx");
  const stores = source("src/pages/admin/stores/index.page.tsx");
  const machine = source("src/pages/admin/machines/[machineId].page.tsx");

  assert.match(businesses, /<BackButtonHeading[\s\S]*getBusinessesBackDestination/);
  assert.doesNotMatch(businesses, /<ButtonBar[^>]*onClick=\{\(\)\s*=>\s*navigate\(\{ q:/);
  assert.match(stores, /<BackButtonHeading[\s\S]*getStoresBackDestination/);
  assert.doesNotMatch(stores, /<ButtonBar[^>]*>Về danh sách<\/ButtonBar>/);
  assert.match(machine, /<BackButtonHeading[\s\S]*getMachineDetailBackDestination/);
  assert.doesNotMatch(machine, /<ButtonBar href=\{PATH_ADMIN\.MACHINES\}>/);
  assert.match(machine, /PATH_ADMIN\.IOT/);
  assert.match(machine, /onClick=\{refresh\}/);
});

test("moderator detail screens do not keep duplicate parent-list links", () => {
  const detailScreens = [
    "src/pages/moderator/customers/customer-detail-screen.tsx",
    "src/pages/moderator/contracts/contract-detail-screen.tsx",
    "src/pages/moderator/machines/machines-screen.tsx",
    "src/pages/moderator/invoices/invoices-screen.tsx",
    "src/pages/moderator/menu/recipes-screen.tsx",
    "src/pages/moderator/technical/technical-screen.tsx",
    "src/pages/moderator/alerts/alerts-screen.tsx",
  ];
  for (const file of detailScreens) {
    const content = source(file);
    assert.match(content, /ModeratorPageHeading/, `${file} must render a shared heading`);
    assert.doesNotMatch(content, /Quay lại danh sách|Quay láº¡i danh|href=\{PATH_MODERATOR\.(CUSTOMERS|CONTRACTS|INVOICES|MACHINES|MENU|TECHNICAL_REQUESTS|NOTIFICATIONS)\}[^\n]*>/, `${file} has a duplicate parent link`);
  }
});
