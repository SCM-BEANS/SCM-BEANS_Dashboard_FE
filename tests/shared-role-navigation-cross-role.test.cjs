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

const paths = loadTypeScriptModule("src/routes/path.ts");
const messages = {
  home: loadTypeScriptModule("src/text/home/home-messages.ts"),
  admin: loadTypeScriptModule("src/text/admin/admin-messages.ts"),
  moderator: loadTypeScriptModule("src/text/moderator/moderator-messages.ts"),
  customer: loadTypeScriptModule("src/text/customer/customer-messages.ts"),
  technician: loadTypeScriptModule("src/text/technician/technician-messages.ts"),
};
const routeCatalog = loadTypeScriptModule("src/routes/routes.ts", {
  "./path": paths,
  "@/schema/contracts.schema": loadTypeScriptModule("src/schema/contracts.schema.ts"),
  "@/schema/billing.schema": loadTypeScriptModule("src/schema/billing.schema.ts"),
  "@/schema/machines.schema": loadTypeScriptModule("src/schema/machines.schema.ts"),
  "@/schema/recipes.schema": loadTypeScriptModule("src/schema/recipes.schema.ts"),
  "@/schema/installation-work-orders.schema": loadTypeScriptModule("src/schema/installation-work-orders.schema.ts"),
  "@/text/home/home-messages": { HOME_MESSAGES: messages.home.HOME_MESSAGES },
  "@/text/admin/admin-messages": { ADMIN_MESSAGES: messages.admin.ADMIN_MESSAGES },
  "@/text/moderator/moderator-messages": { MODERATOR_MESSAGES: messages.moderator.MODERATOR_MESSAGES },
  "@/text/customer/customer-messages": { CUSTOMER_MESSAGES: messages.customer.CUSTOMER_MESSAGES },
  "@/text/technician/technician-messages": { TECHNICIAN_MESSAGES: messages.technician.TECHNICIAN_MESSAGES },
});
const navigationRoute = loadTypeScriptModule("src/components/sidebar/navigation-route.ts");

const roleMatrix = [
  {
    name: "Admin",
    rootHref: paths.PATH_ADMIN.ROOT,
    links: routeCatalog.ADMIN_NAVIGATION_LINKS,
    expectedLabels: [
      "Tổng quan",
      "Khách hàng",
      "Cửa hàng",
      "Hợp đồng",
      "Máy & tồn kho",
      "Giám sát Smart IoT",
      "Menu & công thức",
      "Báo cáo vận hành",
      "Thông báo",
    ],
    expectedHrefs: [
      paths.PATH_ADMIN.ROOT,
      paths.PATH_ADMIN.BUSINESSES,
      paths.PATH_ADMIN.STORES,
      paths.PATH_ADMIN.CONTRACTS,
      paths.PATH_ADMIN.MACHINES,
      paths.PATH_ADMIN.IOT,
      paths.PATH_ADMIN.MENU,
      paths.PATH_ADMIN.REPORTS,
      paths.PATH_ADMIN.NOTIFICATIONS,
    ],
    dynamicPath: paths.PATH_ADMIN.MACHINE_DETAIL("00000000-0000-4000-8000-000000000101"),
    dynamicParentHref: paths.PATH_ADMIN.MACHINES,
    enabled: routeCatalog.ADMIN_ENABLED_PATHS,
    shellPath: "src/pages/admin/admin-shell.tsx",
    menuPath: "src/pages/admin/menu/admin-menu.tsx",
    stylePath: "src/pages/admin/admin-shell.module.css",
  },
  {
    name: "Moderator",
    rootHref: paths.PATH_MODERATOR.ROOT,
    links: routeCatalog.MODERATOR_NAVIGATION_LINKS,
    expectedLabels: [
      "Tổng quan",
      "Hợp đồng",
      "Tài khoản khách",
      "Hóa đơn",
      "Máy & tồn kho",
      "Giám sát Smart IoT",
      "Menu & công thức",
      "Yêu cầu kỹ thuật",
      "Lịch sử máy",
      "Thu mua máy cũ",
      "Thông báo",
    ],
    expectedHrefs: [
      paths.PATH_MODERATOR.ROOT,
      paths.PATH_MODERATOR.CONTRACTS,
      paths.PATH_MODERATOR.CUSTOMERS,
      paths.PATH_MODERATOR.INVOICES,
      paths.PATH_MODERATOR.MACHINES,
      paths.PATH_MODERATOR.IOT,
      paths.PATH_MODERATOR.MENU,
      paths.PATH_MODERATOR.TECHNICAL_REQUESTS,
      paths.PATH_MODERATOR.MACHINE_HISTORY,
      paths.PATH_MODERATOR.BUYBACK,
      paths.PATH_MODERATOR.NOTIFICATIONS,
    ],
    dynamicPath: paths.PATH_MODERATOR.CONTRACT_DETAIL("00000000-0000-4000-8000-000000000101"),
    dynamicParentHref: paths.PATH_MODERATOR.CONTRACTS,
    shellPath: "src/pages/moderator/moderator-shell.tsx",
    menuPath: "src/pages/moderator/moderator-shell.tsx",
    stylePath: "src/pages/moderator/moderator-shell.module.css",
  },
  {
    name: "Customer",
    rootHref: paths.PATH_CUSTOMER.ROOT,
    links: routeCatalog.CUSTOMER_NAVIGATION_LINKS,
    expectedLabels: [
      "Tổng quan",
      "Hợp đồng",
      "Máy của tôi",
      "Menu của tôi",
      "Hóa đơn",
      "Yêu cầu hỗ trợ",
      "Thu mua máy cũ",
      "Thông báo",
    ],
    expectedHrefs: [
      paths.PATH_CUSTOMER.ROOT,
      paths.PATH_CUSTOMER.CONTRACTS,
      paths.PATH_CUSTOMER.MACHINES,
      paths.PATH_CUSTOMER.MENU,
      paths.PATH_CUSTOMER.INVOICES,
      paths.PATH_CUSTOMER.SUPPORT,
      paths.PATH_CUSTOMER.BUYBACK,
      paths.PATH_CUSTOMER.NOTIFICATIONS,
    ],
    dynamicPath: paths.PATH_CUSTOMER.CONTRACT_DETAIL("00000000-0000-4000-8000-000000000101"),
    dynamicParentHref: paths.PATH_CUSTOMER.CONTRACTS,
    shellPath: "src/pages/dashboard/customer-shell.tsx",
    menuPath: "src/pages/dashboard/customer-shell.tsx",
    stylePath: "src/pages/dashboard/customer-shell.module.css",
  },
  {
    name: "Technician",
    rootHref: paths.PATH_TECHNICIAN.ROOT,
    links: routeCatalog.TECHNICIAN_NAVIGATION_LINKS,
    expectedLabels: [
      "Việc được giao",
      "Lịch sử máy",
      "Thông báo",
    ],
    expectedHrefs: [
      paths.PATH_TECHNICIAN.TASKS,
      paths.PATH_TECHNICIAN.HISTORY,
      paths.PATH_TECHNICIAN.NOTIFICATIONS,
    ],
    dynamicPath: paths.PATH_TECHNICIAN.TASK_DETAIL("00000000-0000-4000-8000-000000000101"),
    dynamicParentHref: paths.PATH_TECHNICIAN.TASKS,
    shellPath: "src/pages/technician/technician-shell.tsx",
    menuPath: "src/pages/technician/technician-shell.tsx",
    stylePath: "src/pages/technician/technician-shell.module.css",
  },
];

function sidebarItems(role) {
  return role.links.map((link) => ({
    label: link.LABEL,
    href: link.HREF,
    icon: () => null,
    ...(role.enabled ? { enabled: role.enabled.has(link.HREF) } : {}),
  }));
}

function getMediaBlock(css, query) {
  const start = css.indexOf(`@media (${query})`);
  if (start < 0) return "";
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") depth -= 1;
    if (depth === 0) return css.slice(open + 1, index);
  }
  return "";
}

test("the four role menus keep their own complete route matrices", () => {
  const allRoleHrefs = new Set();
  for (const role of roleMatrix) {
    const hrefs = role.links.map(({ HREF }) => HREF);
    assert.deepEqual(hrefs, role.expectedHrefs, role.name);
    assert.deepEqual(role.links.map(({ LABEL }) => LABEL), role.expectedLabels, `${role.name} labels`);
    assert.equal(new Set(hrefs).size, hrefs.length, `${role.name} routes must be unique`);

    for (const href of hrefs) {
      assert.ok(href === role.rootHref || href.startsWith(`${role.rootHref}/`), `${role.name}: ${href}`);
      assert.ok(!allRoleHrefs.has(href), `route ${href} must belong to only one role`);
      allRoleHrefs.add(href);
    }
  }
});

test("each exact destination and dynamic detail route has one active role parent", () => {
  for (const role of roleMatrix) {
    const items = sidebarItems(role);
    const enabledItems = items.filter((item) => item.enabled !== false);

    for (const item of enabledItems) {
      const currentPath = `${item.href}/?view=all#section`;
      const active = navigationRoute.getActiveNavigationItem(items, currentPath, role.rootHref);
      assert.equal(active, item, `${role.name} exact route ${item.href}`);
      assert.equal(items.filter((candidate) => candidate === active).length, 1, `${role.name} only one exact active item`);
    }

    const dynamicActive = navigationRoute.getActiveNavigationItem(items, role.dynamicPath, role.rootHref);
    assert.equal(dynamicActive?.href, role.dynamicParentHref, `${role.name} dynamic detail parent`);
    assert.equal(items.filter((candidate) => candidate === dynamicActive).length, 1, `${role.name} only one dynamic active item`);
    assert.equal(
      navigationRoute.getActiveNavigationItem(items, `${role.rootHref}-archive/contracts`, role.rootHref),
      undefined,
      `${role.name} root must not prefix-match unrelated routes`,
    );
  }
});

test("all four role shells mount shared mobile navigation in the mobile header and keep the desktop sidebar", () => {
  for (const role of roleMatrix) {
    const shellSource = readFileSync(join(root, role.shellPath), "utf8");
    const menuSource = role.menuPath === role.shellPath
      ? shellSource
      : readFileSync(join(root, role.menuPath), "utf8");
    const styleSource = readFileSync(join(root, role.stylePath), "utf8");
    const headerStart = shellSource.indexOf("className={styles.mobileHeader}");
    const headerEnd = shellSource.indexOf("</header>", headerStart);
    const mobileHeader = shellSource.slice(headerStart, headerEnd);

    assert.match(shellSource, /import\s*\{\s*MobileNavigation\s*\}\s*from\s*["']@\/components\/sidebar\/mobile-navigation["']/, role.name);
    assert.ok(headerStart >= 0 && headerEnd > headerStart, `${role.name} mobile header`);
    assert.match(mobileHeader, /<MobileNavigation/, `${role.name} shared mobile navigation belongs in its header`);

    if (role.name === "Admin") {
      assert.match(shellSource, /<AdminSidebarMenu/, "Admin shell must keep its desktop menu component");
      assert.match(menuSource, /import\s*\{\s*Sidebar[^}]*\}\s*from\s*["']@\/components\/sidebar\/sidebar["']/);
      assert.match(menuSource, /<Sidebar[\s\S]*?items=\{ADMIN_SIDEBAR_ITEMS\}/);
      assert.match(mobileHeader, /items=\{ADMIN_SIDEBAR_ITEMS\}/);
    } else {
      assert.match(shellSource, /import\s*\{\s*Sidebar[^}]*\}\s*from\s*["']@\/components\/sidebar\/sidebar["']/ , role.name);
      assert.match(shellSource, /<Sidebar[\s\S]*?items=\{[A-Z]+_SIDEBAR_ITEMS\}/, role.name);
      assert.match(mobileHeader, /items=\{[A-Z]+_SIDEBAR_ITEMS\}/, role.name);
    }

    assert.doesNotMatch(shellSource, /SidebarNavigation|SidebarLogoutButton|MODERATOR_MOBILE_NAVIGATION_LINKS|mobileMenuOpen|menuDialogRef|styles\.mobileNav|mobileNavLinks|NAVIGATION\.MORE/, role.name);
    assert.doesNotMatch(styleSource, /\.mobileNav\b|\.mobileNavLinks\b|\.menuBackdrop\b|\.mobileMenu\b/, `${role.name} obsolete mobile strip styles`);
  }
});

test("all four role shells switch to the mobile header through 1023px with usable header actions", () => {
  for (const role of roleMatrix) {
    const css = readFileSync(join(root, role.stylePath), "utf8");
    const mobile = getMediaBlock(css, "max-width: 1023px");

    assert.ok(mobile, `${role.name} needs the shared 1023px mobile breakpoint`);
    assert.match(css, /\.desktopHeader\s*\{[^}]*display:\s*flex/);
    assert.match(css, /\.mobileHeader(?:\s*,\s*\.mobileBreadcrumb)?\s*\{[^}]*display:\s*none/);
    assert.match(mobile, /\.desktopHeader\s*\{[^}]*display:\s*none/);
    assert.match(mobile, /\.mobileHeader\s*\{[^}]*display:\s*flex/);
    assert.match(mobile, /\.mobileHeader\s*\{[^}]*min-height:\s*64px/);

    if (role.name === "Admin") {
      assert.match(mobile, /\.mobileHeaderStatus\s*\{[^}]*min-width:\s*0/);
      assert.match(mobile, /\.mobileHeaderStatus\s*\{[^}]*text-overflow:\s*ellipsis/);
      continue;
    }

    const notificationAction = mobile.match(/\.mobileHeaderLink\s*\{([^}]*)\}/)?.[1] ?? "";
    const minimumHeight = notificationAction.match(/min-height:\s*(\d+)px/)?.[1];
    assert.ok(Number(minimumHeight) >= 44, `${role.name} notification link must provide a 44px target`);
    assert.match(notificationAction, /display:\s*inline-flex/);
    assert.match(notificationAction, /align-items:\s*center/);
  }
});

test("Admin keeps its enabled-route mapping and shared sidebar renders unavailable items as inert", () => {
  const adminRole = roleMatrix[0];
  const adminItems = sidebarItems(adminRole);
  const adminMenuSource = readFileSync(join(root, adminRole.menuPath), "utf8");
  assert.match(adminMenuSource, /enabled:\s*ADMIN_ENABLED_PATHS\.has\(item\.HREF\)/);
  for (const item of adminItems) {
    assert.equal(item.enabled, routeCatalog.ADMIN_ENABLED_PATHS.has(item.href), item.href);
  }

  const routeModule = navigationRoute;
  const SidebarNavigation = loadTypeScriptModule("src/components/sidebar/sidebar.tsx", {
    "next/link": ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children),
    "lucide-react": { LogOut: () => null },
    "./sidebar.module.css": new Proxy({}, { get: (_target, key) => String(key) }),
    "./navigation-route": routeModule,
  }).SidebarNavigation;
  const unavailable = {
    label: "Future admin page",
    href: `${adminRole.rootHref}/future-page`,
    icon: () => null,
    enabled: false,
    title: "Coming soon",
  };
  const markup = renderToStaticMarkup(React.createElement(SidebarNavigation, {
    items: [...adminItems, unavailable],
    pathname: unavailable.href,
    rootHref: adminRole.rootHref,
    navigationLabel: "Admin navigation",
  }));

  assert.match(markup, /<span[^>]*aria-disabled="true"[^>]*title="Coming soon"/);
  assert.doesNotMatch(markup, /<a[^>]*href="\/admin\/future-page"/);
  assert.equal(routeModule.getActiveNavigationItem([...adminItems, unavailable], unavailable.href, adminRole.rootHref), undefined);
});

test("Admin logout callback calls auth logout, clears the token, and returns to login", async () => {
  const logoutCalls = [];
  const cookieRemovals = [];
  const routerCalls = [];
  const navigationCalls = [];
  const stateValues = [];
  let stateIndex = 0;
  let effects = [];
  const hooks = new Proxy(React, {
    get(target, key) {
      if (key === "useState") return (initialValue) => {
        const index = stateIndex++;
        if (stateValues[index] === undefined) stateValues[index] = initialValue;
        return [stateValues[index], (value) => { stateValues[index] = value; }];
      };
      if (key === "useEffect") return (effect) => { effects.push(effect); };
      return Reflect.get(target, key, target);
    },
  });
  const { AdminShell } = loadTypeScriptModule("src/pages/admin/admin-shell.tsx", {
    react: hooks,
    "js-cookie": {
      __esModule: true,
      default: {
        get: () => "admin-token",
        remove: (...args) => cookieRemovals.push(args),
      },
    },
    "next/head": () => null,
    "next/link": ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children),
    "next/router": {
      useRouter: () => ({
        asPath: paths.PATH_ADMIN.ROOT,
        pathname: paths.PATH_ADMIN.ROOT,
        replace: (href) => { routerCalls.push(href); return Promise.resolve(true); },
      }),
    },
    "@/apis/auth.api": { authApi: { logout: async () => { logoutCalls.push("admin"); } } },
    "@/components/action-bar/action-bar": { ActionBar: ({ children }) => React.createElement("footer", null, children) },
    "@/components/heading/admin-breadcrumb": { AdminBreadcrumb: () => null },
    "@/components/sidebar/mobile-navigation": {
      MobileNavigation: (props) => {
        navigationCalls.push(props);
        return React.createElement("div", { "data-mobile-navigation": "admin" });
      },
    },
    "@/lib/auth-role": { hasAdminRole: () => true },
    "@/routes/path": paths,
    "@/text/admin/admin-messages": { ADMIN_MESSAGES: messages.admin.ADMIN_MESSAGES },
    "@/pages/admin/menu/admin-menu": {
      ADMIN_SIDEBAR_ITEMS: routeCatalog.ADMIN_NAVIGATION_LINKS.map(({ LABEL, HREF }) => ({ label: LABEL, href: HREF, icon: () => null })),
      AdminSidebarMenu: () => null,
      getCurrentAdminSection: () => ({ HREF: paths.PATH_ADMIN.ROOT, LABEL: "Tổng quan" }),
    },
    "./admin-shell.module.css": new Proxy({}, { get: (_target, key) => String(key) }),
  });
  const render = () => {
    stateIndex = 0;
    effects = [];
    renderToStaticMarkup(React.createElement(AdminShell, { children: React.createElement("p", null, "Admin screen") }));
    const pendingEffects = effects;
    effects = [];
    return pendingEffects;
  };

  const initialEffects = render();
  for (const effect of initialEffects) effect();
  render();
  const adminLogout = navigationCalls.at(-1)?.logout?.onLogout;
  assert.equal(typeof adminLogout, "function");

  await adminLogout();

  assert.deepEqual(logoutCalls, ["admin"]);
  assert.deepEqual(cookieRemovals, [["access_token", { path: "/" }]]);
  assert.deepEqual(routerCalls, [paths.PATH_AUTH.LOGIN]);
});
