const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');

function renderShell(pathname, role = 'moderator') {
  const relativePath = 'src/app/_shell/dolores/DoloresShell.tsx';
  const fileName = join(__dirname, '..', relativePath);
  const source = readFileSync(fileName, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  const mockedRequire = (id) => {
    if (id === '@/routes/navigation') {
      return {
        getRoleNavigationState: () => ({
          nav: [{ href: '/moderator', label: 'Tổng quan', icon: 'overview' }],
          selectionPath: pathname,
          mobileSelectionPath: pathname,
          selectedItem: { label: 'Tổng quan' },
          notificationsHref: '/moderator/notifications',
          mobileItems: [],
        }),
        isCurrentPath: () => false,
        ROLE_LABEL: { moderator: 'Moderator', admin: 'Admin' },
      };
    }
    if (id === '@/routes/path') {
      return {
        PATH_PUBLIC: { home: '/' },
        PATH_MODERATOR: {
          root: '/moderator',
          contracts: '/moderator/contracts',
          customers: '/moderator/customers',
          machines: '/moderator/machines',
          machinesList: '/moderator/machines/list',
          machineStock: '/moderator/machines/stock',
          machineCustomer: '/moderator/machines/customer',
          machineRepairHistory: '/moderator/machines/repair-history',
          iot: '/moderator/iot',
          iotCustomer: '/moderator/iot/customer',
          iotMachines: '/moderator/iot/machines',
          technicalRequests: '/moderator/technical-requests',
          technicalRequestsList: '/moderator/technical-requests/list',
          machineHistory: '/moderator/machine-history',
          notifications: '/moderator/notifications',
          notificationAlerts: '/moderator/notifications/alerts',
        },
      };
    }
    if (id === '@/app/_ui/dolores/DoloresUI') return { DoloresIconView: () => null };
    if (id === 'next/link') return ({ href, children }) => React.createElement('a', { href }, children);
    if (id === 'next/navigation') return { usePathname: () => pathname };
    if (id === './DoloresShell.module.css') return {};
    return require(id);
  };
  const module = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(mockedRequire, module.exports, module);
  const { DoloresShell } = module.exports;
  return renderToStaticMarkup(React.createElement(
    DoloresShell,
    { role, children: React.createElement('main', null, 'Page content') },
  ));
}

test('Moderator API-backed overview, tenant, contract, and notification routes are labeled as API data', () => {
  for (const pathname of [
    '/moderator',
    '/moderator/contracts',
    '/moderator/contracts/00000000-0000-4000-8000-000000000000',
    '/moderator/customers',
    '/moderator/customers/00000000-0000-4000-8000-000000000000',
    '/moderator/notifications',
    '/moderator/notifications/alerts',
    '/moderator/machines',
    '/moderator/machines/stock',
    '/moderator/machines/00000000-0000-4000-8000-000000000101',
    '/moderator/iot/machines',
    '/moderator/iot/customer',
    '/moderator/technical-requests',
    '/moderator/technical-requests/00000000-0000-4000-8000-000000000101',
    '/moderator/machine-history',
  ]) {
    const html = renderShell(pathname);
    assert.match(html, /Dolores • Dữ liệu API/, `Expected API label for ${pathname}`);
    assert.doesNotMatch(html, /Dolores • Dữ liệu minh họa/, `Expected no demo label for ${pathname}`);
  }
});

test('unintegrated Moderator routes and the Admin user screen keep their existing labels', () => {
  assert.match(renderShell('/moderator/invoices'), /Dolores • Dữ liệu minh họa/);
  assert.match(renderShell('/moderator/contracts/new'), /Dolores • Dữ liệu minh họa/);
  assert.match(renderShell('/moderator/contracts/expiry'), /Dolores • Dữ liệu minh họa/);
  assert.match(renderShell('/moderator/customers/new'), /Dolores • Dữ liệu minh họa/);
  assert.match(renderShell('/admin/users', 'admin'), /Dolores • Quản lý tài khoản/);
});
