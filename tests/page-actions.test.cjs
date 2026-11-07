const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const source = fs.readFileSync('src/components/action-bar/page-actions.tsx', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const registrySource = fs.readFileSync('src/components/action-bar/page-actions-registry.ts', 'utf8');
const registryCode = ts.transpileModule(registrySource, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const registryModule = { exports: {} };
new Function('require', 'module', 'exports', registryCode)(require, registryModule, registryModule.exports);
const { PageActionsRegistry } = registryModule.exports;
const rendererSource = fs.readFileSync('src/components/action-bar/page-actions-renderer.tsx', 'utf8');
const rendererCode = ts.transpileModule(rendererSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const rendererModule = { exports: {} };
const rendererMocks = {
  'next/router': { useRouter: () => ({ push: () => Promise.resolve(true) }) },
  '@/components/button/button-bar': { ButtonBar: ({ children, href, variant, ...props }) => React.createElement(href ? 'a' : 'button', { ...props, href, 'data-variant': variant }, children) },
  '@/components/notification-dialog/notification-dialog': { NotificationDialog: () => null },
  './page-actions.module.css': { default: { action: 'action', container: 'container', danger: 'danger', menu: 'menu', menuItem: 'menuItem', pendingHint: 'pendingHint', popup: 'popup', right: 'right', visuallyHidden: 'visuallyHidden' } },
};
new Function('require', 'module', 'exports', rendererCode)((id) => rendererMocks[id] || require(id), rendererModule, rendererModule.exports);
const mod = { exports: {} };
const mocks = {
  './action-bar': { ActionBarConfig: ({ children }) => children },
  './page-actions-registry': { PageActionsRegistryContext: React.createContext(null) },
  './page-actions-renderer': rendererModule.exports,
  'next/router': { useRouter: () => ({ push: () => Promise.resolve(true) }) },
  '@/components/button/button-bar': { ButtonBar: ({ children, href, variant, ...props }) => React.createElement(href ? 'a' : 'button', { ...props, href, 'data-variant': variant }, children) },
  '@/components/notification-dialog/notification-dialog': { NotificationDialog: () => null },
  './page-actions.module.css': { default: {} },
};
new Function('require', 'module', 'exports', code)((id) => mocks[id] || require(id), mod, mod.exports);
const render = (actions) => renderToStaticMarkup(React.createElement(mod.exports.PageActions, { actions }));
const renderActions = (actions) => renderToStaticMarkup(React.createElement(rendererModule.exports.PageActionsRenderer, { actions }));
const actionVariant = (html, id) => {
  const tag = html.match(new RegExp(`<button(?=[^>]*data-action-id="${id}")[^>]*>`))?.[0];
  return tag?.match(/data-variant="([^"]+)"/)?.[1];
};

test('registry preserves registration order and higher-priority primary wins across groups', () => {
  const registry = new PageActionsRegistry();
  registry.register('z-group', [{ id: 'z-primary', label: 'Create', variant: 'primary', priority: 20 }]);
  registry.register('a-group', [{ id: 'a-primary', label: 'Edit', variant: 'primary', priority: 10 }]);

  const actions = registry.getSnapshot();
  assert.deepEqual(actions.map((action) => action.id), ['z-primary', 'a-primary']);
  const html = renderActions(actions);
  assert.equal(actionVariant(html, 'z-primary'), 'primary');
  assert.equal(actionVariant(html, 'a-primary'), 'secondary');
});

test('last registered primary wins a priority tie', () => {
  const registry = new PageActionsRegistry();
  registry.register('z-group', [{ id: 'z-primary', label: 'Earlier', variant: 'primary', priority: 50 }]);
  registry.register('a-group', [{ id: 'a-primary', label: 'Later', variant: 'primary', priority: 50 }]);

  const html = renderActions(registry.getSnapshot());
  assert.equal(actionVariant(html, 'z-primary'), 'secondary');
  assert.equal(actionVariant(html, 'a-primary'), 'primary');
});

test('same-priority secondary actions keep registration order regardless of IDs', () => {
  const registry = new PageActionsRegistry();
  registry.register('first-group', [{ id: 'z-first', label: 'First' }]);
  registry.register('second-group', [{ id: 'a-second', label: 'Second' }]);

  const html = renderActions(registry.getSnapshot());
  assert.ok(html.indexOf('data-action-id="z-first"') < html.indexOf('data-action-id="a-second"'));
});

test('page actions order danger before secondary and primary and overflow excess', () => {
  const html = render([{ id: 'p', label: 'Save', variant: 'primary' }, { id: 's', label: 'Edit' }, { id: 'd', label: 'Delete', variant: 'danger' }, { id: 'x', label: 'Extra' }]);
  assert.ok(html.indexOf('Delete') < html.indexOf('Edit'));
  assert.ok(html.indexOf('Edit') < html.indexOf('Save'));
  assert.match(html, /Thêm thao tác/);
  assert.doesNotMatch(html, /Extra/);
});
test('priority selects the non-primary actions that stay visible before overflow', () => {
  const html = renderActions([
    { id: 'low-secondary', label: 'Low', priority: 0 },
    { id: 'high-secondary', label: 'High', priority: 50 },
    { id: 'primary', label: 'Submit', variant: 'primary', priority: 100 },
    { id: 'same-priority-danger', label: 'Danger', variant: 'danger', priority: 50 },
    { id: 'overflow-secondary', label: 'Overflow', priority: 0 },
  ]);
  assert.match(html, /data-action-id="high-secondary"/);
  assert.match(html, /data-action-id="same-priority-danger"/);
  assert.doesNotMatch(html, /data-action-id="low-secondary"|data-action-id="overflow-secondary"/);
});
test('danger actions stay visible before higher-priority secondary actions', () => {
  const html = renderActions([
    { id: 'policy', label: 'Edit policy', variant: 'secondary', priority: 10 },
    { id: 'history', label: 'History', variant: 'secondary', priority: 0 },
    { id: 'terminate', label: 'Terminate', variant: 'danger', priority: 0 },
    { id: 'continue', label: 'Continue', variant: 'primary', priority: 50 },
  ]);
  assert.ok(html.indexOf('data-action-id="terminate"') < html.indexOf('data-action-id="policy"'));
  assert.match(html, /Thêm thao tác/);
  assert.doesNotMatch(html, /data-action-id="history"/);
});
test('pending action locks siblings and uses pending label', () => {
  const html = render([{ id: 'p', label: 'Save', pending: true, pendingLabel: 'Saving', variant: 'primary' }, { id: 's', label: 'Edit' }]);
  assert.match(html, /Saving/);
  assert.equal((html.match(/disabled=""/g) || []).length, 2);
});
test('empty actions render nothing', () => assert.equal(render([]), ''));
