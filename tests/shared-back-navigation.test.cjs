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

function createBrowserHistory(initialHref = "https://dolores.test/customers") {
  const entries = [{ state: null, href: initialHref }];
  let index = 0;
  const location = {};
  for (const key of ["href", "origin", "pathname", "search", "hash"]) {
    Object.defineProperty(location, key, {
      get() { return new URL(entries[index].href)[key]; },
    });
  }
  const history = {
    get state() { return entries[index].state; },
    pushState(state, _title, href) {
      const nextHref = href == null ? entries[index].href : new URL(href, entries[index].href).href;
      entries.splice(index + 1);
      entries.push({ state, href: nextHref });
      index += 1;
    },
    replaceState(state, _title, href) {
      entries[index] = {
        state,
        href: href == null ? entries[index].href : new URL(href, entries[index].href).href,
      };
    },
    back() { if (index > 0) index -= 1; },
    forward() { if (index < entries.length - 1) index += 1; },
  };
  return { history, location, entries, current: () => entries[index] };
}

function loadHistoryEntryModule() {
  return loadTypeScriptModule("src/components/navigation/history-entry.ts");
}

test("a direct entry is marked as a Dolores root without changing its route", () => {
  const { installInAppHistoryTracking, readHistoryEntry, HISTORY_ENTRY_STATE_KEY } = loadHistoryEntryModule();
  const browser = createBrowserHistory("https://dolores.test/customers/42?tab=machines");
  browser.history.replaceState({ __N: true, key: "next-initial" }, "", browser.location.href);
  const nativePushState = browser.history.pushState;
  const stopTracking = installInAppHistoryTracking(browser.history, browser.location, () => "entry-direct");

  try {
    assert.equal(browser.location.pathname, "/customers/42");
    assert.equal(browser.location.search, "?tab=machines");
    assert.deepEqual(readHistoryEntry(browser.history.state), {
      id: "entry-direct",
      parentId: null,
      path: "/customers/42?tab=machines",
    });
    assert.equal(browser.history.state.__N, true);
    assert.equal(browser.history.state.key, "next-initial");
    assert.ok(HISTORY_ENTRY_STATE_KEY in browser.history.state);
    assert.notEqual(browser.history.pushState, nativePushState);
  } finally {
    stopTracking();
  }
  assert.equal(browser.history.pushState, nativePushState);
});

test("push creates a parent link and Back/Forward restore the exact marked entries", () => {
  const { installInAppHistoryTracking, readHistoryEntry } = loadHistoryEntryModule();
  const browser = createBrowserHistory("https://dolores.test/customers?page=3&status=active");
  let id = 0;
  const stopTracking = installInAppHistoryTracking(browser.history, browser.location, () => `entry-${++id}`);

  try {
    const listEntry = readHistoryEntry(browser.history.state);
    browser.history.pushState({ __N: true, key: "next-detail" }, "", "/customers/42?tab=machines");
    const detailEntry = readHistoryEntry(browser.history.state);

    assert.equal(detailEntry.parentId, listEntry.id);
    assert.equal(detailEntry.path, "/customers/42?tab=machines");
    assert.equal(browser.history.state.__N, true);
    browser.history.back();
    assert.equal(readHistoryEntry(browser.history.state).id, listEntry.id);
    assert.equal(browser.location.search, "?page=3&status=active");
    browser.history.forward();
    assert.equal(readHistoryEntry(browser.history.state).id, detailEntry.id);
  } finally {
    stopTracking();
  }
});

test("replace preserves the current history entry identity and its parent", () => {
  const { installInAppHistoryTracking, readHistoryEntry } = loadHistoryEntryModule();
  const browser = createBrowserHistory();
  let id = 0;
  const stopTracking = installInAppHistoryTracking(browser.history, browser.location, () => `entry-${++id}`);

  try {
    browser.history.pushState({ __N: true }, "", "/customers/42");
    const before = readHistoryEntry(browser.history.state);
    browser.history.replaceState({ __N: true, key: "replacement" }, "", "/customers/42?tab=contracts");
    const after = readHistoryEntry(browser.history.state);
    assert.equal(after.id, before.id);
    assert.equal(after.parentId, before.parentId);
    assert.equal(after.path, "/customers/42?tab=contracts");
  } finally {
    stopTracking();
  }
});

test("BackButton uses the previous Dolores entry and safely replaces to its parent on direct entry", async () => {
  const { navigateBackOrFallback, HISTORY_ENTRY_STATE_KEY } = loadHistoryEntryModule();
  const calls = [];
  const router = {
    back() { calls.push(["back"]); },
    replace(href) { calls.push(["replace", href]); },
  };
  const stateWithParent = { [HISTORY_ENTRY_STATE_KEY]: { id: "detail", parentId: "list", path: "/customers/42" } };
  const directEntryState = { [HISTORY_ENTRY_STATE_KEY]: { id: "direct", parentId: null, path: "/customers/42" } };

  assert.equal(navigateBackOrFallback({ historyState: stateWithParent, fallbackHref: "/customers?page=2", router }), "back");
  assert.equal(navigateBackOrFallback({ historyState: directEntryState, fallbackHref: "/customers?page=2", router }), "fallback");
  assert.equal(navigateBackOrFallback({ historyState: directEntryState, fallbackHref: "//outside.test", router }), "invalid-fallback");
  assert.equal(navigateBackOrFallback({ historyState: directEntryState, fallbackHref: "https://outside.test", router }), "invalid-fallback");
  await new Promise(setImmediate);
  assert.deepEqual(calls, [["back"], ["replace", "/customers?page=2"]]);
});

test("BackButton renders an accessible 44px target and runs its shared navigation action", () => {
  const historyEntry = loadHistoryEntryModule();
  const { navigateBackOrFallback } = historyEntry;
  const calls = [];
  const restoreRouter = { useRouter: () => ({
    back() { calls.push(["back"]); },
    replace(href) { calls.push(["replace", href]); },
  }) };
  const icon = (props) => React.createElement("svg", { ...props, "data-icon": "arrow-left" });
  const { BackButton } = loadTypeScriptModule("src/components/navigation/back-button.tsx", {
    "next/router": restoreRouter,
    "lucide-react": { ArrowLeft: icon },
    "./back-button.module.css": { button: "back-button", icon: "back-icon" },
    "./history-entry": { ...historyEntry, navigateBackOrFallback },
  });
  const css = readFileSync(join(root, "src/components/navigation/back-button.module.css"), "utf8");
  const oldWindow = global.window;
  global.window = { history: { state: { [historyEntry.HISTORY_ENTRY_STATE_KEY]: { id: "detail", parentId: "list", path: "/customers/42" } } } };

  try {
    const element = BackButton({ label: "Về danh sách khách hàng", fallbackHref: "/customers" });
    assert.equal(element.type, "button");
    assert.equal(element.props.type, "button");
    assert.equal(element.props["aria-label"], "Về danh sách khách hàng");
    assert.match(css, /min-height:\s*44px/);
    assert.match(css, /:focus-visible/);
    element.props.onClick({ preventDefault() {} });
    assert.deepEqual(calls, [["back"]]);

    global.window.history.state = { [historyEntry.HISTORY_ENTRY_STATE_KEY]: { id: "direct", parentId: null, path: "/customers/42" } };
    element.props.onClick({ preventDefault() {} });
    assert.deepEqual(calls, [["back"], ["replace", "/customers"]]);
  } finally {
    if (oldWindow === undefined) delete global.window;
    else global.window = oldWindow;
  }
});

test("the history provider is safe to render on the server without window", () => {
  const { InAppHistoryProvider } = loadTypeScriptModule("src/components/navigation/in-app-history-provider.tsx", {
    "./history-entry": loadHistoryEntryModule(),
  });
  const oldWindow = global.window;
  delete global.window;

  try {
    const markup = renderToStaticMarkup(React.createElement(
      InAppHistoryProvider,
      null,
      React.createElement("span", null, "SSR safe"),
    ));
    assert.equal(markup, "<span>SSR safe</span>");
  } finally {
    if (oldWindow !== undefined) global.window = oldWindow;
  }
});
