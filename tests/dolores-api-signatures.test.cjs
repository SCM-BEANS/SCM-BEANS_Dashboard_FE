const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const contracts = {
  'profiles.api.ts': { profilesApi: ['list', 'getById', 'getHistory', 'getContracts'] },
  'locations.api.ts': { locationsApi: ['list', 'listPage', 'listByTenant', 'getById', 'create', 'assignMachine'] },
  'technician-assignments.api.ts': { technicianAssignmentsApi: ['assign', 'revoke'] },
  'contracts.api.ts': { contractsApi: ['create', 'list', 'listByOwner', 'getById', 'getModeratorById', 'getExpiry', 'getDocuments', 'activate', 'getMachineHistory', 'downloadDocument'] },
  'machines.api.ts': { machinesApi: ['create', 'list', 'listRentalCandidates', 'getById', 'markReady', 'getInventorySummary', 'getMaintenanceSchedule', 'listMaintenanceTickets', 'listMaintenanceTicketsPage', 'getMaintenanceTicketById', 'createMaintenanceTicket', 'updateMaintenanceTicketDetails', 'recordMaintenanceTicketOverdueReview', 'unassignMaintenanceTicket', 'assignMaintenanceTicket', 'updateMaintenanceTicketStatus', 'recordMaintenanceTicketParts', 'resolveMaintenanceTicket', 'createRepairIntake'] },
  'maintenance-requests.api.ts': { maintenanceRequestsApi: ['list', 'listPage', 'getById', 'confirm', 'recordOverdueReview', 'linkReplacementAssignment', 'recordCustodyEvent', 'recordClosureException', 'createWorkOrder', 'listByMachine', 'getCustodyEvents', 'reschedule', 'acknowledgeCustodyEvent'] },
  'telemetry.api.ts': { telemetryApi: ['getLatestHeartbeat', 'listMachinePoints'] },
  'notifications.api.ts': { notificationsApi: ['list', 'unreadCount', 'listAlerts', 'acknowledgeAlert', 'markAllAsRead', 'markAsRead'] },
  'recipes.api.ts': { recipesApi: ['listGlobalSummaries', 'listGlobal', 'getGlobalById', 'publishGlobal', 'listLocal', 'getLocalById', 'upsertLocal', 'deleteLocal', 'requestSync', 'getSyncStatus', 'getSyncHistory'] },
  'recipe-menus.api.ts': { recipeMenusApi: ['listGlobal', 'getGlobal', 'createGlobal', 'renameGlobal', 'deleteGlobal', 'listGlobalRecipes', 'assignGlobalRecipe', 'removeGlobalRecipe', 'listLocal', 'getLocal', 'createLocal', 'renameLocal', 'deleteLocal', 'listLocalRecipes', 'getLocalRecipe', 'createLocalRecipe', 'copyGlobalRecipe', 'moveLocalRecipe', 'editLocalRecipe', 'deleteLocalRecipe'] },
  'billing.api.ts': { billingApi: ['listInvoices', 'listInvoicesPage', 'listOperatorInvoicesPage', 'getInvoice', 'listInvoiceLineItems', 'listInvoiceLineItemsPage', 'listModeratorInvoices', 'getModeratorInvoice', 'listPaymentProofs', 'listPaymentProofsPage', 'submitPaymentProof', 'reviewPaymentProof', 'downloadPaymentProofContent'] },
  'buybacks.api.ts': { buybacksApi: ['list', 'getById', 'create', 'startInspection', 'submitInspection', 'decideValuation', 'createPayment', 'submitPaymentProof', 'reviewPaymentProof', 'downloadPaymentProofContent', 'requestCollection', 'confirmCollection', 'startRefurbishment', 'completeRefurbishment', 'decideQa', 'cancel', 'listInspections', 'listRefurbishments', 'listQaDecisions'] },
  'replacement-assignments.api.ts': { replacementAssignmentsApi: ['create', 'getById', 'activate', 'release', 'cancel'] },
  'installation-work-orders.api.ts': { installationWorkOrdersApi: ['create', 'listByOwner', 'listAssigned', 'getById', 'start', 'uploadEvidence', 'complete'] },
  'dashboard.api.ts': { dashboardApi: ['getOverview', 'getActionItems'] },
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
  const isCommandWithoutConsumedResponse =
    (apiName === 'contractsApi' && methodName === 'activate') ||
    (apiName === 'machinesApi' && ['markReady', 'assignMaintenanceTicket'].includes(methodName)) ||
    (apiName === 'notificationsApi' && methodName === 'markAllAsRead') ||
    (apiName === 'notificationsApi' && methodName === 'acknowledgeAlert') ||
    (apiName === 'recipesApi' && methodName === 'deleteLocal') ||
    (apiName === 'recipeMenusApi' && ['deleteGlobal', 'deleteLocal', 'deleteLocalRecipe'].includes(methodName)) ||
    (apiName === 'technicianAssignmentsApi' && methodName === 'revoke');
  if (isBlob) {
    assert.match(bodyText, /response\.data/, `${apiName}.${methodName} should return the requested file data`);
  } else if (!isCommandWithoutConsumedResponse) {
        assert.match(bodyText, /(?:\.parse|verify[A-Z]\w*)\(response\.data/, `${apiName}.${methodName} must validate its response schema or identity`);
  }
}

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

test('module 1 maintenance API mutations use the shared client and validate their responses', () => {
  const apiDirectory = join(__dirname, '..', 'src', 'apis');
  const expected = {
    'machines.api.ts': {
      machinesApi: ['createMaintenanceTicket', 'updateMaintenanceTicketDetails', 'recordMaintenanceTicketOverdueReview', 'unassignMaintenanceTicket'],
    },
    'maintenance-requests.api.ts': {
      maintenanceRequestsApi: ['recordOverdueReview', 'linkReplacementAssignment', 'recordCustodyEvent', 'recordClosureException'],
    },
  };

  for (const [fileName, apis] of Object.entries(expected)) {
    const filePath = join(apiDirectory, fileName);
    const source = readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    for (const [apiName, methodNames] of Object.entries(apis)) {
      const members = apiObject(sourceFile, apiName);
      for (const methodName of methodNames) {
        const member = members.find((item) => item.name?.getText(sourceFile) === methodName);
        const fn = member && memberFunction(member);
        assert.ok(fn, `${apiName}.${methodName} is exposed`);
        assert.ok(fn.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword), `${apiName}.${methodName} is async`);
        assertMethodUsesValidatedSharedHttp(fn, sourceFile, apiName, methodName);
      }
    }
  }
});
