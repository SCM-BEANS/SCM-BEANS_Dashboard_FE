const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const root = join(__dirname, "..");
const cssModule = {
  button: "actionButton",
  primary: "primary",
  secondary: "secondary",
  light: "light",
  outline: "outline",
  text: "text",
  icon: "icon",
};

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

function mockLink({ href, children, ...props }) {
  return React.createElement("a", { href, ...props }, children);
}

test("ActionButton renders a semantic link and applies its CSS Module variant", () => {
  const { ActionButton } = loadTypeScriptModule("src/components/button/action-button.tsx", {
    "next/link": mockLink,
    "./action-button.module.css": cssModule,
  });
  const markup = renderToStaticMarkup(
    React.createElement(ActionButton, { href: "/login", variant: "primary" }, "Đăng nhập"),
  );

  assert.match(markup, /<a[^>]*href="\/login"/);
  assert.match(markup, /class="[^"]*actionButton[^"]*primary/);
  assert.match(markup, />Đăng nhập</);
});

test("ActionButton supports a light-surface secondary variant", () => {
  const { ActionButton } = loadTypeScriptModule("src/components/button/action-button.tsx", {
    "next/link": mockLink,
    "./action-button.module.css": cssModule,
  });
  const markup = renderToStaticMarkup(
    React.createElement(ActionButton, { href: "#technology", variant: "secondary" }, "Xem nền tảng"),
  );

  assert.match(markup, /class="[^"]*secondary/);
  assert.match(markup, /href="#technology"/);
});

test("SectionHeading omits an absent eyebrow without leaving an empty label", () => {
  const { SectionHeading } = loadTypeScriptModule("src/components/heading/section-heading.tsx");
  const markup = renderToStaticMarkup(
    React.createElement(SectionHeading, {
      title: "Nền tảng quản lý",
      description: "Theo dõi hoạt động trên Dolores.",
    }),
  );

  assert.match(markup, /<h2>Nền tảng quản lý<\/h2>/);
  assert.doesNotMatch(markup, /class="eyebrow"/);
});
