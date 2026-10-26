const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const root = join(__dirname, "..");

function loadLoginPage() {
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
    "@/assets/landing-hero-desktop.jpg": { default: { src: "/hero.jpg" } },
    "@/components/brand/brand-logo": {
      BrandLogo: ({ brandName, brandTagline, href, ariaLabel }) => React.createElement(
        "a",
        { href, "aria-label": ariaLabel },
        `${brandName} ${brandTagline}`,
      ),
    },
    "@/pages/auth/login/liquid-success-splash": { LiquidSuccessSplash: () => null },
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

test("login renders a centered Dolores product card with credentials and no hero panel", () => {
  const LoginPage = loadLoginPage();
  const markup = renderToStaticMarkup(React.createElement(LoginPage));

  assert.match(markup, /class="login-card"/);
  assert.match(markup, /class="login-brand"[^>]*>dolores\./);
  assert.match(markup, /id="login-email"/);
  assert.match(markup, /id="login-password"/);
  assert.doesNotMatch(markup, /story-panel|story-overlay|story-copy|landing-hero/);
  assert.match(markup, /max-width:\s*440px/);
  assert.match(markup, /<h1[^>]*id="login-title"/);
  assert.doesNotMatch(markup, /form-eyebrow|form-icon/);
  assert.match(markup, /#f8f6f3/);
  assert.match(markup, /#b81724/);
});
