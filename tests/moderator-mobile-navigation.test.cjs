const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

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
  const mockedRequire = (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  new Function("require", "module", "exports", outputText)(mockedRequire, loaded, loaded.exports);
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

function createShellHarness({ pathname, hasRole = true } = {}) {
  let accessState = "checking";
  const navigationCalls = [];
  const logoutCalls = [];
  const routerCalls = [];
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
    "lucide-react": { LogOut: icon },
    "next/link": ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children),
    "./navigation-route": loadModule("src/components/sidebar/navigation-route.ts"),
    "./sidebar.module.css": new Proxy({}, { get: (_target, key) => String(key) }),
  });
  const { AdminBreadcrumb } = loadModule("src/components/heading/admin-breadcrumb.tsx", {
    "next/link": ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children),
  });
  const { ModeratorShell } = loadModule("src/pages/moderator/moderator-shell.tsx", {
    react: hookReact,
    "js-cookie": { __esModule: true, default: { get: () => "moderator-token", remove() {} } },
    "lucide-react": new Proxy({}, { get: () => icon }),
    "next/head": () => null,
    "next/link": ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children),
    "next/router": {
      useRouter: () => ({
        asPath: pathname,
        replace: (href) => { routerCalls.push(href); return Promise.resolve(true); },
      }),
    },
    "@/apis/auth.api": { authApi: { logout: async () => { logoutCalls.push("logout"); } } },
    "@/lib/auth-role": { hasModeratorRole: () => hasRole },
    "@/routes/path": paths,
    "@/routes/routes": routeCatalog,
    "@/text/moderator/moderator-messages": { MODERATOR_MESSAGES: messages },
    "@/components/sidebar/navigation-route": loadModule("src/components/sidebar/navigation-route.ts"),
    "@/components/action-bar/action-bar": {
      ActionBar: ({ children, label }) => React.createElement("footer", { "aria-label": label }, children),
    },
    "@/components/button/button-bar": {
      ButtonBar: ({ children, href, ...props }) => href
        ? React.createElement("a", { href, ...props }, children)
        : React.createElement("button", props, children),
    },
    "@/components/sidebar/sidebar": sidebarModule,
    "@/components/sidebar/mobile-navigation": {
      MobileNavigation: (props) => {
        navigationCalls.push(props);
        return React.createElement(
          "div",
          { "data-shared-mobile-navigation": "true" },
          React.createElement("button", {
            type: "button",
            "aria-label": props.triggerLabel,
            "aria-expanded": "false",
          }, props.triggerLabel),
          React.createElement("span", null, props.items.map((item) => item.label).join("|")),
        );
      },
    },
    "@/components/heading/admin-breadcrumb": { AdminBreadcrumb },
    "./moderator-shell.module.css": new Proxy({}, { get: (_target, key) => String(key) }),
  });

  const render = () => renderToStaticMarkup(
    React.createElement(ModeratorShell, {
      pageTitle: "Hợp đồng",
      children: React.createElement("p", null, "Screen content"),
    }),
  );

  return { render, navigationCalls, logoutCalls, routerCalls, routeCatalog };
}

test("Moderator mobile header uses shared navigation with the full role menu and its logout callback", () => {
  const shell = createShellHarness({ pathname: "/moderator/contracts/C-204?tab=details" });
  shell.render();
  const html = shell.render();
  const props = shell.navigationCalls.at(-1);
  const expectedItems = shell.routeCatalog.MODERATOR_NAVIGATION_LINKS.map((item) => ({
    label: item.LABEL,
    href: item.HREF,
  }));

  assert.match(html, /data-shared-mobile-navigation="true"/);
  assert.match(html, /aria-label="Mở menu điều hướng"/);
  assert.deepEqual(props.items.map(({ label, href }) => ({ label, href })), expectedItems);
  assert.equal(props.pathname, "/moderator/contracts/C-204");
  assert.equal(props.rootHref, "/moderator");
  assert.equal(props.logout.pending, false);
  assert.equal(props.logout.label, "Đăng xuất");
  assert.equal(typeof props.logout.onLogout, "function");
});

test("Moderator keeps mobile notifications and nested-section heading while the shared drawer is mounted", () => {
  const shell = createShellHarness({ pathname: "/moderator/contracts/C-204?tab=details" });
  shell.render();
  const html = shell.render();
  const shellSource = readFileSync(join(root, "src/pages/moderator/moderator-shell.tsx"), "utf8");
  const mobileHeaderStart = shellSource.indexOf("className={styles.mobileHeader}");
  const mobileHeaderEnd = shellSource.indexOf("</header>", mobileHeaderStart);
  const mobileHeaderSource = shellSource.slice(mobileHeaderStart, mobileHeaderEnd);

  assert.notEqual(mobileHeaderStart, -1);
  assert.notEqual(mobileHeaderEnd, -1);
  assert.match(mobileHeaderSource, /notificationsLink\.HREF/);
  assert.match(mobileHeaderSource, /<MobileNavigation/);
  assert.match(html, /href="\/moderator\/notifications"/);
  assert.match(html, /<span aria-current="page">[^<]+<\/span>/);
  assert.match(html, /<a href="\/moderator\/contracts"[^>]*aria-current="page">/);
});
test("the old Moderator shortcut list and inline sheet implementation are removed", () => {
  const shellSource = readFileSync(join(root, "src/pages/moderator/moderator-shell.tsx"), "utf8");
  const styleSource = readFileSync(join(root, "src/pages/moderator/moderator-shell.module.css"), "utf8");
  const { routeCatalog } = routeModules();

  assert.equal(routeCatalog.MODERATOR_MOBILE_NAVIGATION_LINKS, undefined);
  assert.doesNotMatch(shellSource, /MODERATOR_MOBILE_NAVIGATION_LINKS/);
  assert.doesNotMatch(shellSource, /mobileMenuOpen|menuDialogRef|menuCloseRef|menuTriggerRef/);
  assert.doesNotMatch(shellSource, /styles\.menuBackdrop|styles\.mobileMenu|styles\.mobileNav/);
  assert.doesNotMatch(styleSource, /\.mobileNav\b|\.menuBackdrop\b|\.mobileMenu\b/);
});

test("Moderator ActionBar overrides its inherited 64px mobile offset after removing the bottom navigation strip", () => {
  const shellSource = readFileSync(join(root, "src/pages/moderator/moderator-shell.tsx"), "utf8");
  const styleSource = readFileSync(join(root, "src/pages/moderator/moderator-shell.module.css"), "utf8");
  const actionBarStyle = readFileSync(join(root, "src/components/action-bar/action-bar.module.css"), "utf8");
  const mobileStyles = styleSource.match(/@media\s*\(max-width:\s*1023px\)[\s\S]*$/)?.[0] ?? "";
  const mobileRules = [...mobileStyles.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const moderatorDockOverride = mobileRules.find(([, selector, declarations]) =>
    (selector.includes(":global(") || selector.includes("action")) && /bottom:\s*0(?:px)?/.test(declarations),
  );

  assert.match(shellSource, /<ActionBar[\s\S]*?renderActions\(\)[\s\S]*?<\/ActionBar>/);
  assert.match(actionBarStyle, /bottom:\s*64px/);
  assert.ok(moderatorDockOverride, "Moderator shell must scope an ActionBar dock override to bottom: 0 at mobile widths");
});

test("Moderator logout remains role-owned and routes to login after the auth logout callback", async () => {
  const shell = createShellHarness({ pathname: "/moderator/contracts", hasRole: true });
  shell.render();
  shell.render();
  const props = shell.navigationCalls.at(-1);

  await props.logout.onLogout();
  assert.deepEqual(shell.logoutCalls, ["logout"]);
  assert.deepEqual(shell.routerCalls, ["/login"]);
});
