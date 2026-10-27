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
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  const loaded = { exports: {} };
  const mockedRequire = (id) =>
    Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : require(id);
  new Function("require", "module", "exports", outputText)(
    mockedRequire,
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

function routeModules() {
  const paths = loadModule("src/routes/path.ts");
  const routeCatalog = loadModule("src/routes/routes.ts", {
    "./path": paths,
    "@/schema/contracts.schema": loadModule("src/schema/contracts.schema.ts"),
    "@/schema/billing.schema": loadModule("src/schema/billing.schema.ts"),
    "@/schema/machines.schema": loadModule("src/schema/machines.schema.ts"),
    "@/schema/recipes.schema": loadModule("src/schema/recipes.schema.ts"),
    "@/schema/installation-work-orders.schema": loadModule("src/schema/installation-work-orders.schema.ts"),
    "@/text/home/home-messages": loadModule("src/text/home/home-messages.ts"),
    "@/text/admin/admin-messages": loadModule("src/text/admin/admin-messages.ts"),
    "@/text/moderator/moderator-messages": {
      MODERATOR_MESSAGES: loadModule("src/text/moderator/moderator-messages.ts").MODERATOR_MESSAGES,
    },
    "@/text/customer/customer-messages": {
      CUSTOMER_MESSAGES: loadModule("src/text/customer/customer-messages.ts").CUSTOMER_MESSAGES,
    },
    "@/text/technician/technician-messages": {
      TECHNICIAN_MESSAGES: loadModule("src/text/technician/technician-messages.ts").TECHNICIAN_MESSAGES,
    },
  });
  return { paths, routeCatalog };
}

function moderatorShellHarness({ pathname, hasRole }) {
  let accessState = "checking";
  const hookReact = {
    ...React,
    useState: (initialValue) => initialValue === "checking"
      ? [accessState, (nextValue) => { accessState = nextValue; }]
      : [initialValue, () => {}],
    useEffect: (effect) => effect(),
    useRef: (initialValue) => ({ current: initialValue }),
  };
  const icon = () => null;
  const { paths, routeCatalog } = routeModules();
  const messages = loadModule("src/text/moderator/moderator-messages.ts").MODERATOR_MESSAGES;
  const sidebarModule = loadModule("src/components/sidebar/sidebar.tsx", {
    "lucide-react": { LogOut: () => null },
    "next/link": ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children),
    "./navigation-route": loadModule("src/components/sidebar/navigation-route.ts"),
    "./sidebar.module.css": new Proxy({}, { get: (_target, key) => String(key) }),
  });
  const { AdminBreadcrumb } = loadModule("src/components/heading/admin-breadcrumb.tsx", {
    "next/link": ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children),
  });
  const { ModeratorShell } = loadModule("src/pages/moderator/moderator-shell.tsx", {
    "react": hookReact,
    "js-cookie": { __esModule: true, default: { get: () => "moderator-token" } },
    "lucide-react": new Proxy({}, { get: () => icon }),
    "next/head": () => null,
    "next/link": ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children),
    "next/router": {
      useRouter: () => ({
        asPath: pathname,
        replace: () => Promise.resolve(true),
      }),
    },
    "@/apis/auth.api": { authApi: { logout: async () => undefined } },
    "@/lib/auth-role": { hasModeratorRole: hasRole },
    "@/routes/path": paths,
    "@/routes/routes": routeCatalog,
    "@/components/sidebar/navigation-route": loadModule("src/components/sidebar/navigation-route.ts"),
    "@/components/sidebar/mobile-navigation": {
      MobileNavigation: ({ triggerLabel }) => React.createElement("button", { type: "button", "aria-label": triggerLabel }, triggerLabel),
    },
    "@/text/moderator/moderator-messages": { MODERATOR_MESSAGES: messages },
    "@/components/action-bar/action-bar": {
      ActionBar: ({ children, label }) => React.createElement("footer", { "aria-label": label }, children),
    },
    "@/components/button/button-bar": {
      ButtonBar: ({ children, href, ...props }) => href
        ? React.createElement("a", { href, ...props }, children)
        : React.createElement("button", props, children),
    },
    "@/components/sidebar/sidebar": sidebarModule,
    "@/components/heading/admin-breadcrumb": { AdminBreadcrumb },
    "./moderator-shell.module.css": new Proxy({}, { get: (_target, key) => String(key) }),
  });

  return {
    render: () => renderToStaticMarkup(
      React.createElement(ModeratorShell, {
        pageTitle: "Hợp đồng",
        children: React.createElement("p", null, "Nội dung"),
      }),
    ),
  };
}

test("Moderator route catalog accepts known pages and valid IDs, and rejects unknown paths", () => {
  const { routeCatalog } = routeModules();
  const validSections = [
    "",
    "contracts",
    "contracts/C-204",
    "contracts/00000000-0000-4000-8000-000000000000",
    "customers/nguyen-minh-anh",
    "invoices/00000000-0000-4000-8000-000000000001",
    "machines/S-018",
    "machines/00000000-0000-4000-8000-000000000101",
    "technical-requests/YC-017",
    "machine-history/S-018",
    "buyback/MB-2026-017",
  ];
  for (const section of validSections) {
    assert.equal(
      routeCatalog.isSupportedModeratorSection(section),
      true,
      "Expected supported route section: " + section,
    );
  }

  for (const section of [
    "unknown",
    "//contracts",
    "contracts//C-204",
    "contracts/not-a-record",
    "contracts/C-20",
    "machines/not-a-machine-id",
    "machine-history/not-a-machine-id",
    "invoices/HD-09-204",
    "menu/espresso/invalid",
    "technical-requests/YC-17",
  ]) {
    assert.equal(
      routeCatalog.isSupportedModeratorSection(section),
      false,
      "Expected unsupported route section: " + section,
    );
  }
});

test("Moderator Pages Router entry returns 404 for unsupported sections", async () => {
  const { paths, routeCatalog } = routeModules();
  const page = loadModule("src/pages/moderator/[[...sections]].page.tsx", {
    "@/routes/routes": routeCatalog,
    "@/routes/path": paths,
    "@/text/moderator/moderator-messages": {
      MODERATOR_MESSAGES: loadModule("src/text/moderator/moderator-messages.ts").MODERATOR_MESSAGES,
    },
    "./moderator-shell": {
      ModeratorShell: ({ children }) => children,
      moderatorStyles: new Proxy({}, { get: (_target, key) => String(key) }),
    },
    "./moderator-page-heading": {
      ModeratorPageHeading: ({ title }) => React.createElement("header", null, React.createElement("h1", null, title)),
    },
  });

  assert.deepEqual(
    await page.getServerSideProps({ params: { sections: ["contracts", "C-204"] } }),
    { props: { sectionPath: "contracts/C-204" } },
  );
  const detailHtml = renderToStaticMarkup(
    React.createElement(page.default, { sectionPath: "contracts/C-204" }),
  );
  assert.match(detailHtml, /<h1>Hợp đồng<\/h1>/);
  assert.deepEqual(
    await page.getServerSideProps({ params: { sections: ["unknown"] } }),
    { notFound: true },
  );
});

test("Moderator shell shows its navigation and selects the current nested section", () => {
  const shell = moderatorShellHarness({
    pathname: "/moderator/contracts/C-204",
    hasRole: () => true,
  });
  shell.render();
  const html = shell.render();

  assert.match(html, /data-role="moderator"/);
  assert.match(html, /href="\/moderator\/contracts"[^>]*aria-current="page"/);
  assert.match(html, /<nav aria-label="Đường dẫn">/);
  assert.match(html, /<span aria-current="page">Hợp đồng<\/span>/);
  assert.match(html, /Tài khoản khách/);
  assert.match(html, /Giám sát Smart IoT/);
  assert.match(html, /href="\/moderator\/notifications"/);
});

test("Moderator shell keeps other roles out of the Moderator navigation", () => {
  const shell = moderatorShellHarness({
    pathname: "/moderator/contracts",
    hasRole: () => false,
  });
  shell.render();
  const html = shell.render();

  assert.match(html, /Tài khoản này không có quyền vào khu vực Moderator/);
  assert.match(html, /href="\/"/);
  assert.match(html, /href="\/login"/);
  assert.doesNotMatch(html, /data-role="moderator"/);
  assert.doesNotMatch(html, /href="\/moderator\/contracts"/);
  assert.doesNotMatch(html, /<footer/);
});

test("Moderator shell shows section actions only on root lists and overview", () => {
  const contracts = moderatorShellHarness({
    pathname: "/moderator/contracts",
    hasRole: () => true,
  });
  contracts.render();
  const contractsHtml = contracts.render();
  assert.match(contractsHtml, /<footer aria-label="Thao tác Moderator">/);
  assert.match(contractsHtml, /<a href="\/moderator\/contracts\/new">Tạo hồ sơ hợp đồng<\/a>/);

  const detail = moderatorShellHarness({
    pathname: "/moderator/contracts/00000000-0000-4000-8000-000000000000",
    hasRole: () => true,
  });
  detail.render();
  const detailHtml = detail.render();
  assert.doesNotMatch(detailHtml, /<footer/);

  const overview = moderatorShellHarness({
    pathname: "/moderator",
    hasRole: () => true,
  });
  overview.render();
  const overviewHtml = overview.render();
  assert.match(overviewHtml, /<footer aria-label="Thao tác Moderator"><a href="\/moderator\/invoices">Việc cần xử lý<\/a><\/footer>/);
});
