const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const React = require("react");

const root = join(__dirname, "..");
const customerMessages = require("../src/text/customer/customer-messages.ts").CUSTOMER_MESSAGES;
const technicianMessages = require("../src/text/technician/technician-messages.ts").TECHNICIAN_MESSAGES;

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

function createSchema(accept = (value) => Boolean(value)) {
  return { safeParse(value) { return accept(value) ? { success: true, data: value } : { success: false }; } };
}

function walk(node, predicate, result = []) {
  if (Array.isArray(node)) {
    for (const item of node) walk(item, predicate, result);
    return result;
  }
  if (!node || typeof node !== "object" || !("props" in node)) return result;
  if (predicate(node)) result.push(node);
  walk(node.props.children, predicate, result);
  return result;
}

function loadCustomerReadDescriptor() {
  return loadTypeScriptModule("src/pages/dashboard/read/customer-read-descriptor.ts", {
    "@/text/customer/customer-messages": { CUSTOMER_MESSAGES: customerMessages },
  });
}

function loadCustomerWorkflowDescriptor() {
  return loadTypeScriptModule("src/pages/dashboard/workflows/customer-workflow-descriptor.ts", {
    "@/text/customer/customer-messages": { CUSTOMER_MESSAGES: customerMessages },
  });
}

const contractId = "11111111-1111-4111-8111-111111111111";
const machineId = "22222222-2222-4222-8222-222222222222";
const invoiceId = "33333333-3333-4333-8333-333333333333";
const recipeId = "44444444-4444-4444-8444-444444444444";

test("customer read detail descriptors define parent fallbacks and leave root lists alone", () => {
  const { getCustomerScreenDescriptor } = loadCustomerReadDescriptor();
  const cases = [
    ["", null],
    ["contracts", null],
    [`contracts/${contractId}`, "/dashboard/contracts"],
    ["contracts/expiry", "/dashboard/contracts"],
    ["contracts/end-early", "/dashboard/contracts"],
    ["machines", null],
    [`machines/${machineId}`, "/dashboard/machines"],
    [`machines/${machineId}/model`, `/dashboard/machines/${machineId}`],
    ["machines/history", "/dashboard/machines"],
    ["invoices", null],
    ["invoices/standard", "/dashboard/invoices"],
    [`invoices/${invoiceId}`, "/dashboard/invoices"],
    ["invoices/2026-10", "/dashboard/invoices"],
    ["menu", null],
    [`menu/${recipeId}`, "/dashboard/menu"],
  ];

  for (const [sectionPath, fallbackHref] of cases) {
    const descriptor = getCustomerScreenDescriptor(sectionPath);
    assert.equal(descriptor.back?.fallbackHref ?? null, fallbackHref, `unexpected parent for ${sectionPath || "dashboard root"}`);
    if (descriptor.back) {
      assert.ok(descriptor.back.label.length > 0);
      const label = descriptor.back.label.toLocaleLowerCase("vi-VN");
      assert.ok(label.includes("danh sách") || label.includes("máy") || label.includes("hóa đơn") || label.includes("menu"));
      assert.equal(descriptor.actions.some((action) => action.href === fallbackHref), false, `duplicate parent action on ${sectionPath}`);
      assert.ok(descriptor.actions.length > 0, `business actions disappeared on ${sectionPath}`);
    }
  }
});

test("customer workflow descriptors map each form/detail to an internal parent and remove the duplicate parent action", () => {
  const { getCustomerWorkflowDescriptor, getCustomerWorkflowActions } = loadCustomerWorkflowDescriptor();
  const cases = [
    ["support", "/dashboard"],
    ["support/new", "/dashboard/support"],
    [`support/${contractId}`, "/dashboard/support"],
    ["buyback", "/dashboard"],
    ["buyback/new", "/dashboard/buyback"],
    ["buyback/documents", "/dashboard/buyback"],
    ["buyback/documents/confirmed", "/dashboard/buyback/documents"],
    ["buyback/issue", "/dashboard/buyback/documents"],
    ["invoices/payment", "/dashboard/invoices"],
    ["invoices/shortfall", "/dashboard/invoices"],
    ["invoices/refund", "/dashboard/invoices"],
    ["invoices/reminder", "/dashboard/invoices"],
    ["invoices/standard-payment", "/dashboard/invoices"],
    ["menu/add-dish", "/dashboard/menu"],
    ["menu/espresso", "/dashboard/menu"],
    ["menu/fresh-milk", "/dashboard/menu"],
    ["menu/sent", "/dashboard/menu"],
    ["menu/applied", "/dashboard/menu"],
    ["notifications", "/dashboard"],
  ];

  for (const [sectionPath, fallbackHref] of cases) {
    const descriptor = getCustomerWorkflowDescriptor(sectionPath);
    assert.equal(descriptor?.back?.fallbackHref, fallbackHref, `unexpected parent for ${sectionPath}`);
    const actions = getCustomerWorkflowActions(sectionPath, descriptor);
    assert.equal(actions.some((action) => action.href === fallbackHref), false, `duplicate parent action on ${sectionPath}`);
    assert.ok(descriptor.back.label.length > 0);
    if (["buyback/documents/confirmed", "menu/applied"].includes(sectionPath)) assert.equal(actions.length, 0);
    else assert.ok(actions.length > 0, `workflow actions disappeared on ${sectionPath}`);
  }
});

test("the shared page heading renders exactly one back control before the title only when a parent exists", () => {
  const BackButtonMarker = (props) => React.createElement("button", { "data-shared-back": "true", "aria-label": props.label }, props.label);
  const { BackButtonHeading } = loadTypeScriptModule("src/components/navigation/back-button-heading.tsx", {
    "./back-button": { BackButton: BackButtonMarker },
  });
  const rootHeading = BackButtonHeading({ title: "Tổng quan", titleId: "root-title", className: "heading", back: null });
  const detailHeading = BackButtonHeading({
    title: "Chi tiết khách hàng",
    titleId: "detail-title",
    className: "heading",
    back: { label: "Danh sách khách hàng", fallbackHref: "/dashboard/customers" },
  });

  assert.equal(walk(rootHeading, (element) => element.type === BackButtonMarker).length, 0);
  const backButtons = walk(detailHeading, (element) => element.type === BackButtonMarker);
  const headings = walk(detailHeading, (element) => element.type === "h1");
  assert.equal(backButtons.length, 1);
  assert.equal(backButtons[0].props.label, "Danh sách khách hàng");
  assert.equal(detailHeading.props.children[0].type, BackButtonMarker);
  assert.equal(detailHeading.props.children[1].type, "h1");
  assert.equal(headings.length, 1);
});

test("customer read routing passes back metadata to specialized details and not to the root", () => {
  const BackButtonHeading = (props) => React.createElement("header", { "data-shared-heading": "true", ...props });
  const childScreens = {
    ContractsScreen: () => null,
    MachinesScreen: () => null,
    MenuScreen: () => null,
    InvoicesScreen: () => null,
    OverviewScreen: () => null,
  };
  const { CustomerReadScreen } = loadTypeScriptModule("src/pages/dashboard/read/customer-read-screen.tsx", {
    "@/schema/billing.schema": { InvoiceIdSchema: createSchema() },
    "@/schema/contracts.schema": { ContractIdSchema: createSchema() },
    "@/schema/machines.schema": { MachineIdSchema: createSchema((value) => value === machineId) },
    "@/schema/recipes.schema": { GlobalRecipeIdSchema: createSchema() },
    "@/text/customer/customer-messages": { CUSTOMER_MESSAGES: customerMessages },
    "@/components/action-bar/action-bar": { ActionBar: () => null },
    "@/components/action-bar/action-bar-actions": { ActionBarActions: () => null },
    "@/components/navigation/back-button-heading": { BackButtonHeading },
    "./customer-read-descriptor": loadCustomerReadDescriptor(),
    "../overview/overview-screen": { OverviewScreen: childScreens.OverviewScreen },
    "../contracts/contracts-screen": { ContractsScreen: childScreens.ContractsScreen },
    "../machines/machines-screen": { MachinesScreen: childScreens.MachinesScreen },
    "../menu/menu-screen": { MenuScreen: childScreens.MenuScreen },
    "../invoices/invoices-screen": { InvoicesScreen: childScreens.InvoicesScreen },
    "../customer-shell.module.css": {},
  });
  const detail = CustomerReadScreen({ sectionPath: `machines/${machineId}` });
  const rootScreen = CustomerReadScreen({ sectionPath: "" });
  const machineModel = CustomerReadScreen({ sectionPath: `machines/${machineId}/model` });
  const modelHeading = walk(machineModel, (element) => element.type === BackButtonHeading)[0];

  assert.equal(detail.type, childScreens.MachinesScreen);
  assert.equal(detail.props.back.fallbackHref, "/dashboard/machines");
  assert.equal(rootScreen.type, childScreens.OverviewScreen);
  assert.equal(modelHeading.props.back.fallbackHref, `/dashboard/machines/${machineId}`);
});

test("customer workflow screen passes navigation to its specialized repair form", () => {
  const RepairIntakeForm = () => null;
  const LocalRecipeForm = () => null;
  const NotificationInbox = () => null;
  const BackButtonHeading = (props) => React.createElement("header", { "data-shared-heading": "true", ...props });
  const { CustomerWorkflowScreen } = loadTypeScriptModule("src/pages/dashboard/workflows/customer-workflow-screen.tsx", {
    "@/components/action-bar/action-bar": { ActionBar: () => null },
    "@/components/action-bar/action-bar-actions": { ActionBarActions: () => null },
    "@/components/navigation/back-button-heading": { BackButtonHeading },
    "@/text/customer/customer-messages": { CUSTOMER_MESSAGES: customerMessages },
    "./customer-workflow-descriptor": loadCustomerWorkflowDescriptor(),
    "./repair-intake-screen": { RepairIntakeForm },
    "./local-recipe-screen": { LocalRecipeForm },
    "./notification-inbox": { NotificationInbox },
    "../customer-shell.module.css": {},
  });
  const screen = CustomerWorkflowScreen({ sectionPath: "support/new" });
  const recipeScreen = CustomerWorkflowScreen({ sectionPath: "menu/add-dish" });
  const notificationScreen = CustomerWorkflowScreen({ sectionPath: "notifications" });
  const buybackScreen = CustomerWorkflowScreen({ sectionPath: "buyback/new" });

  assert.equal(screen.type, RepairIntakeForm);
  assert.equal(screen.props.back.fallbackHref, "/dashboard/support");
  assert.equal(recipeScreen.type, LocalRecipeForm);
  assert.equal(recipeScreen.props.back.fallbackHref, "/dashboard/menu");
  assert.equal(notificationScreen.type, NotificationInbox);
  assert.equal(notificationScreen.props.back.fallbackHref, "/dashboard");
  const buybackHeading = walk(buybackScreen, (element) => element.type === BackButtonHeading)[0];
  assert.equal(buybackHeading.props.back.fallbackHref, "/dashboard/buyback");
});

test("technician roots stay clean, while task and history detail get one shared parent heading", () => {
  const BackButtonHeading = (props) => React.createElement("header", { "data-shared-heading": "true", ...props });
  const ActionBarActions = (props) => React.createElement("div", { "data-actions": "true", actions: props.actions });
  const { TechnicianRouteScreen, getTechnicianScreenDescriptor } = loadTypeScriptModule("src/pages/technician/technician-route-screens.tsx", {
    "@/text/technician/technician-messages": { TECHNICIAN_MESSAGES: technicianMessages },
    "@/components/action-bar/action-bar": { ActionBar: ({ children }) => React.createElement("aside", null, children) },
    "@/components/action-bar/action-bar-actions": { ActionBarActions },
    "./technician-shell.module.css": {},
    "@/components/navigation/back-button-heading": { BackButtonHeading },
  });

  assert.equal(getTechnicianScreenDescriptor("tasks").back, null);
  assert.equal(getTechnicianScreenDescriptor("history").back, null);
  for (const sectionPath of ["tasks", "history"]) {
    const rootScreen = TechnicianRouteScreen({ sectionPath });
    const rootHeading = walk(rootScreen, (element) => element.type === BackButtonHeading)[0];
    assert.equal(rootHeading.props.back, null);
  }
  for (const [sectionPath, fallbackHref] of [
    [`tasks/${contractId}`, "/technician/tasks"],
    ["tasks/repair", "/technician/tasks"],
    ["tasks/substitute-return", "/technician/tasks/substitute"],
    ["tasks/maintenance-history", "/technician/history"],
    ["history/machine-1", "/technician/history"],
  ]) {
    const descriptor = getTechnicianScreenDescriptor(sectionPath);
    assert.equal(descriptor.back?.fallbackHref, fallbackHref, `unexpected parent for ${sectionPath}`);
    const screen = TechnicianRouteScreen({ sectionPath });
    const headings = walk(screen, (element) => element.type === BackButtonHeading);
    assert.equal(headings.length, 1);
    assert.equal(headings[0].props.back.fallbackHref, fallbackHref);
    const actionElements = walk(screen, (element) => element.type === ActionBarActions);
    const actions = actionElements[0].props.actions;
    assert.equal(actions.some((action) => action.href === fallbackHref), false, `duplicate parent action on ${sectionPath}`);
    if (sectionPath === `tasks/${contractId}`) {
      assert.ok(actions.some((action) => action.href === "/technician/tasks/retrieval"));
    }
    if (sectionPath === "tasks/substitute") {
      assert.ok(actions.some((action) => action.href === "/technician/tasks/substitute-return"));
    }
  }
});
