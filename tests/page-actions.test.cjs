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
  '@/components/button/button-bar': { ButtonBar: ({ children, href, variant, holdToConfirm, ...props }) => React.createElement(href ? 'a' : 'button', { ...props, href, 'data-variant': variant, ...(holdToConfirm ? { 'data-hold-to-confirm': 'true' } : {}) }, children) },
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
  '@/components/button/button-bar': { ButtonBar: ({ children, href, variant, holdToConfirm, ...props }) => React.createElement(href ? 'a' : 'button', { ...props, href, 'data-variant': variant, ...(holdToConfirm ? { 'data-hold-to-confirm': 'true' } : {}) }, children) },
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
test('page actions preserve hold-to-confirm on the shared button', () => {
  const html = render([{ id: 'reject', label: 'Reject', variant: 'danger', holdToConfirm: true }]);
  assert.match(html, /data-hold-to-confirm="true"/);
});


test('navigation-only docks disappear only when every target is already in the sidebar', () => {
  const registry = new PageActionsRegistry(['/admin/machines', '/admin/reports']);
  registry.register('shortcuts', [{ id: 'machines', label: 'Kho máy', href: '/admin/machines' }, { id: 'reports', label: 'Báo cáo', href: '/admin/reports' }]);
  assert.deepEqual(registry.getSnapshot(), []);
  registry.register('save', [{ id: 'save', label: 'Lưu', type: 'submit', form: 'edit-form', disabled: true }]);
  assert.deepEqual(registry.getSnapshot().map(action => action.id), ['machines', 'reports', 'save']);
  registry.unregister('save');
  assert.deepEqual(registry.getSnapshot(), []);
  registry.register('create', [{ id: 'create', label: 'Tạo', href: '/admin/machines/new' }]);
  assert.equal(registry.getSnapshot().length, 3);
});

test('navigation targets with business callbacks and confirmations remain available', () => {
  for (const extra of [{ onClick() {} }, { type: 'submit' }, { form: 'form' }, { confirm: { title: 'Hủy?', description: 'Bỏ thay đổi', confirmLabel: 'Hủy' } }, { holdToConfirm: true }]) {
    const registry = new PageActionsRegistry(['/admin/machines']);
    const action = { id: 'cancel', label: 'Hủy', href: '/admin/machines', ...extra };
    registry.register('form', [action]);
    assert.deepEqual(registry.getSnapshot(), [action]);
  }
});

test('TailAdmin shared controls retain accessible sizes, focus, disabled and selected tab styles', () => {
  const css = fs.readFileSync('src/components/button/button-bar.module.css', 'utf8');
  assert.match(css, /ta:min-w-11 ta:min-h-11/);
  assert.match(css, /\.button:focus-visible[^}]*ta:outline-brand-500/);
  assert.match(css, /\.button:disabled[^}]*ta:opacity-50/);
  assert.match(css, /\.button\.button\.primary[^}]*ta:bg-brand-500 ta:text-white/);
  assert.match(css, /\.button\.button\.primary:hover[^}]*ta:bg-brand-600/);
  assert.match(css, /\.sectionTabs\s*\{[^}]*ta:flex-nowrap[^}]*ta:overflow-x-auto[^}]*ta:border-gray-200/);
  assert.match(css, /ta:border-b-2 ta:border-transparent/);
  assert.match(css, /aria-selected="true"[^}]*ta:text-brand-500 ta:border-brand-500/);
  assert.match(css, /\.ghost:not\(\.primary\):not\(\.danger\)/);
  assert.match(css, /\.progressDownloadTrack[^}]*background: var\(--ta-color-brand-50\)/);
  assert.match(css, /\.progressDownloadBar[^}]*background: var\(--ta-color-brand-200\)/);
});

test('machine tabs retain ARIA relationships, roving focus, arrow wrap and Home/End selection', () => {
  const source = fs.readFileSync('src/components/machines/operational-overview.tsx', 'utf8');
  const ast = ts.createSourceFile('operational-overview.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'MachineSectionTabs');
  assert.ok(declaration);
  const code = ts.transpileModule(declaration.getText(ast), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', 'styles', code)(require, loaded, loaded.exports, { ownerOperationsTabs: 'tabs' });
  const tabs = [{ value: 'first', label: 'First (2)' }, { value: 'second', label: 'Second (3)' }];
  const selections = [];
  const tree = loaded.exports.MachineSectionTabs({ label: 'Machine sections', tabs, activeTab: 'first', onTabChange: value => selections.push(value), idPrefix: 'machine', panelId: value => `panel-${value}` });
  assert.equal(tree.props.role, 'tablist');
  assert.equal(tree.props['aria-label'], 'Machine sections');
  const buttons = tree.props.children;
  assert.deepEqual(buttons.map(button => [button.props.role, button.props.tabIndex, button.props['aria-selected'], button.props['aria-controls'], button.props.children]), [
    ['tab', 0, true, 'panel-first', 'First (2)'], ['tab', -1, false, 'panel-second', 'Second (3)'],
  ]);
  const focused = [];
  const previousDocument = global.document;
  global.document = { getElementById: id => ({ focus: () => focused.push(id) }) };
  try {
    let prevented = 0;
    for (const [index, key] of [[0, 'ArrowLeft'], [1, 'ArrowRight'], [0, 'End'], [1, 'Home']]) {
      buttons[index].props.onKeyDown({ key, preventDefault: () => prevented++ });
    }
    assert.equal(prevented, 4);
    assert.deepEqual(selections, ['second', 'first', 'second', 'first']);
    assert.deepEqual(focused, ['machine-tab-second', 'machine-tab-first', 'machine-tab-second', 'machine-tab-first']);
    buttons[0].props.onKeyDown({ key: 'Enter', preventDefault: () => assert.fail('unhandled keys keep native behavior') });
    buttons[1].props.onClick();
    assert.equal(selections.at(-1), 'second');
  } finally {
    if (previousDocument === undefined) delete global.document;
    else global.document = previousDocument;
  }
});
