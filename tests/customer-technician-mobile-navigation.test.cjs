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

const paths = loadModule("src/routes/path.ts");
const customerMessages = loadModule("src/text/customer/customer-messages.ts").CUSTOMER_MESSAGES;
const technicianMessages = loadModule("src/text/technician/technician-messages.ts").TECHNICIAN_MESSAGES;
const schemas = {
  "@/schema/contracts.schema": loadModule("src/schema/contracts.schema.ts"),
  "@/schema/billing.schema": loadModule("src/schema/billing.schema.ts"),
  "@/schema/machines.schema": loadModule("src/schema/machines.schema.ts"),
  "@/schema/recipes.schema": loadModule("src/schema/recipes.schema.ts"),
  "@/schema/installation-work-orders.schema": loadModule("src/schema/installation-work-orders.schema.ts"),
};
const routeCatalog = loadModule("src/routes/routes.ts", {
  "./path": paths,
  ...schemas,
  "@/text/home/home-messages": loadModule("src/text/home/home-messages.ts"),
  "@/text/admin/admin-messages": loadModule("src/text/admin/admin-messages.ts"),
  "@/text/moderator/moderator-messages": {
    MODERATOR_MESSAGES: loadModule("src/text/moderator/moderator-messages.ts").MODERATOR_MESSAGES,
  },
  "@/text/customer/customer-messages": { CUSTOMER_MESSAGES: customerMessages },
  "@/text/technician/technician-messages": { TECHNICIAN_MESSAGES: technicianMessages },
});
const navigationRoute = loadModule("src/components/sidebar/navigation-route.ts");
const cssModule = new Proxy({}, { get: (_target, key) => String(key) });
const Link = ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children);
const roles = {
  customer: {
    relativePath: "src/pages/dashboard/customer-shell.tsx",
    exportName: "CustomerShell",
    rootHref: paths.PATH_CUSTOMER.ROOT,
    routeLinks: routeCatalog.CUSTOMER_NAVIGATION_LINKS,
    messages: customerMessages,
    messageKey: "CUSTOMER_MESSAGES",
    labelKey: "customer",
    userRoute: "/dashboard/contracts/11111111-1111-4111-8111-111111111111?tab=machines",
    activeHref: paths.PATH_CUSTOMER.CONTRACTS,
    iconModule: "lucide-react",
    authorize: "@/lib/auth-role",
  },
  technician: {
    relativePath: "src/pages/technician/technician-shell.tsx",
    exportName: "TechnicianShell",
    rootHref: paths.PATH_TECHNICIAN.ROOT,
    routeLinks: routeCatalog.TECHNICIAN_NAVIGATION_LINKS,
    messages: technicianMessages,
    messageKey: "TECHNICIAN_MESSAGES",
    labelKey: "technician",
    userRoute: "/technician/tasks/00000000-0000-4000-8000-000000000101?tab=history",
    activeHref: paths.PATH_TECHNICIAN.TASKS,
    iconModule: "lucide-react",
    authorize: "@/lib/auth-role",
  },
};

function createShellHarness(roleKey) {
  const role = roles[roleKey];
  const navigationCalls = [];
  const logoutCalls = [];
  const routerCalls = [];
  const cookieRemovals = [];
  let stateValues = [];
  let stateIndex = 0;
  let effects = [];
  const hookReact = {
    ...React,
    useState(initialValue) {
      const index = stateIndex++;
      if (stateValues[index] === undefined) stateValues[index] = initialValue;
      return [stateValues[index], (nextValue) => { stateValues[index] = nextValue; }];
    },
    useEffect(effect) { effects.push(effect); },
    useRef(initialValue) { return { current: initialValue }; },
  };
  const sidebar = loadModule("src/components/sidebar/sidebar.tsx", {
    "lucide-react": { LogOut: () => null },
    "next/link": Link,
    "./navigation-route": navigationRoute,
    "./sidebar.module.css": cssModule,
  });
  const sharedMobileNavigation = {
    MobileNavigation: (props) => {
      navigationCalls.push(props);
      const activeItem = navigationRoute.getActiveNavigationItem(props.items, props.pathname, props.rootHref);
      return React.createElement(
        "div",
        { "data-shared-mobile-navigation": roleKey },
        React.createElement("button", {
          type: "button",
          "aria-label": props.triggerLabel,
          "aria-expanded": "false",
        }, "Menu"),
        React.createElement("nav", { "aria-label": props.navigationLabel }, props.items.map((item) => React.createElement(
          "a",
          {
            key: item.href,
            href: item.href,
            "aria-current": item === activeItem ? "page" : undefined,
          },
          item.label,
        ))),
      );
    },
  };
  const shellModule = loadModule(role.relativePath, {
    react: hookReact,
    "js-cookie": {
      __esModule: true,
      default: {
        get: () => `${roleKey}-token`,
        remove: (...args) => cookieRemovals.push(args),
      },
    },
    [role.iconModule]: new Proxy({}, { get: () => () => null }),
    "next/head": () => null,
    "next/link": Link,
    "next/router": {
      useRouter: () => ({
        asPath: role.userRoute,
        replace: (href) => { routerCalls.push(href); return Promise.resolve(true); },
      }),
    },
    "@/apis/auth.api": { authApi: { logout: async () => { logoutCalls.push(roleKey); } } },
    "@/components/sidebar/sidebar": sidebar,
    "@/components/sidebar/mobile-navigation": sharedMobileNavigation,
    "@/components/sidebar/navigation-route": navigationRoute,
    "@/lib/auth-role": roleKey === "customer"
      ? { canAccessCustomerArea: () => true }
      : { canAccessTechnicianArea: () => true },
    "@/routes/path": paths,
    "@/routes/routes": routeCatalog,
    "@/text/customer/customer-messages": { CUSTOMER_MESSAGES: customerMessages },
    "@/text/technician/technician-messages": { TECHNICIAN_MESSAGES: technicianMessages },
    [roleKey === "customer" ? "./customer-shell.module.css" : "./technician-shell.module.css"]: cssModule,
  });
  const Shell = shellModule[role.exportName];
  const render = () => {
    stateIndex = 0;
    effects = [];
    const html = renderToStaticMarkup(React.createElement(Shell, {
      pageTitle: "Role page title",
      children: React.createElement("p", null, "Page content"),
    }));
    const renderedEffects = effects;
    effects = [];
    return { html, renderedEffects };
  };
  const firstRender = render();
  for (const effect of firstRender.renderedEffects) effect();
  const { html } = render();
  return { html, navigationCalls, logoutCalls, routerCalls, cookieRemovals, role };
}

test("Customer and Technician shells pass their complete role menus and logout callbacks to the shared drawer", () => {
  for (const roleKey of ["customer", "technician"]) {
    const shell = createShellHarness(roleKey);
    const props = shell.navigationCalls.at(-1);
    const expected = shell.role.routeLinks.map(({ LABEL, HREF }) => ({ label: LABEL, href: HREF }));

    assert.match(shell.html, new RegExp(`data-shared-mobile-navigation="${roleKey}"`));
    assert.deepEqual(props.items.map(({ label, href }) => ({ label, href })), expected, roleKey);
    assert.equal(props.pathname, shell.role.userRoute.split("?")[0], roleKey);
    assert.equal(props.rootHref, shell.role.rootHref, roleKey);
    assert.ok(props.navigationLabel.length > 0, `${roleKey} drawer needs a navigation label`);
    assert.ok(props.drawerLabel.length > 0, `${roleKey} drawer needs an accessible name`);
    assert.ok(props.triggerLabel.length > 0, `${roleKey} hamburger needs an accessible name`);
    assert.ok(props.closeLabel.length > 0, `${roleKey} close control needs an accessible name`);
    assert.equal(props.logout.label, shell.role.messages.NAVIGATION.LOGOUT, roleKey);
    assert.equal(props.logout.pendingLabel, shell.role.messages.NAVIGATION.LOGGING_OUT, roleKey);
    assert.equal(props.logout.pending, false, roleKey);
    assert.equal(typeof props.logout.onLogout, "function", roleKey);
    assert.match(shell.html, /<aside>/, `${roleKey} must retain the desktop Sidebar`);
  }
});

test("Customer and Technician logout callbacks call auth logout, clear the token, and return to login", async () => {
  for (const roleKey of ["customer", "technician"]) {
    const shell = createShellHarness(roleKey);
    const props = shell.navigationCalls.at(-1);

    await props.logout.onLogout();

    assert.deepEqual(shell.logoutCalls, [roleKey], `${roleKey} auth logout`);
    assert.deepEqual(shell.cookieRemovals, [["access_token", { path: "/" }]], `${roleKey} clears its token`);
    assert.deepEqual(shell.routerCalls, ["/login"], `${roleKey} returns to login`);
  }
});

test("Customer and Technician preserve mobile notifications, nested route breadcrumbs, and active parents", () => {
  for (const roleKey of ["customer", "technician"]) {
    const shell = createShellHarness(roleKey);
    const { html, role } = shell;
    const shellSource = readFileSync(join(root, role.relativePath), "utf8");
    const headerStart = shellSource.indexOf("className={styles.mobileHeader}");
    const headerEnd = shellSource.indexOf("</header>", headerStart);
    const headerSource = shellSource.slice(headerStart, headerEnd);

    assert.notEqual(headerStart, -1, roleKey);
    assert.notEqual(headerEnd, -1, roleKey);
    assert.match(headerSource, /notificationsLink\.HREF/, roleKey);
    assert.match(headerSource, /<MobileNavigation/, roleKey);
    assert.match(html, new RegExp(`href="${role.routeLinks.find((item) => item.HREF.includes("notifications")).HREF}"`), roleKey);
    assert.match(html, new RegExp(`href="${role.activeHref}"[^>]*aria-current="page"`), roleKey);
    assert.match(html, /aria-current="page"/, `${roleKey} breadcrumb/nav should expose the current parent`);
  }
});

test("Customer and Technician remove horizontal mobile navigation strips and their shell logout buttons", () => {
  for (const roleKey of ["customer", "technician"]) {
    const role = roles[roleKey];
    const shellSource = readFileSync(join(root, role.relativePath), "utf8");
    const stylePath = roleKey === "customer"
      ? "src/pages/dashboard/customer-shell.module.css"
      : "src/pages/technician/technician-shell.module.css";
    const styleSource = readFileSync(join(root, stylePath), "utf8");

    assert.doesNotMatch(shellSource, /SidebarLogoutButton|SidebarNavigation/ , roleKey);
    assert.doesNotMatch(shellSource, /styles\.mobileNav|mobileNavLinks/, roleKey);
    assert.doesNotMatch(styleSource, /\.mobileNav\b|\.mobileNavLinks\b/, roleKey);
    assert.match(shellSource, /<Sidebar[\s\S]*?items=\{[A-Z]+_SIDEBAR_ITEMS\}[\s\S]*?logout=\{/);
  }
});

function getMediaBlock(css, maxWidth) {
  const marker = `@media (max-width: ${maxWidth}px)`;
  const start = css.indexOf(marker);
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

function getPageContentBottomPadding(mediaBlock) {
  const matches = [...mediaBlock.matchAll(/\.pageContent\s*\{([^}]*)\}/g)];
  return matches.map(([, declarations]) => {
    const shorthand = declarations.match(/(?:^|\n)\s*padding:\s*([^;]+);/);
    if (shorthand) {
      const values = shorthand[1].trim().split(/\s+/);
      return Number.parseFloat(values[values.length === 2 ? 1 : 2]);
    }
    const longhand = declarations.match(/(?:^|\n)\s*padding-bottom:\s*([^;]+);/);
    return longhand ? Number.parseFloat(longhand[1]) : undefined;
  }).filter(Number.isFinite);
}

test("Customer and Technician ActionBars sit at mobile bottom while page content retains only dock clearance", () => {
  const sharedActionBarCss = readFileSync(join(root, "src/components/action-bar/action-bar.module.css"), "utf8");
  assert.match(sharedActionBarCss, /bottom:\s*64px/);

  for (const roleKey of ["customer", "technician"]) {
    const stylePath = roleKey === "customer"
      ? "src/pages/dashboard/customer-shell.module.css"
      : "src/pages/technician/technician-shell.module.css";
    const css = readFileSync(join(root, stylePath), "utf8");
    const mobile = getMediaBlock(css, 1023);
    const actionBarRules = [...mobile.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    const dockOverride = actionBarRules.find(([, selector, declarations]) =>
      selector.includes(":global(footer") && (selector.includes(".workspace") || selector.includes(".shell")) &&
      /bottom:\s*0(?:px)?/.test(declarations),
    );
    const desktopPaddings = getPageContentBottomPadding(css.slice(0, css.indexOf("@media")));
    const mobilePaddings = getPageContentBottomPadding(mobile);
    const smallScreenPaddings = getPageContentBottomPadding(getMediaBlock(css, 600));

    assert.ok(dockOverride, `${roleKey} must scope its ActionBar dock to bottom: 0 on mobile`);
    assert.ok(desktopPaddings.length > 0, `${roleKey} needs a desktop page-content padding baseline`);
    assert.ok(mobilePaddings.length > 0, `${roleKey} needs a mobile page-content padding override`);
    assert.ok(mobilePaddings.every((value) => value >= 64 && value < Math.max(...desktopPaddings)), `${roleKey} mobile bottom padding must be reduced but still clear the 64px ActionBar`);
    assert.ok(smallScreenPaddings.every((value) => value >= 64 && value < Math.max(...desktopPaddings)), `${roleKey} small-screen bottom padding must be reduced but still clear the ActionBar`);
  }
});

test("Customer and Technician keep their old mobile-only labels out of the shared navigation shell", () => {
  for (const roleKey of ["customer", "technician"]) {
    const shellSource = readFileSync(join(root, roles[roleKey].relativePath), "utf8");
    assert.doesNotMatch(shellSource, /NAVIGATION\.MORE|MOBILE_NAVIGATION|MOBILE_LABEL/, roleKey);
  }
});
