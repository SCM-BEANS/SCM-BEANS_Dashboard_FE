const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const React = require("react");

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
    values,
    render(LoginPage) {
      cursor = 0;
      return LoginPage();
    },
  };
}

function loadLoginPage(hooks) {
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
  const icon = (name) => (props) => React.createElement("svg", { ...props, "data-icon": name });
  const mocks = {
    react: hooks.reactModule,
    axios: { isAxiosError: () => false },
    "js-cookie": { set() {} },
    "lucide-react": {
      ArrowRight: icon("arrow-right"),
      Eye: icon("eye"),
      EyeOff: icon("eye-off"),
      KeyRound: icon("key-round"),
      LockKeyhole: icon("lock"),
      Mail: icon("mail"),
      ShieldCheck: icon("shield-check"),
    },
    "next/head": () => null,
    "next/link": ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children),
    "next/router": { useRouter: () => ({ replace: async () => true }) },
    "@/apis/auth.api": { authApi: {} },
    "@/lib/api-errors": { getApiErrorMessage: () => "Lỗi đăng nhập" },
    "@/lib/auth-role": { getPostLoginPath: () => "/dashboard" },
    "@/components/feedback/liquid-success-splash": { LiquidSuccessSplash: () => null },
    "@/routes/path": { PATH_HOME: { ROOT: "/" } },
    "@/schema/auth.schema": {
      FirstLoginPasswordChangeRequestSchema: {},
      LoginMfaRequestSchema: {},
      LoginMfaRequiredResponseSchema: {},
      LoginPasswordChangeRequiredResponseSchema: {},
      LoginRequestSchema: {},
      LoginSuccessResponseSchema: {},
      VerifyEmailRequestSchema: {},
    },
    "@/text/auth/login-messages": {
      LOGIN_MESSAGES: require("../src/text/auth/login-messages.ts").LOGIN_MESSAGES,
    },
    "@/text/typography": { TYPOGRAPHY_STYLES: "" },
  };
  const loaded = { exports: {} };
  const mockedRequire = (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  new Function("require", "module", "exports", outputText)(mockedRequire, loaded, loaded.exports);
  return loaded.exports.default;
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

function elementWithId(tree, id) {
  return findElements(tree, (element) => element.props.id === id)[0];
}

test("password visibility toggles accessibly without clearing the value", () => {
  const hooks = createHookHarness(["credentials", "", "temporary-secret"]);
  const LoginPage = loadLoginPage(hooks);
  let tree = hooks.render(LoginPage);
  const input = elementWithId(tree, "login-password");
  const toggle = findElements(tree, (element) => element.props.className === "password-toggle")[0];

  assert.equal(input.props.type, "password");
  assert.equal(input.props.value, "temporary-secret");
  assert.equal(toggle.props["aria-label"], "Hiện mật khẩu");
  assert.equal(toggle.props["aria-pressed"], false);
  assert.ok(toggle.props.onClick);

  toggle.props.onClick();
  tree = hooks.render(LoginPage);

  assert.equal(elementWithId(tree, "login-password").props.type, "text");
  assert.equal(elementWithId(tree, "login-password").props.value, "temporary-secret");
  const hideButton = findElements(tree, (element) => element.props.className === "password-toggle")[0];
  assert.equal(hideButton.props["aria-label"], "Ẩn mật khẩu");
  assert.equal(hideButton.props["aria-pressed"], true);
});

test("credential and challenge steps retain the same login card", () => {
  const cases = [
    ["credentials", "login-email"],
    ["mfa", "login-code"],
    ["email-verification", "login-code"],
    ["password-change", "login-new-password"],
  ];

  for (const [step, inputId] of cases) {
    const hooks = createHookHarness([step]);
    const tree = hooks.render(loadLoginPage(hooks));
    const card = findElements(tree, (element) => element.props.className === "login-card")[0];

    assert.ok(card, `${step} must use the login card`);
    assert.ok(elementWithId(tree, inputId), `${step} must render its expected input`);
  }
});

test("login motion is brief and disabled for reduced-motion preferences", () => {
  const hooks = createHookHarness();
  const tree = hooks.render(loadLoginPage(hooks));
  const styles = findElements(tree, (element) => element.type === "style")
    .map((element) => element.props.children)
    .join("\n");

  assert.doesNotMatch(styles, /login-card-enter/);
  assert.match(styles, /login-step-enter\s+180ms/);
  assert.match(styles, /width:\s*44px;\s*min-width:\s*44px;\s*height:\s*44px;\s*min-height:\s*44px/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(styles, /animation:\s*none/);
  assert.match(styles, /transition-duration:\s*0ms/);
});
