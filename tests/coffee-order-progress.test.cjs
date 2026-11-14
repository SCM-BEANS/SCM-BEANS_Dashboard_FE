const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const source = ts.transpileModule(fs.readFileSync("src/components/features/coffee-packages/coffee-order-progress.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const loaded = { exports: {} };
new Function("require", "module", "exports", source)((id) => {
  if (id.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
  if (id.includes("status-badge")) return { StatusBadge: ({ children }) => React.createElement("span", null, children) };
  if (id.includes("workflow-controller")) return { coffeePackageStatusLabel: (status) => status };
  return require(id);
}, loaded, loaded.exports);
const render = (status) => renderToStaticMarkup(React.createElement(loaded.exports.CoffeeOrderProgress, { order: { status } }));

test("a paid order still awaits handover; a delivered order completes all milestones", () => {
  for (const status of ["PAID", "WAITING_STOCK"]) {
    const html = render(status);
    assert.equal((html.match(/workOrderProgressComplete/g) || []).length, 3);
    assert.match(html, /aria-current="step"[^>]*><span[^>]*>4<\/span><small>Bàn giao/);
  }
  const delivered = render("DELIVERED");
  assert.equal((delivered.match(/workOrderProgressComplete/g) || []).length, 4);
  assert.doesNotMatch(delivered, /aria-current/);
});

test("cancelled, rejected and unknown states never report delivery progress as completed", () => {
  for (const status of ["CANCELLED", "REJECTED", "CANCELLATION_REFUND_PENDING", "CANCELLED_REFUNDED", "UNKNOWN"]) {
    assert.doesNotMatch(render(status), /workOrderProgressComplete|aria-current/);
  }
});
