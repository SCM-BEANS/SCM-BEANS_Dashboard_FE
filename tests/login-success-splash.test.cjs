const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const root = join(__dirname, "..");

function createHookHarness(initialValues = []) {
  const values = [...initialValues];
  let cursor = 0;
  const reactModule = Object.create(React);
  reactModule.useState = (initialValue) => {
    const index = cursor++;
    if (!(index in values)) values[index] = initialValue;
    return [values[index], (value) => {
      values[index] = typeof value === "function" ? value(values[index]) : value;
    }];
  };
  return {
    reactModule,
    render(LoginPage) {
      cursor = 0;
      return LoginPage();
    },
  };
}

function findElements(node, predicate, result = []) {
  if (Array.isArray(node)) {
    for (const item of node) findElements(item, predicate, result);
    return result;
  }
  if (!node || typeof node !== "object" || !("props" in node)) return result;
  if (predicate(node)) result.push(node);
  findElements(node.props.children, predicate, result);
  return result;
}

function schema(accept = () => false) {
  return {
    safeParse(value) {
      return accept(value) ? { success: true, data: value } : { success: false, error: new Error("invalid") };
    },
    parse(value) { return value; },
  };
}

function loadLoginPage({ hooks, loginResult, loginError, reducedMotion = false }) {
  const fileName = join(root, "src/pages/auth/login/login-page.tsx");
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
  const replaceCalls = [];
  const cookieWrites = [];
  const SplashMock = ({ onComplete }) => React.createElement("div", {
    "data-testid": "success-splash",
    onComplete,
  });
  const icons = Object.fromEntries([
    "ArrowRight", "Eye", "EyeOff", "KeyRound", "LockKeyhole", "Mail", "ShieldCheck",
  ].map((name) => [name, () => React.createElement("svg") ]));
  const mocks = {
    react: hooks.reactModule,
    axios: { isAxiosError: () => false },
    "js-cookie": { set: (...args) => cookieWrites.push(args) },
    "lucide-react": icons,
    "next/head": () => null,
    "next/link": ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children),
    "next/router": { useRouter: () => ({ replace: async (path) => { replaceCalls.push(path); return true; } }) },
    "@/apis/auth.api": { authApi: {
      login: async () => {
        if (loginError) throw loginError;
        return loginResult;
      },
    } },
    "@/lib/api-errors": { getApiErrorMessage: () => "Không thể đăng nhập." },
    "@/lib/auth-role": { getPostLoginPath: () => "/dashboard" },
    "@/components/auth/liquid-success-splash": { LiquidSuccessSplash: SplashMock },
    "@/routes/path": { PATH_HOME: { ROOT: "/" } },
    "@/schema/auth.schema": {
      FirstLoginPasswordChangeRequestSchema: schema(),
      LoginMfaRequestSchema: schema(),
      LoginMfaRequiredResponseSchema: schema((value) => value?.mfa_required === true),
      LoginPasswordChangeRequiredResponseSchema: schema((value) => value?.password_change_required === true),
      LoginRequestSchema: {
        safeParse(value) {
          return value.email && value.password
            ? { success: true, data: value }
            : { success: false, error: { issues: [{ path: ["password"] }] } };
        },
      },
      LoginSuccessResponseSchema: schema((value) => typeof value?.access_token === "string"),
      VerifyEmailRequestSchema: schema(),
    },
    "@/text/auth/login-messages": {
      LOGIN_MESSAGES: require("../src/text/auth/login-messages.ts").LOGIN_MESSAGES,
    },
  };
  const loaded = { exports: {} };
  const mockedRequire = (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  new Function("require", "module", "exports", outputText)(mockedRequire, loaded, loaded.exports);
  return { LoginPage: loaded.exports.default, replaceCalls, cookieWrites, SplashMock, reducedMotion };
}

function withWindow(reducedMotion = false) {
  const previous = global.window;
  global.window = {
    location: { protocol: "http:" },
    matchMedia: () => ({ matches: reducedMotion }),
  };
  return () => {
    if (previous === undefined) delete global.window;
    else global.window = previous;
  };
}

async function submitCredentials({ result, error, reducedMotion = false }) {
  const restoreWindow = withWindow(reducedMotion);
  const hooks = createHookHarness(["credentials", "person@example.com", "temporary-password"]);
  const context = loadLoginPage({ hooks, loginResult: result, loginError: error, reducedMotion });
  let tree = hooks.render(context.LoginPage);
  const form = findElements(tree, (element) => element.type === "form")[0];
  await form.props.onSubmit({ preventDefault() {} });
  tree = hooks.render(context.LoginPage);
  return { ...context, hooks, tree, restoreWindow };
}

test("only final login success displays one splash and then uses the existing role route", async () => {
  const result = await submitCredentials({ result: { access_token: "final-user-token", expires_in: 3600 } });
  try {
    const splash = findElements(result.tree, (element) => element.type === result.SplashMock);
    assert.equal(splash.length, 1);
    assert.deepEqual(result.cookieWrites[0].slice(0, 2), ["access_token", "final-user-token"]);
    assert.deepEqual(result.replaceCalls, []);

    splash[0].props.onComplete();
    assert.deepEqual(result.replaceCalls, ["/dashboard"]);
  } finally {
    result.restoreWindow();
  }
});

test("MFA challenge does not display the success splash or redirect", async () => {
  const result = await submitCredentials({ result: { mfa_required: true, temp_token: "pending-token" } });
  try {
    assert.equal(findElements(result.tree, (element) => element.type === result.SplashMock).length, 0);
    assert.ok(findElements(result.tree, (element) => element.props.id === "login-code").length);
    assert.deepEqual(result.replaceCalls, []);
  } finally {
    result.restoreWindow();
  }
});

test("login failure keeps the user on the form without showing success", async () => {
  const result = await submitCredentials({ error: new Error("bad credentials") });
  try {
    assert.equal(findElements(result.tree, (element) => element.type === result.SplashMock).length, 0);
    assert.equal(findElements(result.tree, (element) => element.props.role === "alert").length, 1);
    assert.deepEqual(result.replaceCalls, []);
  } finally {
    result.restoreWindow();
  }
});

test("reduced-motion preference skips the splash and routes immediately", async () => {
  const result = await submitCredentials({
    result: { access_token: "final-user-token", expires_in: 3600 },
    reducedMotion: true,
  });
  try {
    assert.equal(findElements(result.tree, (element) => element.type === result.SplashMock).length, 0);
    assert.deepEqual(result.replaceCalls, ["/dashboard"]);
  } finally {
    result.restoreWindow();
  }
});

function loadSplashModule() {
  const fileName = join(root, "src/components/auth/liquid-success-splash.tsx");
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
  const mocks = {
    "./liquid-success-splash.module.css": { overlay: "overlay", wave: "wave", message: "message" },
    gsap: { __esModule: true, gsap: {} },
  };
  const loaded = { exports: {} };
  const mockedRequire = (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  new Function("require", "module", "exports", outputText)(mockedRequire, loaded, loaded.exports);
  return loaded.exports;
}

function createFakeTimers() {
  let nextId = 1;
  const pending = new Map();
  return {
    pending,
    setTimeout(callback, delay) {
      const id = nextId++;
      pending.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) { pending.delete(id); },
    runAll() {
      const timers = [...pending.values()];
      pending.clear();
      for (const timer of timers) timer.callback();
    },
  };
}

function createFakeGsap({ throwOnTween = false } = {}) {
  const calls = [];
  let completion;
  const timeline = {
    set(target, vars) { calls.push({ method: "set", target, vars }); return timeline; },
    to(target, vars, position) {
      calls.push({ method: "to", target, vars, position });
      if (throwOnTween) throw new Error("animation failed");
      return timeline;
    },
  };
  return {
    calls,
    gsap: { timeline(options) { completion = options.onComplete; return timeline; } },
    complete() { completion(); },
  };
}

test("success splash announces success, uses Dolores colors, and contains no audio", () => {
  const { LiquidSuccessSplash } = loadSplashModule();
  const markup = renderToStaticMarkup(React.createElement(LiquidSuccessSplash, { onComplete() {} }));
  const css = readFileSync(join(root, "src/components/auth/liquid-success-splash.module.css"), "utf8");

  assert.match(markup, /role="status"/);
  assert.match(markup, /Đăng nhập thành công/);
  assert.doesNotMatch(markup, /<audio\b/i);
  assert.match(css, /#b81724/i);
});

test("GSAP completion redirects once before the bounded fallback", async () => {
  const { startLiquidSuccessAnimation, LOGIN_SPLASH_MAX_DURATION_MS } = loadSplashModule();
  const fake = createFakeGsap();
  const timers = createFakeTimers();
  let completeCount = 0;
  startLiquidSuccessAnimation({
    wave: {},
    message: {},
    onComplete: () => { completeCount += 1; },
    prefersReducedMotion: () => false,
    loadGsap: async () => ({ gsap: fake.gsap }),
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
  });
  await new Promise(setImmediate);

  const tweenDuration = fake.calls
    .filter((call) => call.method === "to")
    .reduce((total, call) => total + (call.vars.duration || 0), 0);
  assert.ok(LOGIN_SPLASH_MAX_DURATION_MS <= 1500);
  assert.ok(tweenDuration <= 1.5);
  assert.equal(timers.pending.size, 1);
  fake.complete();
  timers.runAll();
  assert.equal(completeCount, 1);
  assert.equal(timers.pending.size, 0);
});

test("animation setup failure still completes through the safe fallback", async () => {
  const { startLiquidSuccessAnimation } = loadSplashModule();
  const timers = createFakeTimers();
  let completeCount = 0;
  startLiquidSuccessAnimation({
    wave: {},
    message: {},
    onComplete: () => { completeCount += 1; },
    prefersReducedMotion: () => false,
    loadGsap: async () => { throw new Error("GSAP chunk unavailable"); },
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
  });
  await new Promise(setImmediate);
  assert.equal(completeCount, 1);

  const tweenFailureTimers = createFakeTimers();
  const failingGsap = createFakeGsap({ throwOnTween: true });
  startLiquidSuccessAnimation({
    wave: {},
    message: {},
    onComplete: () => { completeCount += 1; },
    prefersReducedMotion: () => false,
    loadGsap: async () => ({ gsap: failingGsap.gsap }),
    setTimeout: tweenFailureTimers.setTimeout,
    clearTimeout: tweenFailureTimers.clearTimeout,
  });
  await new Promise(setImmediate);
  assert.equal(completeCount, 2);
});

test("reduced-motion skips GSAP and the wave animation", () => {
  const { startLiquidSuccessAnimation } = loadSplashModule();
  const timers = createFakeTimers();
  let completeCount = 0;
  let gsapLoaded = false;
  startLiquidSuccessAnimation({
    wave: {},
    message: {},
    onComplete: () => { completeCount += 1; },
    prefersReducedMotion: () => true,
    loadGsap: async () => { gsapLoaded = true; return { gsap: {} }; },
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
  });

  assert.equal(completeCount, 1);
  assert.equal(gsapLoaded, false);
  assert.equal(timers.pending.size, 0);
});
