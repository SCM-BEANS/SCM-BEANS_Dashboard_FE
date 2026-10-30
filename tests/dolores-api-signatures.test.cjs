const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const contracts = {
  'profiles.api.ts': { profilesApi: ['list', 'getById', 'getHistory', 'getContracts'] },
  'locations.api.ts': { locationsApi: ['list', 'listByTenant', 'getById', 'create', 'update', 'deactivate'] },
  'contracts.api.ts': { contractsApi: ['create', 'list', 'listByOwner', 'listByTenant', 'getById', 'getModeratorById', 'getExpiry', 'getDocuments', 'activate', 'amendPolicy', 'getPolicyHistory', 'continueContract', 'requestTermination', 'getMachineHistory', 'downloadDocument'] },
  'machines.api.ts': { machinesApi: ['create', 'list', 'listRentalCandidates', 'getById', 'update', 'delete', 'markReady', 'getInventorySummary', 'getMaintenanceSchedule', 'listMaintenanceTickets', 'createRepairIntake'] },
  'machine-models.api.ts': { machineModelsApi: ['create', 'assignMachineToModel', 'list', 'getById', 'update', 'deactivate'] },
  'telemetry.api.ts': { telemetryApi: ['getLatestHeartbeat', 'listMachinePoints'] },
  'notifications.api.ts': { notificationsApi: ['list', 'unreadCount', 'listAlerts', 'acknowledgeAlert', 'markAsRead', 'markAllAsRead'] },
  'recipes.api.ts': { recipesApi: ['listGlobal', 'getGlobalById', 'publishGlobal', 'updateGlobal', 'deleteGlobal', 'listLocal', 'getLocalById', 'upsertLocal', 'deleteLocal'] },
  'billing.api.ts': { billingApi: ['listInvoices', 'getInvoice', 'listInvoiceLineItems', 'listModeratorInvoices', 'getModeratorInvoice', 'listPaymentProofs', 'submitPaymentProof', 'downloadPaymentProofContent'] },
  'buybacks.api.ts': { buybacksApi: ['getById'] },
  'tenants.api.ts': { tenantsApi: ['list', 'getById'] },
  'installation-work-orders.api.ts': { installationWorkOrdersApi: ['create', 'listByTenant', 'listAssigned', 'getById', 'start', 'uploadEvidence', 'complete'] },
  'dashboard.api.ts': { dashboardApi: ['getOverview', 'getDailyMachineCupUsage'] },
};

function apiObject(sourceFile, apiName) {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const declaration = statement.declarationList.declarations.find(
      (item) => ts.isIdentifier(item.name) && item.name.text === apiName,
    );
    if (declaration && declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer)) {
      return declaration.initializer.properties;
    }
  }
  assert.fail(`Could not find exported API object ${apiName}`);
}

function memberFunction(member) {
  if (ts.isMethodDeclaration(member)) return member;
  if (ts.isPropertyAssignment(member) && (ts.isArrowFunction(member.initializer) || ts.isFunctionExpression(member.initializer))) {
    return member.initializer;
  }
  return undefined;
}

function assertMethodUsesValidatedSharedHttp(fn, sourceFile, apiName, methodName) {
  const requests = [];
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const expression = node.expression.expression;
      if (ts.isIdentifier(expression) && expression.text === 'axiosClient') {
        requests.push(node);
        assert.ok(ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]) || ts.isTemplateExpression(node.arguments[0]) || ts.isCallExpression(node.arguments[0]) || ts.isBinaryExpression(node.arguments[0]), `${apiName}.${methodName} must build a route path`);
        const route = node.arguments[0].getText(sourceFile);
        assert.doesNotMatch(route, /https?:\/\//i, `${apiName}.${methodName} must use an API-relative route`);
        assert.ok(ts.isAwaitExpression(node.parent), `${apiName}.${methodName} must await the shared HTTP request`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(fn.body);

  assert.equal(requests.length, 1, `${apiName}.${methodName} must make exactly one HTTP request`);
  const bodyText = fn.body.getText(sourceFile);
  const isBlob = bodyText.includes('responseType: "blob"');
  const isCommandWithoutConsumedResponse = (
    (apiName === 'contractsApi' && methodName === 'activate') ||
    (apiName === 'locationsApi' && methodName === 'deactivate') ||
    (apiName === 'machinesApi' && methodName === 'delete') ||
    (apiName === 'notificationsApi' && methodName === 'acknowledgeAlert') ||
    (apiName === 'notificationsApi' && methodName === 'markAllAsRead') ||
    (apiName === 'machinesApi' && methodName === 'markReady') ||
    (apiName === 'machineModelsApi' && methodName === 'assignMachineToModel') ||
    (apiName === 'recipesApi' && ['deleteGlobal', 'deleteLocal'].includes(methodName))
  );
  if (isBlob) {
    assert.ok(bodyText.includes('return response.data'), `${apiName}.${methodName} should return the requested file data`);
  } else if (!isCommandWithoutConsumedResponse) {
    assert.match(bodyText, /Schema\.parse\(response\.data\)/, `${apiName}.${methodName} must validate its response schema`);
  }
}

function loadSchema(relativePath, mocks = {}) {
  const filePath = join(__dirname, '..', relativePath);
  const source = readFileSync(filePath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: filePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  const mockedRequire = (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  new Function('require', 'exports', 'module', outputText)(mockedRequire, module.exports, module);
  return module.exports;
}

test('machine model list validates the summary contract while detail validates full fields', () => {
  const { z } = require('zod');
  const machineTypes = { MachineTypeSchema: z.enum(['CONVENTIONAL', 'SMART_IOT']) };
  const schemas = loadSchema('src/schema/machine-models.schema.ts', { './machines.schema': machineTypes });
  const modelId = '00000000-0000-4000-8000-000000000001';
  const summary = {
    id: modelId, modelCode: 'M-01', manufacturer: 'Dolores', displayName: 'Model 1',
    machineType: 'CONVENTIONAL', active: true,
  };
  assert.deepEqual(schemas.MachineModelListSchema.parse([summary]), [summary]);
  assert.equal(schemas.MachineModelSchema.safeParse(summary).success, false);
});

test('domain API modules expose typed methods over the shared client with parsed responses', () => {
  const apiDirectory = join(__dirname, '..', 'src', 'apis');
  for (const [fileName, apis] of Object.entries(contracts)) {
    const filePath = join(apiDirectory, fileName);
    const source = readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    assert.match(source, /from "@\/lib\/http"/, `${fileName} must use the shared HTTP module`);
    assert.doesNotMatch(source, /https?:\/\//i, `${fileName} must not embed a backend origin`);

    for (const [apiName, expectedMethods] of Object.entries(apis)) {
      const members = apiObject(sourceFile, apiName);
      const actualMethodNames = members.map((member) => member.name?.getText(sourceFile)).filter(Boolean);
      assert.deepEqual(actualMethodNames.sort(), [...expectedMethods].sort(), `${apiName} public methods changed`);

      for (const methodName of expectedMethods) {
        const member = members.find((item) => item.name?.getText(sourceFile) === methodName);
        const fn = member && memberFunction(member);
        assert.ok(fn, `${apiName}.${methodName} must be a method or function property`);
        assert.ok(fn.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword), `${apiName}.${methodName} must be async`);
        for (const parameter of fn.parameters) {
          assert.ok(parameter.type || parameter.initializer, `${apiName}.${methodName} parameter ${parameter.name.getText(sourceFile)} must have a type or inferable default`);
        }
        assertMethodUsesValidatedSharedHttp(fn, sourceFile, apiName, methodName);
      }
    }
  }
});
