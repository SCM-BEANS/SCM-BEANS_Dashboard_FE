const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const contracts = {
  'alerts.api.ts': {
    alertsApi: { list: 'Promise<Alert[]>' },
  },
  'billing.api.ts': {
    billingApi: {
      listInvoices: 'Promise<Invoice[]>',
      getInvoice: 'Promise<Invoice>',
      listPaymentProofs: 'Promise<PaymentProof[]>',
      downloadPaymentProofContent: 'Promise<Blob>',
    },
  },
  'buybacks.api.ts': {
    buybacksApi: { getById: 'Promise<BuybackCase>' },
  },
  'contracts.api.ts': {
    contractsApi: {
      listByTenant: 'Promise<Contract[]>',
      getById: 'Promise<Contract>',
      listByMachine: 'Promise<Contract[]>',
      getExpiryStatus: 'Promise<ContractExpiryStatus>',
      listDocuments: 'Promise<ContractDocument[]>',
      downloadDocument: 'Promise<Blob>',
    },
  },
  'dashboard.api.ts': {
    dashboardApi: { getOverview: 'Promise<DashboardOverview>' },
  },
  'installationWorkOrders.api.ts': {
    installationWorkOrdersApi: {
      listByTenant: 'Promise<InstallationWorkOrderSummary[]>',
      getById: 'Promise<InstallationWorkOrderDetails>',
    },
  },
  'locations.api.ts': {
    locationsApi: {
      listByTenant: 'Promise<StoreLocation[]>',
      getById: 'Promise<StoreLocation>',
    },
  },
  'machines.api.ts': {
    machinesApi: {
      list: 'Promise<MachineInventoryItem[]>',
      getById: 'Promise<MachineDetail>',
      getInventorySummary: 'Promise<InventorySummary>',
      listMaintenanceTickets: 'Promise<MaintenanceTicket[]>',
      getMaintenanceSchedule: 'Promise<MaintenanceSchedule>',
      getLatestHeartbeat: 'Promise<MachineHeartbeat>',
    },
  },
  'notifications.api.ts': {
    notificationsApi: {
      list: 'Promise<Notification[]>',
      unreadCount: 'Promise<NotificationUnreadCount>',
      markAsRead: 'Promise<Notification>',
    },
  },
  'recipes.api.ts': {
    recipesApi: {
      listGlobal: 'Promise<GlobalRecipe[]>',
      getGlobalById: 'Promise<GlobalRecipe>',
      publishGlobal: 'Promise<GlobalRecipe>',
    },
  },
  'telemetry.api.ts': {
    telemetryApi: { listMachinePoints: 'Promise<TelemetryPoint[]>' },
  },
  'tenants.api.ts': {
    tenantsApi: {
      list: 'Promise<Tenant[]>',
      get: 'Promise<Tenant>',
    },
  },
};

function apiMembers(sourceFile, apiName) {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const declaration = statement.declarationList.declarations.find(
      (item) => ts.isIdentifier(item.name) && item.name.text === apiName
    );
    if (declaration && declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer)) {
      return declaration.initializer.properties;
    }
  }
  assert.fail(`Could not find exported API object ${apiName}`);
}

function memberFunction(member) {
  if (ts.isPropertyAssignment(member) && ts.isArrowFunction(member.initializer)) return member.initializer;
  return undefined;
}

function assertDoloresCallsAreAwaited(body, sourceFile, apiName, methodName, expectedReturnType) {
  const calls = [];
  const parserCalls = [];

  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const owner = node.expression.expression;
      if (ts.isIdentifier(owner) && owner.text === 'doloresAxiosClient') {
        calls.push(node);
        const url = node.arguments[0];
        const urlText = url?.getText(sourceFile) ?? '';
        assert.match(
          urlText,
          /^['`][^'`]*\//,
          `${apiName}.${methodName} must use a relative Dolores path`
        );
        assert.doesNotMatch(urlText, /https?:\/\/|^['`]\/\//, `${apiName}.${methodName} must not use an absolute URL`);
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (node.expression.text === 'parseDoloresResponse') parserCalls.push(node);
      assert.ok(
        !['requestDolores', 'requestDoloresBlob'].includes(node.expression.text),
        `${apiName}.${methodName} must not use the legacy request helpers`
      );
    }

    if (
      ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && ts.isIdentifier(node.expression.expression)
      && node.expression.expression.text === 'doloresAxiosClient'
    ) {
      assert.ok(
        ts.isAwaitExpression(node.parent),
        `${apiName}.${methodName} must await doloresAxiosClient.${node.expression.name.text}`
      );
    }
    ts.forEachChild(node, visit);
  }

  visit(body);
  assert.equal(calls.length, 1, `${apiName}.${methodName} must make one direct Dolores Axios request`);
  if (expectedReturnType === 'Promise<Blob>') {
    const requestConfig = calls[0].arguments[1];
    const hasBlobResponse = requestConfig && ts.isObjectLiteralExpression(requestConfig)
      && requestConfig.properties.some((property) => ts.isPropertyAssignment(property)
        && property.name.getText(sourceFile) === 'responseType'
        && ts.isStringLiteral(property.initializer)
        && property.initializer.text === 'blob');
    assert.ok(hasBlobResponse, `${apiName}.${methodName} must request a Blob response`);
  } else {
    assert.ok(parserCalls.length > 0, `${apiName}.${methodName} must parse the response with its Zod schema`);
  }
}

test('all Dolores API methods declare their input and response types', () => {
  const apiDirectory = join(__dirname, '..', 'src', 'apis', 'dolores');

  for (const [fileName, apis] of Object.entries(contracts)) {
    const filePath = join(apiDirectory, fileName);
    const source = readFileSync(filePath, 'utf8');
    assert.doesNotMatch(
      source,
      /\brequestDolores(?:Blob)?\b/,
      `${fileName} must not depend on the removed request helpers`
    );
    const sourceFile = ts.createSourceFile(
      filePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    for (const [apiName, methods] of Object.entries(apis)) {
      const members = apiMembers(sourceFile, apiName);
      const actualMethodNames = members.map((member) => member.name?.getText(sourceFile)).filter(Boolean);
      assert.deepEqual(
        actualMethodNames.sort(),
        Object.keys(methods).sort(),
        `${apiName} public method list changed; update this contract deliberately`
      );

      for (const [methodName, expectedReturnType] of Object.entries(methods)) {
        const member = members.find((item) => item.name?.getText(sourceFile) === methodName);
        const fn = member && memberFunction(member);
        assert.ok(fn, `${apiName}.${methodName} must be an async arrow property`);
        assert.ok(
          fn.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword),
          `${apiName}.${methodName} must be async`
        );
        assert.ok(ts.isBlock(fn.body), `${apiName}.${methodName} must use a block body`);
        assert.equal(
          fn.type?.getText(sourceFile),
          expectedReturnType,
          `${apiName}.${methodName} must explicitly return ${expectedReturnType}`
        );
        for (const parameter of fn.parameters) {
          assert.ok(
            parameter.type,
            `${apiName}.${methodName} parameter ${parameter.name.getText(sourceFile)} needs an explicit type`
          );
        }
        assertDoloresCallsAreAwaited(fn.body, sourceFile, apiName, methodName, expectedReturnType);
      }
    }
  }
});
