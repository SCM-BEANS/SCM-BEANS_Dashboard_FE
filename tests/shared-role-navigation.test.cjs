const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const root = join(__dirname, "..");

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

function createIcon(name) {
  return function Icon({ size = 20, ...props }) {
    return React.createElement("svg", { ...props, width: size, height: size, "data-icon": name });
  };
}

const cssModule = new Proxy({}, { get: (_target, key) => `test-${String(key)}` });
const Link = ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children);

function loadNavigationRoute() {
  return loadTypeScriptModule("src/components/sidebar/navigation-route.ts");
}

function loadSidebar(routeModule = loadNavigationRoute()) {
  return loadTypeScriptModule("src/components/sidebar/sidebar.tsx", {
    "next/link": Link,
    "lucide-react": { LogOut: createIcon("logout") },
    "./sidebar.module.css": cssModule,
    "./navigation-route": routeModule,
  });
}

function loadMobileNavigation({ open = false } = {}) {
  const routeModule = loadNavigationRoute();
  const sidebar = loadSidebar(routeModule);
  const reactWithControlledState = new Proxy(React, {
    get(target, key) {
      if (key === "useState") return () => [open, () => {}];
      if (key === "useEffect") return () => {};
      if (key === "useRef") return (initialValue) => ({ current: initialValue });
      return Reflect.get(target, key, target);
    },
  });

  return loadTypeScriptModule("src/components/sidebar/mobile-navigation.tsx", {
    react: reactWithControlledState,
    "lucide-react": { Menu: createIcon("menu"), X: createIcon("close") },
    "@/components/sidebar/sidebar": sidebar,
    "./mobile-navigation.module.css": cssModule,
  });
}

const menuItems = [
  { label: "Overview", href: "/admin", icon: createIcon("overview") },
  { label: "Contracts", href: "/admin/contracts", icon: createIcon("contracts") },
  { label: "New contract", href: "/admin/contracts/new", icon: createIcon("new-contract") },
  {
    label: "Reports pending",
    href: "/admin/reports",
    icon: createIcon("reports"),
    enabled: false,
    title: "Coming soon",
  },
];

const logout = {
  label: "Sign out",
  pendingLabel: "Signing out",
  pending: false,
  onLogout() {},
};

test("normalizes query strings, hashes, and trailing slashes before route matching", () => {
  const { normalizeNavigationPath } = loadNavigationRoute();

  assert.equal(normalizeNavigationPath("/admin/contracts/42/?tab=machines#history"), "/admin/contracts/42");
  assert.equal(normalizeNavigationPath("/admin/?query=yes"), "/admin");
  assert.equal(normalizeNavigationPath("/"), "/");
});

test("matches an exact destination and picks the most specific enabled parent for nested detail routes", () => {
  const { getActiveNavigationItem } = loadNavigationRoute();
  const exactRoot = getActiveNavigationItem(menuItems, "/admin/?tab=overview", "/admin");
  const nestedDetail = getActiveNavigationItem(menuItems, "/admin/contracts/42?tab=payments#current", "/admin");
  const exactNested = getActiveNavigationItem(menuItems, "/admin/contracts/new/", "/admin");

  assert.equal(exactRoot, menuItems[0]);
  assert.equal(nestedDetail, menuItems[1]);
  assert.equal(exactNested, menuItems[2]);
});

test("does not activate a role root as a prefix of an unrelated route and ignores disabled matches", () => {
  const { getActiveNavigationItem } = loadNavigationRoute();

  assert.equal(getActiveNavigationItem(menuItems, "/administrator/contracts", "/admin"), undefined);
  assert.equal(getActiveNavigationItem(menuItems, "/admin/reports", "/admin"), undefined);
});

test("marks at most one item current when multiple menu entries match the same path", () => {
  const { getActiveNavigationItem } = loadNavigationRoute();
  const duplicateItems = [
    ...menuItems,
    { label: "Duplicate contracts", href: "/admin/contracts", icon: createIcon("duplicate") },
  ];
  const activeItem = getActiveNavigationItem(duplicateItems, "/admin/contracts/42", "/admin");
  const activeItems = duplicateItems.filter((item) => item === activeItem);

  assert.equal(activeItems.length, 1);
  assert.equal(activeItem, menuItems[1]);
});

test("the closed mobile navigation exposes a named hamburger with controlled expanded state", () => {
  const { MobileNavigation } = loadMobileNavigation();
  const markup = renderToStaticMarkup(React.createElement(MobileNavigation, {
    items: menuItems,
    pathname: "/admin",
    rootHref: "/admin",
    navigationLabel: "Admin navigation",
    drawerLabel: "All Admin pages",
    triggerLabel: "Open navigation menu",
    closeLabel: "Close navigation",
    logout,
  }));

  assert.match(markup, /aria-label="Open navigation menu"/);
  assert.match(markup, /aria-expanded="false"/);
  assert.match(markup, /aria-controls="[^"]+"/);
  assert.doesNotMatch(markup, /role="dialog"/);
});

test("the open bottom sheet is named, contains role routes, keeps disabled items inert, and includes logout", () => {
  const { MobileNavigation } = loadMobileNavigation({ open: true });
  const markup = renderToStaticMarkup(React.createElement(MobileNavigation, {
    items: menuItems,
    pathname: "/admin/contracts/42?tab=payments",
    rootHref: "/admin",
    navigationLabel: "Admin navigation",
    drawerLabel: "All Admin pages",
    triggerLabel: "Open navigation menu",
    closeLabel: "Close navigation",
    logout,
  }));

  assert.match(markup, /role="dialog"/);
  assert.match(markup, /aria-modal="true"/);
  assert.match(markup, /aria-label="All Admin pages"/);
  assert.match(markup, /aria-label="Close navigation"/);
  assert.match(markup, /href="\/admin\/contracts"[^>]*aria-current="page"/);
  assert.match(markup, /<span[^>]*aria-disabled="true"[^>]*title="Coming soon"/);
  assert.doesNotMatch(markup, /href="\/admin\/reports"/);
  assert.match(markup, /Sign out/);
});

test("the shared drawer styles provide 44px targets, reduced-motion support, and the 1024px desktop breakpoint", () => {
  const css = readFileSync(join(root, "src/components/sidebar/mobile-navigation.module.css"), "utf8");

  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /min-width:\s*1024px|max-width:\s*1023px/);
});

test("Admin renders the shared navigation from its mobile header and keeps its disabled mapping/logout", () => {
  const shell = readFileSync(join(root, "src/pages/admin/admin-shell.tsx"), "utf8");
  const menu = readFileSync(join(root, "src/pages/admin/menu/admin-menu.tsx"), "utf8");
  const mobileHeaderStart = shell.indexOf("className={styles.mobileHeader}");
  const mobileHeaderEnd = shell.indexOf("</header>", mobileHeaderStart);
  const mobileHeader = shell.slice(mobileHeaderStart, mobileHeaderEnd);

  assert.match(shell, /import\s*\{\s*MobileNavigation\s*\}\s*from\s*["']@\/components\/sidebar\/mobile-navigation["']/);
  assert.notEqual(mobileHeaderStart, -1);
  assert.notEqual(mobileHeaderEnd, -1);
  assert.match(mobileHeader, /<MobileNavigation/);
  assert.match(mobileHeader, /ADMIN_SIDEBAR_ITEMS/);
  assert.match(menu, /enabled:\s*ADMIN_ENABLED_PATHS\.has\(item\.HREF\)/);
  assert.match(shell, /onLogout:\s*handleLogout/);
});
