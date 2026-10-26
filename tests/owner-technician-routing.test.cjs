const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
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
  const mockedRequire = (id) =>
    Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : require(id);
  new Function("require", "module", "exports", outputText)(mockedRequire, loaded, loaded.exports);
  return loaded.exports;
}

const paths = loadModule("src/routes/path.ts");
const customerMessages = loadModule("src/text/customer/customer-messages.ts").CUSTOMER_MESSAGES;
const technicianMessages = loadModule("src/text/technician/technician-messages.ts").TECHNICIAN_MESSAGES;
const customerReadScreens = loadModule("src/pages/dashboard/customer-read-screens.tsx", {
  "@/text/customer/customer-messages": { CUSTOMER_MESSAGES: customerMessages },
  "./customer-shell.module.css": new Proxy({}, { get: (_target, key) => String(key) }),
});
const customerWorkflowScreens = loadModule("src/pages/dashboard/customer-workflow-screens.tsx", {
  "@/text/customer/customer-messages": { CUSTOMER_MESSAGES: customerMessages },
  "./customer-shell.module.css": new Proxy({}, { get: (_target, key) => String(key) }),
});
const technicianRouteScreens = loadModule("src/pages/technician/technician-route-screens.tsx", {
  "@/text/technician/technician-messages": { TECHNICIAN_MESSAGES: technicianMessages },
  "./technician-shell.module.css": new Proxy({}, { get: (_target, key) => String(key) }),
});
const tokenWithRoles = (roles) => `header.${Buffer.from(JSON.stringify({ roles })).toString("base64url")}.signature`;
const homeMessages = {
  NAVIGATION: { ITEMS: ["Giải pháp", "Sản phẩm", "Công nghệ", "Khách hàng", "Tin tức"] },
  FOOTER: {
    PRODUCT_LINKS: ["A", "B", "C"],
    DISCOVERY_LINKS: ["A", "B", "C"],
  },
};
const adminMessages = {
  NAVIGATION: {
    OVERVIEW: "Tổng quan",
    USERS: "Tài khoản",
    BUSINESSES: "Khách hàng",
    STORES: "Cửa hàng",
    CONTRACTS: "Hợp đồng",
    MACHINES: "Máy",
    IOT: "IoT",
    MENU: "Menu",
    REPORTS: "Báo cáo",
    NOTIFICATIONS: "Thông báo",
  },
};
const moderatorMessages = {
  NAVIGATION: {
    OVERVIEW: "Tổng quan",
    CONTRACTS: "Hợp đồng",
    CUSTOMERS: "Tài khoản khách",
    INVOICES: "Hóa đơn",
    MACHINES: "Máy",
    IOT: "IoT",
    IOT_SHORT: "IoT",
    MENU: "Menu",
    TECHNICAL_REQUESTS: "Yêu cầu kỹ thuật",
    MACHINE_HISTORY: "Lịch sử máy",
    BUYBACK: "Thu mua",
    NOTIFICATIONS: "Thông báo",
  },
};

const schemas = {
  "@/schema/contracts.schema": loadModule("src/schema/contracts.schema.ts"),
  "@/schema/billing.schema": loadModule("src/schema/billing.schema.ts"),
  "@/schema/machines.schema": loadModule("src/schema/machines.schema.ts"),
  "@/schema/recipes.schema": loadModule("src/schema/recipes.schema.ts"),
  "@/schema/installation-work-orders.schema": loadModule("src/schema/installation-work-orders.schema.ts"),
};

const routes = loadModule("src/routes/routes.ts", {
  "./path": paths,
  ...schemas,
  "@/text/home/home-messages": { HOME_MESSAGES: homeMessages },
  "@/text/admin/admin-messages": { ADMIN_MESSAGES: adminMessages },
  "@/text/moderator/moderator-messages": { MODERATOR_MESSAGES: moderatorMessages },
  "@/text/customer/customer-messages": { CUSTOMER_MESSAGES: customerMessages },
  "@/text/technician/technician-messages": { TECHNICIAN_MESSAGES: technicianMessages },
});

function renderRoleShell(relativePath, token, pathname) {
  let stateValues = [];
  let stateIndex = 0;
  let effects = [];
  const redirects = [];
  const hookReact = {
    ...React,
    useState(initialValue) {
      const currentIndex = stateIndex++;
      if (stateValues[currentIndex] === undefined) stateValues[currentIndex] = initialValue;
      return [stateValues[currentIndex], (value) => { stateValues[currentIndex] = value; }];
    },
    useEffect(effect) {
      effects.push(effect);
    },
  };
  const sidebar = loadModule("src/components/sidebar/sidebar.tsx", {
    "lucide-react": { LogOut: () => null },
    "next/link": ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children),
    "./sidebar.module.css": new Proxy({}, { get: (_target, key) => String(key) }),
  });
  const isTechnician = relativePath.includes("technician");
  const shellModule = loadModule(relativePath, {
    "react": hookReact,
    "js-cookie": { __esModule: true, default: { get: () => token, remove: () => undefined } },
    "lucide-react": new Proxy({}, { get: () => () => null }),
    "next/head": () => null,
    "next/link": ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children),
    "next/router": {
      useRouter: () => ({
        asPath: pathname,
        replace: async (path) => { redirects.push(path); return true; },
      }),
    },
    "@/apis/auth.api": { authApi: { logout: async () => undefined } },
    "@/components/sidebar/sidebar": sidebar,
    "@/lib/auth-role": loadModule("src/lib/auth-role.ts", { "@/routes/path": paths }),
    "@/routes/path": paths,
    "@/routes/routes": routes,
    "@/text/customer/customer-messages": { CUSTOMER_MESSAGES: customerMessages },
    "@/text/technician/technician-messages": { TECHNICIAN_MESSAGES: technicianMessages },
    [isTechnician ? "./technician-shell.module.css" : "./customer-shell.module.css"]:
      new Proxy({}, { get: (_target, key) => String(key) }),
  });
  const Shell = shellModule[isTechnician ? "TechnicianShell" : "CustomerShell"];
  const render = () => {
    stateIndex = 0;
    effects = [];
    return renderToStaticMarkup(React.createElement(Shell, {
      pageTitle: isTechnician ? "Việc được giao" : "Tổng quan",
      children: React.createElement("p", null, "Nội dung"),
    }));
  };

  render();
  for (const effect of effects) effect();
  return { html: render(), redirects };
}

function loadRolePage(relativePath, shellModule, messagesModule, stylesModule, roleRoutes) {
  return loadModule(relativePath, {
    "@/routes/routes": roleRoutes,
    "@/routes/path": paths,
    [messagesModule]: messagesModule === "@/text/customer/customer-messages"
      ? { CUSTOMER_MESSAGES: customerMessages }
      : { TECHNICIAN_MESSAGES: technicianMessages },
    [shellModule]: shellModule.includes("customer-shell")
      ? { CustomerShell: ({ children }) => React.createElement("main", { "data-shell": "customer" }, children) }
      : { TechnicianShell: ({ children }) => React.createElement("main", { "data-shell": "technician" }, children) },
    [stylesModule]: {
      pageContent: "pageContent",
      pageHeading: "pageHeading",
      pendingNotice: "pendingNotice",
    },
    ...(relativePath.includes("dashboard")
      ? {
          "./customer-read-screens": customerReadScreens,
          "./customer-workflow-screens": customerWorkflowScreens,
        }
      : relativePath.includes("technician")
        ? { "./technician-route-screens": technicianRouteScreens }
        : {}),
  });
}

const customerPage = loadRolePage(
  "src/pages/dashboard/[[...sections]].page.tsx",
  "./customer-shell",
  "@/text/customer/customer-messages",
  "./customer-shell.module.css",
  routes,
);
const technicianPage = loadRolePage(
  "src/pages/technician/[[...sections]].page.tsx",
  "./technician-shell",
  "@/text/technician/technician-messages",
  "./technician-shell.module.css",
  routes,
);

const id = "00000000-0000-4000-8000-000000000101";

test("Owner route catalog accepts all static Ni destinations and validated record routes", () => {
  for (const pathname of [
    ...routes.CUSTOMER_ROUTE_CATALOG.pages,
    ...routes.CUSTOMER_ROUTE_CATALOG.sections,
  ]) {
    const section = pathname === paths.PATH_CUSTOMER.ROOT
      ? ""
      : pathname.slice(paths.PATH_CUSTOMER.ROOT.length + 1);
    assert.equal(routes.isSupportedCustomerSection(section), true, pathname);
  }
  for (const section of [
    `contracts/${id}`,
    `machines/${id}`,
    `machines/${id}/model`,
    `invoices/${id}`,
    "invoices/2026-08",
    "menu/espresso",
    "menu/fresh-milk",
    `menu/${id}`,
    `support/${id}`,
  ]) {
    assert.equal(routes.isSupportedCustomerSection(section), true, section);
  }
  for (const section of ["unknown", "contracts/C-204", "invoices/2026-13", "machines/../admin", "contracts//new"]) {
    assert.equal(routes.isSupportedCustomerSection(section), false, section);
  }
});

test("Technician route catalog accepts all static Ni destinations and validated record routes", () => {
  for (const pathname of [
    ...routes.TECHNICIAN_ROUTE_CATALOG.pages,
    ...routes.TECHNICIAN_ROUTE_CATALOG.sections,
  ]) {
    const section = pathname === paths.PATH_TECHNICIAN.ROOT
      ? ""
      : pathname.slice(paths.PATH_TECHNICIAN.ROOT.length + 1);
    assert.equal(routes.isSupportedTechnicianSection(section), true, pathname);
  }
  for (const section of [
    "tasks",
    `tasks/${id}`,
    "tasks/standard-handover",
    "tasks/smart-activation",
    "tasks/repair",
    "tasks/retrieval",
    "tasks/substitute",
    "tasks/substitute-return",
    "tasks/refurbishment",
    "tasks/buyback-assessment",
    "tasks/maintenance-history",
    "history",
    `history/${id}`,
    "notifications",
  ]) {
    assert.equal(routes.isSupportedTechnicianSection(section), true, section);
  }
  for (const section of ["unknown", "tasks/YC-017", "history/C-031", "tasks/../admin", "history//bad"]) {
    assert.equal(routes.isSupportedTechnicianSection(section), false, section);
  }
});

test("Pages Router exposes supported Owner and Technician pages and rejects unknown routes", async () => {
  assert.deepEqual(
    await customerPage.getServerSideProps({ params: { sections: ["contracts", "new"] } }),
    { props: { sectionPath: "contracts/new" } },
  );
  assert.deepEqual(
    await technicianPage.getServerSideProps({ params: { sections: ["tasks", "repair"] } }),
    { props: { sectionPath: "tasks/repair" } },
  );
  assert.deepEqual(
    await customerPage.getServerSideProps({ params: { sections: ["unsupported"] } }),
    { notFound: true },
  );
  assert.deepEqual(
    await technicianPage.getServerSideProps({ params: { sections: ["unsupported"] } }),
    { notFound: true },
  );

  const customerHtml = renderToStaticMarkup(React.createElement(customerPage.default, { sectionPath: "" }));
  const technicianHtml = renderToStaticMarkup(React.createElement(technicianPage.default, { sectionPath: "tasks" }));
  assert.match(customerHtml, /Tổng quan/);
  assert.match(customerHtml, /role="status"/);
  assert.match(customerHtml, /Dữ liệu chưa khả dụng/);
  assert.match(technicianHtml, /Việc được giao/);
  assert.match(technicianHtml, /role="status"/);
});

test("Owner Phase 2 read routes show scoped-data unavailable states while action routes stay pending", () => {
  const readSections = [
    "",
    "contracts",
    `contracts/${id}`,
    "contracts/expiry",
    "contracts/end",
    "contracts/deposit-complete",
    "machines",
    `machines/${id}`,
    `machines/${id}/model`,
    "machines/history",
    "machines/substitute",
    "invoices",
    `invoices/${id}`,
    "invoices/2026-08",
    "invoices/standard",
    "menu",
    `menu/${id}`,
  ];

  for (const section of readSections) {
    assert.equal(customerReadScreens.getCustomerScreenDescriptor(section).availability, "unavailable", section);
  }

  const pendingSections = [
    "contracts/new",
    "contracts/end-early",
    "invoices/payment",
    "invoices/shortfall",
    "invoices/refund",
    "invoices/reminder",
    "invoices/standard-payment",
    "menu/espresso",
    "menu/fresh-milk",
    "menu/add-dish",
    "menu/sent",
    "menu/applied",
    "support",
    "buyback",
    "notifications",
  ];

  for (const section of pendingSections) {
    assert.equal(customerReadScreens.getCustomerScreenDescriptor(section).availability, "pending", section);
  }

  const renderedReadScreen = renderToStaticMarkup(
    React.createElement(customerReadScreens.CustomerReadScreen, { sectionPath: `contracts/${id}` }),
  );
  assert.match(renderedReadScreen, /Dữ liệu chưa khả dụng/);
  assert.match(renderedReadScreen, /thuộc cửa hàng của bạn/);
  assert.doesNotMatch(renderedReadScreen, /C-204|S-018|YC-017/);

  const renderedActionScreen = renderToStaticMarkup(
    React.createElement(customerReadScreens.CustomerReadScreen, { sectionPath: "invoices/payment" }),
  );
  assert.match(renderedActionScreen, /Chức năng này hiện chưa khả dụng/);
  assert.doesNotMatch(renderedActionScreen, /Dữ liệu chưa khả dụng/);
});

test("Owner Phase 3 routes resolve to unavailable workflows with disabled actions", () => {
  const workflowSections = [
    "invoices/payment",
    "invoices/shortfall",
    "invoices/refund",
    "invoices/reminder",
    "invoices/standard-payment",
    "menu/espresso",
    "menu/fresh-milk",
    "menu/add-dish",
    "menu/sent",
    "menu/applied",
    "support",
    "support/new",
    "support/menu",
    `support/${id}`,
    "buyback",
    "buyback/new",
    "buyback/documents",
    "buyback/documents/confirmed",
    "buyback/issue",
    "notifications",
  ];

  for (const section of workflowSections) {
    assert.equal(routes.isSupportedCustomerSection(section), true, section);
    const descriptor = customerWorkflowScreens.getCustomerWorkflowDescriptor(section);
    assert.ok(descriptor, section);

    const html = renderToStaticMarkup(
      React.createElement(customerWorkflowScreens.CustomerWorkflowScreen, { sectionPath: section }),
    );
    assert.match(html, /role="status"/, section);
    assert.doesNotMatch(html, /C-204|S-018|YC-017|MB-017/, section);
    if (descriptor.fields?.length) assert.match(html, /<fieldset[^>]*disabled/, section);
    if (descriptor.actions?.length || descriptor.filters?.length) {
      assert.match(html, /<button[^>]*disabled/, section);
    }
  }
  assert.ok(customerWorkflowScreens.getCustomerWorkflowDescriptor("menu/applied"));

  const paymentHtml = renderToStaticMarkup(
    React.createElement(customerWorkflowScreens.CustomerWorkflowScreen, { sectionPath: "invoices/payment" }),
  );
  assert.match(paymentHtml, /Gửi chứng từ thanh toán/);
  assert.match(paymentHtml, /disabled/);
  assert.match(paymentHtml, /Chứng từ không được tải lên/);
  assert.doesNotMatch(paymentHtml, /<form/);

  const supportHtml = renderToStaticMarkup(
    React.createElement(customerWorkflowScreens.CustomerWorkflowScreen, { sectionPath: "support/new" }),
  );
  assert.match(supportHtml, /<fieldset[^>]*disabled/);
  assert.match(supportHtml, /Gửi yêu cầu hỗ trợ/);
  assert.match(supportHtml, /Yêu cầu chưa được gửi/);

  const confirmationHtml = renderToStaticMarkup(
    React.createElement(customerWorkflowScreens.CustomerWorkflowScreen, {
      sectionPath: "buyback/documents/confirmed",
    }),
  );
  assert.match(confirmationHtml, /Hệ thống chưa ghi nhận xác nhận nào/);
  assert.doesNotMatch(confirmationHtml, /Đã ghi nhận thành công|Đã xác nhận nhận tiền|MB-017|8\.000\.000/);

  const notificationsHtml = renderToStaticMarkup(
    React.createElement(customerPage.default, { sectionPath: "notifications" }),
  );
  assert.match(notificationsHtml, /Thông báo của tôi/);
  assert.match(notificationsHtml, /chưa xác minh phạm vi chỉ trả thông báo thuộc Owner/);
  assert.match(notificationsHtml, /Chưa đọc/);
  assert.match(notificationsHtml, /Lọc thông báo/);
  assert.match(notificationsHtml, /Đánh dấu đã đọc/);
  assert.match(notificationsHtml, /disabled/);
});

test("Technician Phase 4 routes expose unavailable reads and all nine disabled workflows", () => {
  const workflowSections = [
    "tasks/standard-handover",
    "tasks/smart-activation",
    "tasks/repair",
    "tasks/retrieval",
    "tasks/substitute",
    "tasks/substitute-return",
    "tasks/refurbishment",
    "tasks/buyback-assessment",
    "tasks/maintenance-history",
  ];

  for (const section of [
    "",
    "tasks",
    `tasks/${id}`,
    ...workflowSections,
    "history",
    `history/${id}`,
    "notifications",
  ]) {
    assert.equal(routes.isSupportedTechnicianSection(section), true, section);
    const descriptor = technicianRouteScreens.getTechnicianScreenDescriptor(section);
    const html = renderToStaticMarkup(
      React.createElement(technicianRouteScreens.TechnicianRouteScreen, { sectionPath: section }),
    );
    assert.ok(descriptor, section);
    assert.match(html, /role="status"/, section);
    assert.doesNotMatch(html, /YC-017|S-018|MB-017|C-204/, section);
    if (descriptor.fields?.length) assert.match(html, /<fieldset[^>]*disabled/, section);
    if (descriptor.actions?.length) assert.match(html, /<button[^>]*disabled/, section);
    if (workflowSections.includes(section)) {
      assert.ok(descriptor.fields?.length, section);
      assert.ok(descriptor.actions?.length, section);
      assert.doesNotMatch(html, /<form/, section);
    }
  }

  const taskListHtml = renderToStaticMarkup(
    React.createElement(technicianPage.default, { sectionPath: "tasks" }),
  );
  assert.match(taskListHtml, /Việc được giao/);
  assert.match(taskListHtml, /chưa có endpoint xác nhận việc được giao/);
  assert.match(taskListHtml, /Giao máy/);
  assert.match(taskListHtml, /disabled/);

  const notificationHtml = renderToStaticMarkup(
    React.createElement(technicianPage.default, { sectionPath: "notifications" }),
  );
  assert.match(notificationHtml, /Thông báo công việc/);
  assert.match(notificationHtml, /chưa xác nhận phạm vi chỉ trả thông báo thuộc Technician/);
  assert.match(notificationHtml, /Chưa đọc/);
  assert.doesNotMatch(notificationHtml, /YC-017|YC-019/);
});

test("role shells admit only their matching token and expose accessible navigation", () => {
  const customerHtml = renderRoleShell(
    "src/pages/dashboard/customer-shell.tsx",
    tokenWithRoles(["owner"]),
    "/dashboard",
  );
  const technicianHtml = renderRoleShell(
    "src/pages/technician/technician-shell.tsx",
    tokenWithRoles(["technician"]),
    "/technician/tasks",
  );
  const customerDenied = renderRoleShell(
    "src/pages/dashboard/customer-shell.tsx",
    tokenWithRoles(["technician"]),
    "/dashboard",
  );
  const technicianDenied = renderRoleShell(
    "src/pages/technician/technician-shell.tsx",
    tokenWithRoles(["owner"]),
    "/technician/tasks",
  );

  assert.match(customerHtml.html, /data-role="customer"/);
  assert.match(customerHtml.html, /aria-label="Điều hướng Khách hàng"/);
  assert.match(customerHtml.html, /href="\/dashboard\/notifications"/);
  assert.match(technicianHtml.html, /data-role="technician"/);
  assert.match(technicianHtml.html, /aria-label="Điều hướng Technician"/);
  assert.match(technicianHtml.html, /href="\/technician\/history"/);
  assert.match(customerDenied.html, /không có quyền vào khu vực Khách hàng/);
  assert.doesNotMatch(customerDenied.html, /data-role="customer"/);
  assert.match(technicianDenied.html, /không có quyền vào khu vực Technician/);
  assert.doesNotMatch(technicianDenied.html, /data-role="technician"/);

  const unauthenticated = renderRoleShell(
    "src/pages/dashboard/customer-shell.tsx",
    undefined,
    "/dashboard",
  );
  assert.deepEqual(unauthenticated.redirects, ["/login"]);
  assert.match(unauthenticated.html, /Đang kiểm tra quyền truy cập/);
});
