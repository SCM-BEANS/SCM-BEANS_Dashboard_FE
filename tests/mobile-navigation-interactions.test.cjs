const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const React = require("react");

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

function icon(name) {
  return function Icon(props) {
    return React.createElement("svg", { ...props, "data-icon": name });
  };
}

function flattenNodes(node) {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap(flattenNodes);
  return [node, ...(node.children ?? []).flatMap(flattenNodes)];
}

function createElementHarness() {
  const documentMock = { activeElement: null };
  const focusHistory = [];
  const mediaListeners = new Set();
  const eventListeners = new Map();
  const mediaQuery = {
    matches: false,
    addEventListener(type, listener) {
      if (type === "change") mediaListeners.add(listener);
    },
    removeEventListener(type, listener) {
      if (type === "change") mediaListeners.delete(listener);
    },
  };
  const windowMock = {
    matchMedia(query) {
      assert.equal(query, "(min-width: 1024px)");
      return mediaQuery;
    },
    addEventListener(type, listener) {
      const listeners = eventListeners.get(type) ?? new Set();
      listeners.add(listener);
      eventListeners.set(type, listeners);
    },
    removeEventListener(type, listener) {
      eventListeners.get(type)?.delete(listener);
    },
  };
  const oldDocument = global.document;
  const oldWindow = global.window;
  global.document = documentMock;
  global.window = windowMock;

  const stateValues = [];
  const refValues = [];
  const effectValues = [];
  let stateCursor = 0;
  let refCursor = 0;
  let effectCursor = 0;
  let pendingEffects = [];
  const hookReact = {
    useState(initialValue) {
      const index = stateCursor++;
      if (!Object.hasOwn(stateValues, index)) stateValues[index] = initialValue;
      return [stateValues[index], (value) => {
        stateValues[index] = typeof value === "function" ? value(stateValues[index]) : value;
      }];
    },
    useId: () => ":mobile-nav-test:",
    useRef(initialValue) {
      const index = refCursor++;
      if (!Object.hasOwn(refValues, index)) refValues[index] = { current: initialValue };
      return refValues[index];
    },
    useEffect(effect, dependencies) {
      const index = effectCursor++;
      const previous = effectValues[index];
      const changed = dependencies === undefined || !previous ||
        dependencies.length !== previous.dependencies?.length ||
        dependencies.some((dependency, depIndex) => !Object.is(dependency, previous.dependencies[depIndex]));
      pendingEffects.push({ index, effect, dependencies, changed });
    },
  };
  const cssModule = new Proxy({}, { get: (_target, key) => `mobile-test-${String(key)}` });
  const link = ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children);
  const routeModule = loadTypeScriptModule("src/components/sidebar/navigation-route.ts");
  const sidebar = loadTypeScriptModule("src/components/sidebar/sidebar.tsx", {
    "lucide-react": { LogOut: icon("logout") },
    "next/link": link,
    "./sidebar.module.css": cssModule,
    "./navigation-route": routeModule,
  });
  const { MobileNavigation } = loadTypeScriptModule("src/components/sidebar/mobile-navigation.tsx", {
    react: hookReact,
    "lucide-react": { Menu: icon("menu"), X: icon("close") },
    "@/components/sidebar/sidebar": sidebar,
    "./mobile-navigation.module.css": cssModule,
  });

  function materialize(element) {
    if (element === null || element === undefined || typeof element === "boolean") return null;
    if (Array.isArray(element)) return element.map(materialize).filter(Boolean);
    if (!React.isValidElement(element)) return null;
    if (element.type === React.Fragment) return materialize(element.props.children);
    if (typeof element.type === "function") return materialize(element.type(element.props));
    if (typeof element.type !== "string") return null;

    const node = {
      type: element.type,
      props: element.props,
      children: [],
      focus() {
        documentMock.activeElement = node;
        focusHistory.push(node);
      },
      contains(target) {
        return flattenNodes(node).includes(target);
      },
      querySelectorAll() {
        return flattenNodes(node).slice(1).filter((candidate) => {
          const { href, disabled, tabIndex } = candidate.props;
          return (candidate.type === "a" && href !== undefined) ||
            (candidate.type === "button" && !disabled) ||
            (tabIndex !== undefined && tabIndex !== -1);
        });
      },
    };
    if (element.props.ref && typeof element.props.ref === "object") element.props.ref.current = node;
    const children = materialize(element.props.children);
    node.children = Array.isArray(children) ? children : children ? [children] : [];
    return node;
  }

  function render(props = {}) {
    stateCursor = 0;
    refCursor = 0;
    effectCursor = 0;
    pendingEffects = [];
    const element = React.createElement(MobileNavigation, {
      items: [
        { label: "Overview", href: "/dashboard", icon: icon("overview") },
        { label: "Contracts", href: "/dashboard/contracts", icon: icon("contracts") },
      ],
      pathname: "/dashboard/contracts/record-1",
      rootHref: "/dashboard",
      navigationLabel: "Customer navigation",
      drawerLabel: "All customer pages",
      triggerLabel: "Open navigation",
      closeLabel: "Close navigation",
      logout: {
        label: "Sign out",
        pendingLabel: "Signing out",
        pending: false,
        onLogout() {},
      },
      ...props,
    });
    const tree = materialize(element);

    for (const pending of pendingEffects) {
      if (!pending.changed) continue;
      const previous = effectValues[pending.index];
      previous?.cleanup?.();
      const cleanup = pending.effect();
      effectValues[pending.index] = {
        dependencies: pending.dependencies,
        cleanup: typeof cleanup === "function" ? cleanup : undefined,
      };
    }

    return tree;
  }

  function find(node, predicate) {
    return flattenNodes(node).find(predicate);
  }

  function dispatchWindow(type, event) {
    for (const listener of [...(eventListeners.get(type) ?? [])]) listener(event);
  }

  function resizeToDesktop(matches) {
    mediaQuery.matches = matches;
    for (const listener of [...mediaListeners]) listener(mediaQuery);
  }

  function dispose() {
    for (const effect of effectValues) effect?.cleanup?.();
    global.document = oldDocument;
    global.window = oldWindow;
  }

  return {
    render,
    find,
    dispatchWindow,
    resizeToDesktop,
    document: documentMock,
    focusHistory,
    dispose,
  };
}

function openSheet(harness) {
  const closedTree = harness.render();
  const trigger = harness.find(closedTree, (node) => node.type === "button" && node.props["aria-haspopup"] === "dialog");
  assert.ok(trigger, "the shared hamburger trigger should render");
  trigger.props.onClick();
  const openTree = harness.render();
  const dialog = harness.find(openTree, (node) => node.type === "section" && node.props.role === "dialog");
  assert.ok(dialog, "clicking the hamburger should open the actual sheet");
  return { openTree, dialog };
}

function keyboardEvent({ key = "Tab", shiftKey = false } = {}) {
  return {
    key,
    shiftKey,
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; },
  };
}

test("opening the shared sheet moves initial focus to its close control", () => {
  const harness = createElementHarness();
  try {
    const { openTree } = openSheet(harness);
    const close = harness.find(openTree, (node) => node.type === "button" && node.props["aria-label"] === "Close navigation");

    assert.ok(close);
    assert.equal(harness.document.activeElement, close);
    assert.equal(harness.focusHistory.at(-1), close);
  } finally {
    harness.dispose();
  }
});

test("Tab and Shift+Tab stay inside the sheet at both focus boundaries", () => {
  const harness = createElementHarness();
  try {
    const { dialog } = openSheet(harness);
    const focusables = dialog.querySelectorAll('a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])');
    const first = focusables[0];
    const last = focusables.at(-1);

    harness.document.activeElement = last;
    const tabAtEnd = keyboardEvent();
    dialog.props.onKeyDown(tabAtEnd);
    assert.equal(tabAtEnd.defaultPrevented, true);
    assert.equal(harness.document.activeElement, first);

    harness.document.activeElement = first;
    const shiftTabAtStart = keyboardEvent({ shiftKey: true });
    dialog.props.onKeyDown(shiftTabAtStart);
    assert.equal(shiftTabAtStart.defaultPrevented, true);
    assert.equal(harness.document.activeElement, last);

    harness.document.activeElement = null;
    const tabFromOutside = keyboardEvent();
    dialog.props.onKeyDown(tabFromOutside);
    assert.equal(tabFromOutside.defaultPrevented, true);
    assert.equal(harness.document.activeElement, first);

    harness.document.activeElement = null;
    const shiftTabFromOutside = keyboardEvent({ shiftKey: true });
    dialog.props.onKeyDown(shiftTabFromOutside);
    assert.equal(shiftTabFromOutside.defaultPrevented, true);
    assert.equal(harness.document.activeElement, last);
  } finally {
    harness.dispose();
  }
});

test("closing the sheet restores focus to the hamburger trigger", () => {
  const harness = createElementHarness();
  try {
    const { openTree } = openSheet(harness);
    const close = harness.find(openTree, (node) => node.type === "button" && node.props["aria-label"] === "Close navigation");

    close.props.onClick();
    const closedTree = harness.render();
    const trigger = harness.find(closedTree, (node) => node.type === "button" && node.props["aria-haspopup"] === "dialog");

    assert.equal(harness.find(closedTree, (node) => node.props.role === "dialog"), undefined);
    assert.equal(harness.document.activeElement, trigger);
  } finally {
    harness.dispose();
  }
});

test("selecting a navigation link closes the sheet", () => {
  const harness = createElementHarness();
  try {
    const { openTree } = openSheet(harness);
    const contractLink = harness.find(openTree, (node) =>
      node.type === "a" && node.props.href === "/dashboard/contracts",
    );
    assert.ok(contractLink, "an enabled route should be available in the sheet");

    contractLink.props.onClick();
    const closedTree = harness.render();

    assert.equal(harness.find(closedTree, (node) => node.props.role === "dialog"), undefined);
  } finally {
    harness.dispose();
  }
});

test("Escape and backdrop clicks dismiss the sheet and restore focus", () => {
  const escapeHarness = createElementHarness();
  try {
    const { openTree } = openSheet(escapeHarness);
    const escape = keyboardEvent({ key: "Escape" });
    escapeHarness.dispatchWindow("keydown", escape);
    const closedTree = escapeHarness.render();
    const trigger = escapeHarness.find(closedTree, (node) => node.type === "button" && node.props["aria-haspopup"] === "dialog");

    assert.equal(escape.defaultPrevented, true);
    assert.equal(escapeHarness.find(closedTree, (node) => node.props.role === "dialog"), undefined);
    assert.equal(escapeHarness.document.activeElement, trigger);
  } finally {
    escapeHarness.dispose();
  }

  const backdropHarness = createElementHarness();
  try {
    const { openTree } = openSheet(backdropHarness);
    const backdrop = backdropHarness.find(openTree, (node) => node.type === "div" && typeof node.props.onClick === "function");
    const dialog = backdropHarness.find(openTree, (node) => node.type === "section" && node.props.role === "dialog");
    assert.ok(backdrop, "the actual sheet backdrop handler should render");

    backdrop.props.onClick({ target: dialog, currentTarget: backdrop });
    assert.ok(backdropHarness.find(backdropHarness.render(), (node) => node.props.role === "dialog"), "clicks inside the sheet must not dismiss it");

    backdrop.props.onClick({ target: backdrop, currentTarget: backdrop });
    const closedTree = backdropHarness.render();
    const trigger = backdropHarness.find(closedTree, (node) => node.type === "button" && node.props["aria-haspopup"] === "dialog");

    assert.equal(backdropHarness.find(closedTree, (node) => node.props.role === "dialog"), undefined);
    assert.equal(backdropHarness.document.activeElement, trigger);
  } finally {
    backdropHarness.dispose();
  }
});

test("crossing 1024px closes the sheet and crossing back to 1023px does not reopen it", () => {
  const harness = createElementHarness();
  try {
    openSheet(harness);
    harness.resizeToDesktop(true);
    let tree = harness.render();

    assert.equal(harness.find(tree, (node) => node.props.role === "dialog"), undefined);
    assert.equal(
      harness.find(tree, (node) => node.type === "button" && node.props["aria-haspopup"] === "dialog")?.props["aria-expanded"],
      false,
    );

    harness.resizeToDesktop(false);
    tree = harness.render();

    assert.equal(harness.find(tree, (node) => node.props.role === "dialog"), undefined);
    assert.equal(
      harness.find(tree, (node) => node.type === "button" && node.props["aria-haspopup"] === "dialog")?.props["aria-expanded"],
      false,
    );
  } finally {
    harness.dispose();
  }
});
