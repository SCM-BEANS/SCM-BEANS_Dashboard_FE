const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
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
  const mockedRequire = (id) => Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : require(id);
  new Function("require", "module", "exports", outputText)(mockedRequire, loaded, loaded.exports);
  return loaded.exports;
}

const paths = loadModule("src/routes/path.ts");
const messages = loadModule("src/text/customer/customer-messages.ts").CUSTOMER_MESSAGES;
const schemas = {
  "@/schema/contracts.schema": loadModule("src/schema/contracts.schema.ts"),
  "@/schema/billing.schema": loadModule("src/schema/billing.schema.ts"),
  "@/schema/machines.schema": loadModule("src/schema/machines.schema.ts"),
  "@/schema/repair-cost-reviews.schema": loadModule("src/schema/repair-cost-reviews.schema.ts"),
  "@/schema/recipes.schema": loadModule("src/schema/recipes.schema.ts"),
  "@/schema/installation-work-orders.schema": loadModule("src/schema/installation-work-orders.schema.ts"),
};
const navigationMessages = new Proxy({}, { get: (_target, key) => String(key) });
const routeMessages = {
  "./path": paths,
  ...schemas,
  "@/text/home/home-messages": {
    HOME_MESSAGES: {
      NAVIGATION: { ITEMS: ["Solutions", "Products", "Technology"] },
      FOOTER: { PRODUCT_LINKS: ["Products", "Technology", "Solutions"], DISCOVERY_LINKS: ["About"] },
    },
  },
  "@/text/admin/admin-messages": { ADMIN_MESSAGES: { NAVIGATION: navigationMessages } },
  "@/text/moderator/moderator-messages": { MODERATOR_MESSAGES: { NAVIGATION: navigationMessages } },
  "@/text/customer/customer-messages": { CUSTOMER_MESSAGES: { NAVIGATION: navigationMessages } },
  "@/text/technician/technician-messages": { TECHNICIAN_MESSAGES: { NAVIGATION: navigationMessages } },
};
const routes = loadModule("src/routes/routes.ts", routeMessages);
const customerReadDescriptor = loadModule("src/pages/dashboard/read/customer-read-descriptor.ts", {
  "@/text/customer/customer-messages": { CUSTOMER_MESSAGES: messages },
});
const customerReadScreen = loadModule("src/pages/dashboard/read/customer-read-screen.tsx", {
  ...schemas,
  "@/text/customer/customer-messages": { CUSTOMER_MESSAGES: messages },
  "@/components/action-bar/action-bar": { ActionBarConfig: ({ children }) => children },
  "@/components/action-bar/action-bar-actions": { ActionBarActions: () => null },
  "@/components/navigation/back-button-heading": { BackButtonHeading: () => null },
  "@/components/features/recipe-menus/recipe-menus-screen": { RecipeMenusScreen: () => null },
  "./customer-read-descriptor": customerReadDescriptor,
  "../overview/overview-screen": { OverviewScreen: () => null },
  "../contracts/contracts-screen": { ContractsScreen: () => null },
  "../machines/machines-screen": { MachinesScreen: () => null },
  "../menu/menu-screen": { MenuScreen: () => null },
  "../invoices/invoices-screen": { InvoicesScreen: () => null },
  "../locations/locations-screen": { LocationsScreen: () => React.createElement("div", { "data-screen": "owner-locations" }) },
  "../machines/machine-registration-screen": { MachineRegistrationScreen: () => React.createElement("div", { "data-screen": "owner-machine-registration" }) },
  "../customer-shell.module.css": new Proxy({}, { get: (_target, key) => String(key) }),
});

test("Owner asset routes are catalogued, linked in navigation, and dispatch to their screens", () => {
  assert.equal(paths.PATH_CUSTOMER.LOCATIONS, "/dashboard/locations");
  assert.equal(paths.PATH_CUSTOMER.MACHINE_NEW, "/dashboard/machines/new");
  assert.equal(routes.isSupportedCustomerSection("locations"), true);
  assert.equal(routes.isSupportedCustomerSection("machines/new"), true);
  assert.ok(routes.CUSTOMER_NAVIGATION_LINKS.some((link) => link.HREF === paths.PATH_CUSTOMER.LOCATIONS));

  const locations = renderToStaticMarkup(React.createElement(customerReadScreen.CustomerReadScreen, { sectionPath: "locations" }));
  const machineRegistration = renderToStaticMarkup(React.createElement(customerReadScreen.CustomerReadScreen, { sectionPath: "machines/new" }));
  assert.match(locations, /data-screen="owner-locations"/);
  assert.match(machineRegistration, /data-screen="owner-machine-registration"/);
});

test("Moderator asset routes resolve to implemented role screens", () => {
  assert.equal(paths.PATH_MODERATOR.LOCATIONS, "/moderator/locations");
  assert.equal(paths.PATH_MODERATOR.MACHINE_REGISTER, "/moderator/machines/register");
  assert.ok(routes.MODERATOR_ROUTE_CATALOG.sections.includes(paths.PATH_MODERATOR.LOCATIONS));
  assert.ok(routes.MODERATOR_ROUTE_CATALOG.sections.includes(paths.PATH_MODERATOR.MACHINE_REGISTER));
  assert.ok(routes.MODERATOR_NAVIGATION_LINKS.some((link) => link.HREF === paths.PATH_MODERATOR.LOCATIONS));

  for (const relativePath of [
    "src/pages/moderator/[[...sections]].page.tsx",
    "src/pages/moderator/locations/locations-screen.tsx",
    "src/pages/moderator/machines/machines-screen.tsx",
  ]) {
    assert.equal(existsSync(join(root, relativePath)), true, relativePath);
  }
  const moderatorReads = readFileSync(join(root, "src/pages/moderator/moderator-read-screens.tsx"), "utf8");
  assert.match(moderatorReads, /sectionPath === "locations"/);
  assert.match(moderatorReads, /ModeratorLocationsScreen/);
});
