const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const source = fs.readFileSync('src/components/action-bar/page-actions.tsx', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const mod = { exports: {} };
const mocks = {
  './action-bar': { ActionBarConfig: ({ children }) => children },
  'next/router': { useRouter: () => ({ push: () => Promise.resolve(true) }) },
  '@/components/button/button-bar': { ButtonBar: ({ children, href, variant, ...props }) => React.createElement(href ? 'a' : 'button', { ...props, href, 'data-variant': variant }, children) },
  '@/components/notification-dialog/notification-dialog': { NotificationDialog: () => null },
  './page-actions.module.css': { default: {} },
};
new Function('require', 'module', 'exports', code)((id) => mocks[id] || require(id), mod, mod.exports);
const render = (actions) => renderToStaticMarkup(React.createElement(mod.exports.PageActions, { actions }));
test('page actions order danger before secondary and primary and overflow excess', () => {
  const html = render([{ id: 'p', label: 'Save', variant: 'primary' }, { id: 's', label: 'Edit' }, { id: 'd', label: 'Delete', variant: 'danger' }, { id: 'x', label: 'Extra' }]);
  assert.ok(html.indexOf('Delete') < html.indexOf('Edit'));
  assert.ok(html.indexOf('Edit') < html.indexOf('Save'));
  assert.match(html, /Thêm thao tác/);
  assert.doesNotMatch(html, /Extra/);
});
test('pending action locks siblings and uses pending label', () => {
  const html = render([{ id: 'p', label: 'Save', pending: true, pendingLabel: 'Saving', variant: 'primary' }, { id: 's', label: 'Edit' }]);
  assert.match(html, /Saving/);
  assert.equal((html.match(/disabled=""/g) || []).length, 2);
});
test('empty actions render nothing', () => assert.equal(render([]), ''));
