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
    "lucide-react": { LogOut: createIcon("logout"), PanelLeft: createIcon("sidebar") },
    "./sidebar.module.css": cssModule,
    "./navigation-route": routeModule,
    "./settings-menu": { SettingsMenu: () => null },
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

test("the open side drawer is named, contains role routes, keeps disabled items inert, and includes logout", () => {
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
  const mobileHeaderStart = shell.indexOf("styles.mobileHeader}");
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


test("shared workspace controls the matching sidebar with an accessible native button", () => {
  const sidebar = loadSidebar();
  const html = renderToStaticMarkup(React.createElement(sidebar.SidebarShell, { className: 'shell' },
    React.createElement(sidebar.Sidebar, { brand: 'Dolores', brandHref: '/admin', roleLabel: 'Admin', pathname: '/admin', rootHref: '/admin', navigationLabel: 'Admin', items: menuItems }),
    React.createElement(sidebar.SidebarWorkspace, { className: 'workspace', notifications: null }, React.createElement('main', { 'aria-label': 'Overview' }))));
  const sidebarId = html.match(/<aside[^>]*id="([^"]+)"/)[1];
  assert.ok(html.includes(`aria-controls="${sidebarId}"`));
  assert.match(html, /<button[^>]*type="button"[^>]*aria-label="Thu g\u1ecdn thanh b\u00ean"[^>]*aria-expanded="true"/);
  assert.doesNotMatch(html, /aria-label="\u0110\u01b0\u1eddng d\u1eabn"/);
});

test("sidebar preference persists and still toggles when storage is unavailable", () => {
  for (const blocked of [false, true]) {
    let state = false;
    let saved = 'true';
    let effect;
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: () => { if (blocked) throw new Error('blocked'); return saved; },
      setItem: (_key, value) => { if (blocked) throw new Error('blocked'); saved = value; },
    } });
    try {
      const hookReact = { ...React, useId: () => 'test-sidebar', useState: () => [state, next => { state = next; }], useEffect: next => { effect = next; } };
      const sidebar = loadTypeScriptModule('src/components/sidebar/sidebar.tsx', {
        react: hookReact, 'next/link': Link, './navigation-route': loadNavigationRoute(),
        './sidebar.module.css': cssModule, './settings-menu': { SettingsMenu: () => null },
      });
      sidebar.SidebarShell({ className: 'shell', children: null });
      effect();
      assert.equal(state, !blocked);
      const tree = sidebar.SidebarShell({ className: 'shell', children: null });
      tree.props.value.toggle();
      assert.equal(state, blocked);
      if (!blocked) assert.equal(saved, 'false');
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
      else delete globalThis.localStorage;
    }
  }
});


test("TailAdmin shells keep their role scopes and header settings inside the isolated theme", () => {
  for (const [folder, role] of [["admin", "admin"], ["moderator", "moderator"], ["dashboard", "customer"], ["technician", "technician"]]) {
    const source = readFileSync(join(root, `src/pages/${folder}/${role}-shell.tsx`), "utf8");
    assert.match(source, /<SidebarShell[^>]*dashboard-tailadmin/);
    assert.match(source, /<SidebarWorkspace[^\n]*context=\{[^}]+\}[^\n]*settingsHref=/);
    assert.ok(source.includes(`scope="${role}"`));
    assert.match(source, /<ActionBarLayout/);
  }
  const css = readFileSync(join(root, "src/components/sidebar/sidebar.module.css"), "utf8");
  assert.match(css, /width: 290px/);
  assert.match(css, /margin-left: -290px; visibility: hidden/);
  assert.doesNotMatch(css, /margin: 12px|border-radius: 12px/);
});

test("body portals carry the dashboard aliases without changing their portal target", () => {
  for (const file of ["notifications/notification-runtime.tsx", "notifications/notification-bell.tsx", "features/maintenance-workflow/maintenance-ticket-actions.tsx"]) {
    const source = readFileSync(join(root, "src/components", file), "utf8");
    assert.match(source, /dashboard-tailadmin-portal/);
    assert.match(source, /document.body/);
  }
});


test("dev controls isolate dashboard styling and stay unavailable in production", () => {
  const environment = process.env.NODE_ENV;
  let pathname = "/admin";
  try {
    process.env.NODE_ENV = "development";
    let stateIndex = 0;
    let hasHeader = true;
    const { DevQuickLoginControls } = loadTypeScriptModule("src/components/dev-quick-login-controls.tsx", {
      react: { useState: value => [++stateIndex === 4 && hasHeader ? {} : value, () => {}], useEffect: () => {} },
      "react-dom": { createPortal: (children, target) => { assert.ok(target); return children; } },
      "next/router": { useRouter: () => ({ pathname }) },
      "@/schema/auth.schema": {},
      "@/lib/auth-role": {},
      "./dev-quick-login-controls.module.css": cssModule,
    });
    for (const route of ["/admin", "/moderator/contracts", "/dashboard", "/technician/tasks", "/home", "/login"]) {
      pathname = route;
      stateIndex = 0;
      const html = renderToStaticMarkup(DevQuickLoginControls({ floating: true }));
      const dashboard = !["/home", "/login"].includes(route);
      assert.equal(html.includes("dashboard-tailadmin-portal"), dashboard);
      assert.equal(html.includes("<details"), dashboard);
      assert.equal(html.includes("<summary>DEV"), dashboard);
      assert.equal((html.match(/<nav /g) ?? []).length, 1);
    }
    pathname = "/admin";
    hasHeader = false;
    stateIndex = 0;
    assert.equal(DevQuickLoginControls({ floating: true }), null);
    process.env.NODE_ENV = "production";
    assert.equal(DevQuickLoginControls({ floating: true }), null);
    const css = readFileSync(join(root, "src/components/dev-quick-login-controls.module.css"), "utf8");
    assert.match(css, /body:has\(\[role="dialog"\], \[role="alertdialog"\], dialog\[open\]\)\) \.dashboardMenu \{ visibility: hidden; \}/);
  } finally {
    if (environment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = environment;
  }
});

test("toast severity icons preserve timeout, pause and dismissal handlers", () => {
  const source = readFileSync(join(root, "src/components/notifications/notification-runtime.tsx"), "utf8");
  const toastSource = source.slice(source.indexOf("function NotificationToast("), source.indexOf("export function NotificationRuntime("));
  const { outputText } = ts.transpileModule("export " + toastSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
  const loaded = { exports: {} };
  const icons = ["success", "danger", "warning", "info"].map(name => createIcon(name));
  const pauses = [];
  new Function("require", "exports", "useState", "useRef", "useEffect", "getNotificationPresentation", "formatNotificationDate", "styles", "CheckCircle2", "XCircle", "AlertTriangle", "Info", "X", outputText)(require, loaded.exports, () => [false, value => pauses.push(value)], value => ({ current: value }), () => {}, () => ({ title: "Toast", typeLabel: "Info" }), () => "now", cssModule, ...icons, createIcon("close"));
  for (const [type, level] of [["SUCCESS", "success"], ["CRITICAL", "danger"], ["CONTRACT_EXPIRING", "warning"], ["INFO", "info"]]) {
    let dismissed = false;
    const tree = loaded.exports.NotificationToast({ notification: { type }, dismiss: () => { dismissed = true; } });
    assert.match(renderToStaticMarkup(tree), new RegExp('data-level="' + level + '"'));
    tree.props.onMouseEnter();
    tree.props.onMouseLeave();
    tree.props.onFocusCapture();
    tree.props.onBlurCapture({ currentTarget: { contains: () => true }, relatedTarget: {} });
    tree.props.onBlurCapture({ currentTarget: { contains: () => false }, relatedTarget: null });
    assert.deepEqual(pauses.splice(0), [true, false, true, false]);
    tree.props.children[2].props.onClick();
    assert.equal(dismissed, true);
  }
  assert.match(source, /remaining = useRef\(3000\)/);
  assert.match(source, /setTimeout\(dismiss, remaining.current\)/);
  assert.match(source, /aria-live="polite"/);
});

test("shared dialogs retain Escape control, focus fallback, pending state and reason validation", () => {
  let closed = 0, focused = 0;
  const dialog = loadTypeScriptModule("src/components/notification-dialog/notification-dialog.tsx", {
    react: { useEffect: () => {}, useId: () => "dialog-id", useRef: value => ({ current: value === null ? { querySelectorAll: () => [], focus: () => focused++ } : value }) },
    "@/components/button/button-bar": { ButtonBar: ({ children, ...props }) => React.createElement("button", props, children) },
    "./notification-dialog.module.css": cssModule,
  });
  const props = { variant: "confirm", title: "Confirm", description: "Description", onClose: () => closed++, primaryAction: { label: "Save", pending: true, onClick: () => {} }, secondaryAction: { label: "Cancel", disabled: true, onClick: () => {} } };
  const tree = dialog.NotificationDialog(props);
  assert.match(tree.props.className, /dashboard-tailadmin-portal/);
  const section = tree.props.children;
  assert.equal(section.props.role, "alertdialog");
  section.props.onKeyDown({ key: "Escape", preventDefault() {} });
  assert.equal(closed, 1);
  section.props.onKeyDown({ key: "Tab", preventDefault() {} });
  assert.equal(focused, 1);
  dialog.NotificationDialog({ ...props, closeOnEscape: false }).props.children.props.onKeyDown({ key: "Escape", preventDefault() {} });
  assert.equal(closed, 1);
  assert.match(renderToStaticMarkup(tree), /disabled="" aria-busy="true"/);
  for (const reason of ["   ", "  Valid reason  "]) {
    let confirmed;
    const { ReasonDialog } = loadTypeScriptModule("src/components/reason-dialog/reason-dialog.tsx", {
      react: { useState: () => [reason, () => {}] },
      "@/components/notification-dialog/notification-dialog": { NotificationDialog: () => null },
      "./reason-dialog.module.css": cssModule,
    });
    const result = ReasonDialog({ title: "Reason", description: "Required", onClose() {}, onConfirm: value => { confirmed = value; } });
    result.props.primaryAction.onClick();
    assert.equal(confirmed, reason.trim() || undefined);
    assert.equal(result.props.primaryAction.disabled, !reason.trim());
  }
});

test("dev login waits for an authorized dashboard header and disconnects its observer", () => {
  const environment = process.env.NODE_ENV;
  const previousDocument = globalThis.document;
  const previousObserver = globalThis.MutationObserver;
  const previousWindow = globalThis.window;
  let effect, observe, cleanup, header = null, mounted, disconnected = 0;
  try {
    process.env.NODE_ENV = "development";
    globalThis.window = { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
    globalThis.document = { body: {}, querySelector: () => header };
    globalThis.MutationObserver = class { constructor(callback) { observe = callback; } observe(target, options) { assert.equal(target, document.body); assert.equal(options.subtree, true); } disconnect() { disconnected++; } };
    const { DevQuickLoginControls } = loadTypeScriptModule("src/components/dev-quick-login-controls.tsx", {
      react: { useState: value => [value, target => { mounted = target; }], useEffect: callback => { effect = callback; } },
      "next/router": { useRouter: () => ({ pathname: "/admin", asPath: "/admin" }) },
      "@/schema/auth.schema": {}, "@/lib/auth-role": {}, "./dev-quick-login-controls.module.css": cssModule,
    });
    DevQuickLoginControls({ floating: true });
    cleanup = effect();
    assert.equal(mounted, null);
    header = {};
    observe();
    assert.equal(mounted, header);
    assert.equal(disconnected, 1);
    cleanup();
    assert.equal(disconnected, 2);
  } finally {
    if (environment === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = environment;
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousObserver === undefined) delete globalThis.MutationObserver; else globalThis.MutationObserver = previousObserver;
  }
});
